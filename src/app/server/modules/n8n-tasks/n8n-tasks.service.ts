/** biome-ignore-all lint/complexity/noStaticOnlyClass: <project> */
import type { Prisma } from "../../../../generated/prisma";
import { AppSettingsService } from "../app-settings/app-settings.service";
import type { CompanyLevelReportsOrchestratorSettings } from "../app-settings/app-settings.service";
import { N8NService } from "../n8n/n8n.service";
import { type N8NTaskStatus, N8NTasksRepository } from "./n8n-tasks.repository";

const COMPANY_LEVEL_REPORT_FLOW_NAME = "company-level-report";
const EXECUTION_STATUS_SYNC_COOLDOWN_MS = 30_000;

type ProcessingTask = Awaited<
	ReturnType<typeof N8NTasksRepository.findProcessing>
>[number];

type PendingTask = Awaited<
	ReturnType<typeof N8NTasksRepository.findPending>
>[number];

type ExecutionStatusResponse = {
	status?: unknown;
};

export class N8NTasksService {
	static async list(reportId?: number) {
		await N8NTasksService.runCycle(reportId);
		return N8NTasksRepository.findAll(reportId);
	}

	static async runCycle(reportId?: number) {
		await N8NTasksService.syncProcessingTasks(reportId);
		await N8NTasksService.runAutoGenCycle(reportId);
	}

	static async createCompanyLevelReport(params: {
		reportId: number;
		targetCompany: number;
		competitors: number[];
		id: number;
	}) {
		const metadata: Prisma.InputJsonValue = {
			report_id: params.reportId,
			competitors: params.competitors,
			id: params.id,
			target_company: params.targetCompany,
		};

		return N8NTasksRepository.create({
			workFlowId: `company-level-report-${params.reportId}`,
			workFlowName: COMPANY_LEVEL_REPORT_FLOW_NAME,
			workFlowUrl: "",
			metadata,
			reportId: params.reportId,
		});
	}

	static async start(id: number) {
		const task = await N8NTasksRepository.findById(id);
		if (!task) throw new Error(`Task ${id} not found`);
		if (task.status === "PROCESSING")
			throw new Error("Task is already running");

		const settings = await AppSettingsService.getClrOrchestrator();
		const instanceIndex =
			await N8NTasksService.selectLeastLoadedInstance(settings);

		await N8NTasksService.startOnInstance(task, instanceIndex, settings);
		return { instanceIndex };
	}

	static async stop(id: number) {
		const task = await N8NTasksRepository.findById(id);
		if (!task) throw new Error(`Task ${id} not found`);

		if (task.execution_id) {
			const instanceType = N8NService.getTypeByInstanceIndex(
				task.instance_index,
			);
			await N8NService.stopExecution(task.execution_id, instanceType);
		}

		await N8NTasksRepository.updateSyncState(id, {
			status: "ERROR",
			lastSeenExecutionStatus: "canceled",
			lastCheckedAt: new Date(),
		});
	}

	static async delete(id: number) {
		const task = await N8NTasksRepository.findById(id);
		if (!task) throw new Error(`Task ${id} not found`);
		await N8NTasksRepository.delete(id);
	}

	static async updateStatus(
		id: number,
		status: "PENDING" | "PROCESSING" | "DONE" | "ERROR",
	) {
		if (status === "PENDING") {
			return N8NTasksRepository.updateSyncState(id, {
				status,
				executionId: null,
				instanceIndex: null,
				lastSeenExecutionStatus: null,
				lastCheckedAt: null,
			});
		}
		return N8NTasksRepository.updateStatus(id, status);
	}

	private static async startOnInstance(
		task: PendingTask,
		instanceIndex: number,
		settings: CompanyLevelReportsOrchestratorSettings,
	): Promise<void> {
		const instance = settings.instances[instanceIndex];
		const instanceConfig = N8NService.getConfigByInstanceIndex(instanceIndex);
		const webhookUrl = `${instanceConfig.url}/webhook/${instance.webhook}`;

		await N8NTasksRepository.updateSyncState(task.id, {
			status: "PROCESSING",
			instanceIndex,
			lastSeenExecutionStatus: null,
			lastCheckedAt: null,
		});

		try {
			const body = (task.metadata ?? {}) as Record<string, unknown>;
			const response = await N8NService.fetchWithTimeoutPublic(
				webhookUrl,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-N8N-API-KEY": instanceConfig.apiKey,
					},
					body: JSON.stringify(body),
				},
				30000,
			);

			if (!response.ok) {
				await N8NTasksRepository.updateStatus(task.id, "ERROR");
				throw new Error(`N8N request failed with status ${response.status}`);
			}

			const result = (await response.json()) as Record<string, unknown>;
			const executionId = result.executionId
				? String(result.executionId)
				: null;

