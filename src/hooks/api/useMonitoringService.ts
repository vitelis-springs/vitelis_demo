import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MonitoringSettings } from "../../app/server/modules/app-settings";
import type { MonitorRunsResult } from "../../app/server/modules/monitoring";
import { api } from "../../lib/api-client";

export type { MonitoringSettings } from "../../app/server/modules/app-settings";
export type {
	MonitorCompanyRow,
	MonitorReportRow,
	MonitorRunCounts,
	MonitorRunStatus,
	MonitorRunsResult,
	MonitorStepRow,
	MonitorStepStatus,
	MonitorSummary,
	MonitorSummaryBucket,
} from "../../app/server/modules/monitoring";

/** Every read is a plain database query, so refreshing often is cheap. */
export const DEFAULT_MONITORING_REFETCH_MS = 15_000;

export const MONITORING_RUNS_QUERY_KEY = ["monitoring", "runs"];
export const MONITORING_SETTINGS_QUERY_KEY = ["monitoring", "settings"];

const monitoringApi = {
	async runs(): Promise<{ success: boolean; data: MonitorRunsResult }> {
		const response = await api.get("/monitoring/runs");
		return response.data;
	},

	async getSettings(): Promise<{ success: boolean; data: MonitoringSettings }> {
		const response = await api.get("/monitoring/settings");
		return response.data;
	},

	async updateSettings(
		settings: MonitoringSettings,
	): Promise<{ success: boolean; data: MonitoringSettings }> {
		const response = await api.put("/monitoring/settings", settings);
		return response.data;
	},
};

export const useMonitoringRuns = (options?: {
	refetchInterval?: number | false;
}) => {
	return useQuery({
		queryKey: MONITORING_RUNS_QUERY_KEY,
		queryFn: () => monitoringApi.runs(),
		refetchInterval: options?.refetchInterval ?? DEFAULT_MONITORING_REFETCH_MS,
	});
};

export const useMonitoringSettings = () => {
	return useQuery({
		queryKey: MONITORING_SETTINGS_QUERY_KEY,
		queryFn: () => monitoringApi.getSettings(),
		staleTime: 60_000,
		refetchOnWindowFocus: false,
	});
};

export const useUpdateMonitoringSettings = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (settings: MonitoringSettings) =>
			monitoringApi.updateSettings(settings),
		onSuccess: (response) => {
			queryClient.setQueryData(MONITORING_SETTINGS_QUERY_KEY, response);
			void queryClient.invalidateQueries({
				queryKey: MONITORING_RUNS_QUERY_KEY,
			});
		},
	});
};

export default monitoringApi;
