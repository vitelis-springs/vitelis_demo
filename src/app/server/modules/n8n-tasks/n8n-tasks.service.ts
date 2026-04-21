/** biome-ignore-all lint/complexity/noStaticOnlyClass: <project> */
import type { Prisma } from "../../../../generated/prisma";
import { N8NService } from "../n8n/n8n.service";
import { type N8NTaskStatus, N8NTasksRepository } from "./n8n-tasks.repository";

const COMPANY_LEVEL_REPORT_FLOW_NAME = "company-level-report";
const COMPANY_LEVEL_REPORT_FLOW_URL =
	"https://vitelis2025.app.n8n.cloud/webhook/alix-company-level-report/with-yaml";
const EXECUTION_STATUS_SYNC_COOLDOWN_MS = 30_000;

type ExecutionStatusResponse = {
	status?: unknown;
};

type ProcessingTask = Awaited<
	ReturnType<typeof N8NTasksRepository.findProcessing>
>[number];

export class N8NTasksService {
	static async list(reportId?: number) {
		await N8NTasksService.syncProcessingTasks(reportId);
		return N8NTasksRepository.findAll(reportId);
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
			workFlowUrl: COMPANY_LEVEL_REPORT_FLOW_URL,
			metadata,
			reportId: params.reportId,
		});
	}

	static async start(id: number) {
		const task = await N8NTasksRepository.findById(id);
		if (!task) throw new Error(`Task ${id} not found`);
		if (task.status === "PROCESSING")
			throw new Error("Task is already running");

		const body = (task.metadata ?? {}) as Record<string, unknown>;
		const config = N8NService.getPublicBizMinerConfig();

		const response = await N8NService.fetchWithTimeoutPublic(
			task.work_flow_url,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-N8N-API-KEY": config.apiKey,
				},
				body: JSON.stringify(body),
			},
			30000,
		);

		if (!response.ok) {
			console.error(
				`Failed to start n8n task ${id}. Response status: ${response.status}`,
				response,
			);
			await N8NTasksRepository.updateStatus(id, "ERROR");
			throw new Error(`N8N request failed with status ${response.status}`);
		}

		const result = (await response.json()) as Record<string, unknown>;
		const executionId = result.executionId ? String(result.executionId) : null;

		await N8NTasksRepository.updateSyncState(id, {
			status: "PROCESSING",
			executionId,
			lastSeenExecutionStatus: null,
			lastCheckedAt: null,
		});
		return { executionId };
	}

	static async stop(id: number) {
		const task = await N8NTasksRepository.findById(id);
		if (!task) throw new Error(`Task ${id} not found`);

		if (task.execution_id) {
			await N8NService.stopExecution(task.execution_id, "bizminer");
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
		return N8NTasksRepository.updateStatus(id, status);
	}

	private static async syncProcessingTasks(reportId?: number) {
		const tasks = await N8NTasksRepository.findProcessing(reportId);
		const now = Date.now();
		const eligibleTasks = tasks.filter((task) =>
			N8NTasksService.shouldSyncTask(task, now),
		);

		if (eligibleTasks.length === 0) {
			return;
		}

		await Promise.allSettled(
			eligibleTasks.map((task) => N8NTasksService.syncTaskExecutionState(task)),
		);
	}

	private static shouldSyncTask(task: ProcessingTask, now: number) {
		if (!task.last_checked_at) {
			return true;
		}

		return (
			now - task.last_checked_at.getTime() >= EXECUTION_STATUS_SYNC_COOLDOWN_MS
		);
	}

	private static async syncTaskExecutionState(task: ProcessingTask) {
		const lastCheckedAt = new Date();

		try {
			const execution = (await N8NService.getExecutionDetails(
				task.execution_id as string,
				"bizminer",
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

			await N8NTasksRepository.updateSyncState(task.id, {
				lastCheckedAt,
			});
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