			await N8NTasksRepository.updateSyncState(task.id, { executionId });
		} catch (error) {
			await N8NTasksRepository.updateStatus(task.id, "ERROR");
			throw error;
		}
	}

	private static async selectLeastLoadedInstance(
		settings: CompanyLevelReportsOrchestratorSettings,
	): Promise<number> {
		const enabled = settings.instances
			.map((inst, idx) => ({ ...inst, idx }))
			.filter((inst) => inst.enabled && inst.webhook);

		if (enabled.length === 0) {
			throw new Error("No enabled instances configured");
		}

		const loads = await Promise.all(
			enabled.map(async (inst) => ({
				idx: inst.idx,
				concurrency: inst.concurrency,
				load: await N8NTasksRepository.countProcessingByInstance(inst.idx),
			})),
		);

		const available = loads.filter((l) => l.load < l.concurrency);
		if (available.length === 0) {
			throw new Error("All instances are at full capacity");
		}

		return available.sort((a, b) => a.load - b.load)[0].idx;
	}

	private static async runAutoGenCycle(reportId?: number): Promise<void> {
		const settings = await AppSettingsService.getClrOrchestrator();
		if (!settings.autoGenEnabled) return;

		const pending = await N8NTasksRepository.findPending(reportId);
		console.log(
			`[AutoGen] pending=${pending.length} reportId=${reportId ?? "all"}`,
		);
		if (pending.length === 0) return;

		const queue = [...pending];

		for (const [idx, instance] of settings.instances.entries()) {
			if (!instance.enabled || !instance.webhook) {
				console.log(
					`[AutoGen] instance[${idx}] skipped: enabled=${instance.enabled} webhook=${!!instance.webhook}`,
				);
				continue;
			}
			if (queue.length === 0) break;

			const processing = await N8NTasksRepository.countProcessingByInstance(
				idx,
				reportId,
			);
			const slots = instance.concurrency - processing;
			console.log(
				`[AutoGen] instance[${idx}] processing=${processing} concurrency=${instance.concurrency} slots=${slots}`,
			);
			if (slots <= 0) continue;

			const batch = queue.splice(0, slots);
			const results = await Promise.allSettled(
				batch.map((task) =>
					N8NTasksService.startOnInstance(task, idx, settings),
				),
			);
			results.forEach((r, i) => {
				if (r.status === "rejected") {
					console.error(
						`[AutoGen] instance[${idx}] task ${batch[i].id} failed:`,
						r.reason,
					);
				}
			});
		}
	}

	private static async syncProcessingTasks(reportId?: number) {
		const tasks = await N8NTasksRepository.findProcessing(reportId);
		const now = Date.now();
		const eligible = tasks.filter((task) =>
			N8NTasksService.shouldSyncTask(task, now),
		);
		if (eligible.length === 0) return;

		await Promise.allSettled(
			eligible.map((task) => N8NTasksService.syncTaskExecutionState(task)),
		);
	}

	private static shouldSyncTask(task: ProcessingTask, now: number) {
		if (!task.last_checked_at) return true;
		return (
			now - task.last_checked_at.getTime() >= EXECUTION_STATUS_SYNC_COOLDOWN_MS
		);
	}

	private static async syncTaskExecutionState(task: ProcessingTask) {
		const lastCheckedAt = new Date();
		const instanceType = N8NService.getTypeByInstanceIndex(task.instance_index);

		try {
			const execution = (await N8NService.getExecutionDetails(
				task.execution_id as string,
				instanceType,
			)) as ExecutionStatusResponse;

			const rawStatus = N8NTasksService.extractExecutionStatus(execution);
			const nextStatus = N8NTasksService.mapExecutionStatus(rawStatus);
			console.log(
				`Synced n8n task ${task.id} execution ${task.execution_id}:`,
				"rawStatus:",
				rawStatus,
				"mappedStatus:",
				nextStatus,
			);

			await N8NTasksRepository.updateSyncState(task.id, {
				lastSeenExecutionStatus: rawStatus,
				lastCheckedAt,
				...(nextStatus ? { status: nextStatus } : {}),
			});
		} catch (error) {
			console.error(
				`Failed to sync n8n task ${task.id} execution ${task.execution_id}:`,
				error,
			);
			await N8NTasksRepository.updateSyncState(task.id, { lastCheckedAt });
		}
	}

	private static extractExecutionStatus(execution: ExecutionStatusResponse) {
		return typeof execution.status === "string"
			? execution.status.toLowerCase()
			: null;
	}

	private static mapExecutionStatus(
		rawStatus: string | null,
	): N8NTaskStatus | null {
		switch (rawStatus) {
			case "completed":
			case "success":
				return "DONE";
			case "failed":
			case "error":
			case "crashed":
			case "canceled":
				return "ERROR";
			default:
				return null;
		}
	}
}
