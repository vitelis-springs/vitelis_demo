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

export interface N8NTaskSyncStateUpdate {
	status?: N8NTaskStatus;
	executionId?: string | null;
	lastSeenExecutionStatus?: string | null;
	lastCheckedAt?: Date | null;
	instanceIndex?: number | null;
}

export class N8NTasksRepository {
	static async findAll(reportId?: number) {
		return prisma.n8n_tasks.findMany({
			where: reportId !== undefined ? { report_id: reportId } : undefined,
			orderBy: { created_at: "desc" },
		});
	}

	static async findProcessing(reportId?: number) {
		return prisma.n8n_tasks.findMany({
			where: {
				status: "PROCESSING",
				execution_id: { not: null },
				...(reportId !== undefined ? { report_id: reportId } : {}),
			},
			orderBy: { created_at: "desc" },
		});
	}

	static async findPending(reportId?: number) {
		return prisma.n8n_tasks.findMany({
			where: {
				status: "PENDING",
				...(reportId !== undefined ? { report_id: reportId } : {}),
			},
			orderBy: { created_at: "asc" },
		});
	}

	static async countProcessingByInstance(
		instanceIndex: number,
		reportId?: number,
	): Promise<number> {
		return prisma.n8n_tasks.count({
			where: {
				status: "PROCESSING",
				instance_index: instanceIndex,
				...(reportId !== undefined ? { report_id: reportId } : {}),
			},
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
		return N8NTasksRepository.updateSyncState(id, {
			status,
			...(executionId !== undefined ? { executionId } : {}),
		});
	}

	static async updateSyncState(id: number, data: N8NTaskSyncStateUpdate) {
		return prisma.n8n_tasks.update({
			where: { id },
			data: {
				...(data.status !== undefined ? { status: data.status } : {}),
				...(data.executionId !== undefined
					? { execution_id: data.executionId }
					: {}),
				...(data.lastSeenExecutionStatus !== undefined
					? { last_seen_execution_status: data.lastSeenExecutionStatus }
					: {}),
				...(data.lastCheckedAt !== undefined
					? { last_checked_at: data.lastCheckedAt }
					: {}),
				...(data.instanceIndex !== undefined
					? { instance_index: data.instanceIndex }
					: {}),
				updated_at: new Date(),
			},
		});
	}

	static async delete(id: number) {
		return prisma.n8n_tasks.delete({ where: { id } });
	}
}
