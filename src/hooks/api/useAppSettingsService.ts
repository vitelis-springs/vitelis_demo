import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";
import type { CompanyLevelReportsOrchestratorSettings } from "../../app/server/modules/app-settings";

const CLR_ORCHESTRATOR_URL = "/app-settings/orchestrator/company-level-reports";

const appSettingsApi = {
	async getClrOrchestrator(): Promise<{
		success: boolean;
		data: CompanyLevelReportsOrchestratorSettings;
	}> {
		const response = await api.get(CLR_ORCHESTRATOR_URL);
		return response.data;
	},

	async updateClrOrchestrator(
		settings: CompanyLevelReportsOrchestratorSettings,
	): Promise<{
		success: boolean;
		data: CompanyLevelReportsOrchestratorSettings;
	}> {
		const response = await api.put(CLR_ORCHESTRATOR_URL, settings);
		return response.data;
	},
};

export const CLR_ORCHESTRATOR_QUERY_KEY = [
	"app-settings",
	"orchestrator",
	"company-level-reports",
];

export const useGetClrOrchestratorSettings = () => {
	return useQuery({
		queryKey: CLR_ORCHESTRATOR_QUERY_KEY,
		queryFn: () => appSettingsApi.getClrOrchestrator(),
		staleTime: 60_000,
		refetchOnWindowFocus: false,
	});
};

export const useUpdateClrOrchestratorSettings = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (settings: CompanyLevelReportsOrchestratorSettings) =>
			appSettingsApi.updateClrOrchestrator(settings),
		onSuccess: (response) => {
			queryClient.setQueryData(CLR_ORCHESTRATOR_QUERY_KEY, response);
		},
	});
};
