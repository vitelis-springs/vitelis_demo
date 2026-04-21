/** biome-ignore-all lint/complexity/noStaticOnlyClass: <project> */
import type { Prisma } from "../../../../generated/prisma";
import { N8NService } from "../n8n/n8n.service";
import { N8NTasksRepository } from "./n8n-tasks.repository";

const COMPANY_LEVEL_REPORT_FLOW_NAME = "company-level-report";
const COMPANY_LEVEL_REPORT_FLOW_URL =
	"https://vitelis2025.app.n8n.cloud/webhook-test/alix-company-level-report/with-yaml";

export class N8NTasksService {
	static async list(reportId?: number) {
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
			await N8NTasksRepository.updateStatus(id, "ERROR");
			throw new Error(`N8N request failed with status ${response.status}`);
		}

		const result = (await response.json()) as Record<string, unknown>;
		const executionId = result.executionId ? String(result.executionId) : null;

		await N8NTasksRepository.updateStatus(id, "PROCESSING", executionId);
		return { executionId };
	}

	static async stop(id: number) {
		const task = await N8NTasksRepository.findById(id);
		if (!task) throw new Error(`Task ${id} not found`);

		if (task.execution_id) {
			await N8NService.stopExecution(task.execution_id, "bizminer");
		}

		await N8NTasksRepository.updateStatus(id, "ERROR");
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
}
