import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";

export type N8NTaskStatus = "PENDING" | "PROCESSING" | "DONE" | "ERROR";

export interface N8NTask {
	id: number;
	work_flow_id: string;
	work_flow_name: string;
	work_flow_url: string;
	status: N8NTaskStatus;
	execution_id: string | null;
	last_seen_execution_status: string | null;
	last_checked_at: string | null;
	metadata: Record<string, unknown> | null;
	report_id: number | null;
	created_at: string | null;
	updated_at: string | null;
}

export interface CreateN8NTaskPayload {
	reportId: number;
	targetCompany: number;
	competitors: number[];
	id?: number;
}

const n8nTasksApi = {
	async list(
		reportId?: number,
	): Promise<{ success: boolean; data: N8NTask[] }> {
		const suffix = reportId !== undefined ? `?reportId=${reportId}` : "";
		const response = await api.get(`/n8n-tasks${suffix}`);
		return response.data;
	},

	async create(
		payload: CreateN8NTaskPayload,
	): Promise<{ success: boolean; data: N8NTask }> {
		const response = await api.post("/n8n-tasks", payload);
		return response.data;
	},

	async start(
		id: number,
	): Promise<{ success: boolean; data: { executionId: string | null } }> {
		const response = await api.post(`/n8n-tasks/${id}/start`, {});
		return response.data;
	},

	async stop(id: number): Promise<{ success: boolean }> {
		const response = await api.post(`/n8n-tasks/${id}/stop`, {});
		return response.data;
	},

	async delete(id: number): Promise<{ success: boolean }> {
		const response = await api.delete(`/n8n-tasks/${id}`);
		return response.data;
	},
};

export const useGetN8NTasks = (
	reportId?: number,
	options?: { enabled?: boolean },
) => {
	return useQuery({
		queryKey: ["n8n-tasks", reportId ?? "all"],
		queryFn: () => n8nTasksApi.list(reportId),
		enabled: options?.enabled ?? true,
		refetchInterval: (query) => {
			const tasks = query.state.data?.data ?? [];
			return tasks.some((task) => task.status === "PROCESSING")
				? 5_000
				: 30_000;
		},
	});
};

export const useCreateN8NTask = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (payload: CreateN8NTaskPayload) => n8nTasksApi.create(payload),
		onSuccess: (_, variables) => {
			queryClient
				.invalidateQueries({
					queryKey: ["n8n-tasks", variables.reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useStartN8NTask = (reportId?: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => n8nTasksApi.start(id),
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["n8n-tasks", reportId ?? "all"],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useStopN8NTask = (reportId?: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => n8nTasksApi.stop(id),
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["n8n-tasks", reportId ?? "all"],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useDeleteN8NTask = (reportId?: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => n8nTasksApi.delete(id),
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["n8n-tasks", reportId ?? "all"],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export default n8nTasksApi;
