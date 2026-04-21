/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explaфіnation> */
import { Prisma } from "../../../../generated/prisma";
import { prisma } from "../../../../lib/prisma";

export type N8NTaskStatus = "PENDING" | "PROCESSING" | "DONE" | "ERROR";

export interface N8NTaskCreateData {
	workFlowId: string;
	workFlowName: string;
	workFlowUrl: string;
	metadata?: Prisma.InputJsonValue | null;
	reportId?: number | null;
}

export class N8NTasksRepository {
	static async findAll(reportId?: number) {
		return prisma.n8n_tasks.findMany({
			where: reportId !== undefined ? { report_id: reportId } : undefined,
			orderBy: { created_at: "desc" },
		});
	}

	static async findById(id: number) {
		return prisma.n8n_tasks.findUnique({ where: { id } });
	}

	static async create(data: N8NTaskCreateData) {
		return prisma.n8n_tasks.create({
			data: {
				work_flow_id: data.workFlowId,
				work_flow_name: data.workFlowName,
				work_flow_url: data.workFlowUrl,
				metadata: data.metadata ?? Prisma.JsonNull,
				report_id: data.reportId ?? null,
			},
		});
	}

	static async updateStatus(
		id: number,
		status: N8NTaskStatus,
		executionId?: string | null,
	) {
		return prisma.n8n_tasks.update({
			where: { id },
			data: {
				status,
				...(executionId !== undefined ? { execution_id: executionId } : {}),
				updated_at: new Date(),
			},
		});
	}

	static async delete(id: number) {
		return prisma.n8n_tasks.delete({ where: { id } });
	}
}
