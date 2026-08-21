import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";
import { isControllerChanged } from "../../lib/orchestrator/engine-error-message";
import type {
	SmEngineController,
	SmEngineExecutionState,
	SmEngineRun,
	SmEngineStartAction,
} from "../../types/sm-engine.types";

// ===== Types =====

export type StepStatus = "PENDING" | "PROCESSING" | "DONE" | "ERROR";
export type StepDependency = "rdp" | "kpi" | "category" | "url" | null;

export type StepReportType = "biz_miner" | "sales_miner" | null;

export interface GenerationStep {
	id: number;
	name: string;
	url: string;
	dependency: StepDependency;
	settings: unknown;
	reportType: StepReportType;
}

export interface ConfiguredStep extends GenerationStep {
	order: number;
}

export interface ReportStepsResponse {
	success: boolean;
	data: {
		configured: ConfiguredStep[];
		available: GenerationStep[];
	};
}

export interface ReportStepRun {
	stepId: number;
	order: number;
	name: string;
	workflowId: string | null;
	workflowUrl: string | null;
	status: StepStatus | null;
	running: boolean;
	startTime: string | null;
	endTime: string | null;
	execId: string | null;
	executionUrl: string | null;
}

export interface ReportStepRunsResponse {
	success: boolean;
	data: ReportStepRun[];
}

/**
 * Bulk status payload: sparse (explicit cells) or rectangular (the product of
 * companies × steps). Both apply atomically in a single request.
 */
export type BulkStatusPayload = { status: StepStatus } & (
	| { cells: Array<{ company_id: number; step_id: number }> }
	| { company_ids: number[]; step_ids: number[] }
);

export interface StepsMatrixCompany {
	id: number;
	name: string;
}

export interface StepsMatrixStep {
	id: number;
	name: string;
	order: number;
	url: string;
	dependency: StepDependency;
	settings: unknown;
}

export interface StepsMatrixRow {
	companyId: number;
	statuses: Array<{
		stepId: number;
		status: StepStatus;
	}>;
}

export interface StepsMatrixTiming {
	/** Wall-clock from first start to last end (or now if running); includes pauses. */
	elapsedSeconds: number | null;
	/** Union of run intervals (overlaps merged) — active time, no double-counting. */
	activeSeconds: number | null;
	running: boolean;
}

export interface StepsMatrixResponse {
	success: boolean;
	data: {
		companies: StepsMatrixCompany[];
		steps: StepsMatrixStep[];
		matrix: StepsMatrixRow[];
		timing: StepsMatrixTiming;
	};
}

export interface CompanyStepStatus {
	stepId: number;
	stepName: string;
	status: StepStatus | null;
	workflowId: string | null;
	workflowUrl: string | null;
	execId: string | null;
	executionUrl: string | null;
	startTime: string | null;
	endTime: string | null;
}

export interface CompanyStepStatusesResponse {
	success: boolean;
	data: CompanyStepStatus[];
}

export interface OrchestratorStatusResponse {
	success: boolean;
	data: {
		reportId: number;
		status: StepStatus;
		metadata: unknown;
	};
}

export interface EnsureOrchestratorResponse {
	success: boolean;
	data: {
		created: boolean;
		reportId: number;
		status: StepStatus;
		metadata: unknown;
	};
}

// ===== SM Engine run control =====

// Re-exported under the names the components already use; the shapes
// themselves live beside the server client, so the browser and the engine
// cannot end up describing a run differently.
export type OrchestratorController = SmEngineController;
export type EngineExecutionState = SmEngineExecutionState;
export type EngineRun = SmEngineRun;
export type EngineStartAction = SmEngineStartAction;

export interface OrchestratorControllerResponse {
	success: boolean;
	data: { controller: OrchestratorController };
}

/** `run` is the report's latest run, and null only when it has never had one. */
export interface EngineRunResponse {
	success: boolean;
	data: { run: EngineRun | null };
}

/** `action` is present on start only — pause has just the one outcome. */
export interface EngineRunActionResponse {
	success: boolean;
	data: { run: EngineRun; action?: EngineStartAction };
}

export interface StepPresetSummary {
	id: string;
	code: string;
	name: string;
	description: string | null;
	isActive: boolean;
	stepCount: number;
	updatedAt: string | null;
}

export interface StepPresetStep {
	stepId: number;
	order: number;
	name: string;
	isActive: boolean;
}

export interface StepPresetDetail {
	id: string;
	code: string;
	name: string;
	description: string | null;
	isActive: boolean;
	steps: StepPresetStep[];
}

// ===== API Functions =====

const reportStepsApi = {
	async getGenerationSteps(): Promise<{
		success: boolean;
		data: GenerationStep[];
	}> {
		const response = await api.get("/generation-steps");
		return response.data;
	},

	async getReportSteps(reportId: number): Promise<ReportStepsResponse> {
		const response = await api.get(`/deep-dive/${reportId}/steps`);
		return response.data;
	},

	async addStepToReport(
		reportId: number,
		stepId: number,
	): Promise<{
		success: boolean;
		data?: { id: number; name: string; order: number };
		error?: string;
	}> {
		const response = await api.post(`/deep-dive/${reportId}/steps`, {
			step_id: stepId,
		});
		return response.data;
	},

	async removeStepFromReport(
		reportId: number,
		stepId: number,
	): Promise<{ success: boolean; error?: string }> {
		const response = await api.delete(`/deep-dive/${reportId}/steps/${stepId}`);
		return response.data;
	},

	async reorderSteps(
		reportId: number,
		orderedStepIds: number[],
	): Promise<{ success: boolean }> {
		const response = await api.patch(`/deep-dive/${reportId}/steps`, {
			ordered_step_ids: orderedStepIds,
		});
		return response.data;
	},

	async updateStepOrder(
		reportId: number,
		stepId: number,
		order: number,
	): Promise<{ success: boolean }> {
		const response = await api.patch(`/deep-dive/${reportId}/steps`, {
			step_id: stepId,
			order,
		});
		return response.data;
	},

	async getStepsMatrix(reportId: number): Promise<StepsMatrixResponse> {
		const response = await api.get(`/deep-dive/${reportId}/steps-matrix`);
		return response.data;
	},

	async getReportStepRuns(reportId: number): Promise<ReportStepRunsResponse> {
		const response = await api.get(`/deep-dive/${reportId}/step-runs`);
		return response.data;
	},

	async getCompanyStepStatuses(
		reportId: number,
		companyId: number,
	): Promise<CompanyStepStatusesResponse> {
		const response = await api.get(
			`/deep-dive/${reportId}/companies/${companyId}/steps`,
		);
		return response.data;
	},

	async updateStepStatus(
		reportId: number,
		companyId: number,
		stepId: number,
		status: StepStatus,
	): Promise<{ success: boolean }> {
		const response = await api.patch(
			`/deep-dive/${reportId}/companies/${companyId}/steps`,
			{ step_id: stepId, status },
		);
		return response.data;
	},

	async bulkUpdateStepStatuses(
		reportId: number,
		companyId: number,
		updates: Array<{ step_id: number; status: StepStatus }>,
	): Promise<{ success: boolean }> {
		const response = await api.patch(
			`/deep-dive/${reportId}/companies/${companyId}/steps`,
			{ updates },
		);
		return response.data;
	},

	async bulkUpdateReportStepStatuses(
		reportId: number,
		payload: BulkStatusPayload,
	): Promise<{
		success: boolean;
		data?: { updated: number };
		error?: string;
	}> {
		const response = await api.patch(
			`/deep-dive/${reportId}/steps-statuses`,
			payload,
		);
		return response.data;
	},

	async listStepPresets(
		includeInactive = false,
	): Promise<{ data: StepPresetSummary[] }> {
		const response = await api.get("/sales-miner/report-step-templates", {
			params: includeInactive ? { include_inactive: 1 } : undefined,
		});
		return response.data;
	},

	async getStepPreset(
		templateId: string,
	): Promise<{ success: boolean; data?: StepPresetDetail; error?: string }> {
		const response = await api.get(
			`/sales-miner/report-step-templates/${templateId}`,
		);
		return response.data;
	},

	async createStepPreset(payload: {
		report_id: number;
		name: string;
		description?: string;
	}): Promise<{
		success: boolean;
		data?: { id: string; code: string; name: string; stepCount: number };
		error?: string;
	}> {
		const response = await api.post(
			"/sales-miner/report-step-templates",
			payload,
		);
		return response.data;
	},

	async applyStepPreset(
		templateId: string,
		reportId: number,
	): Promise<{
		success: boolean;
		data?: { configured: ConfiguredStep[] };
		error?: string;
	}> {
		const response = await api.post(
			`/sales-miner/report-step-templates/${templateId}/apply`,
			{ report_id: reportId },
		);
		return response.data;
	},

	async updateStepPreset(
		templateId: string,
		payload: {
			name?: string;
			description?: string | null;
			is_active?: boolean;
		},
	): Promise<{ success: boolean; error?: string }> {
		const response = await api.patch(
			`/sales-miner/report-step-templates/${templateId}`,
			payload,
		);
		return response.data;
	},

	async updateGenerationStepSettings(
		stepId: number,
		payload: {
			name?: string;
			url?: string;
			dependency?: StepDependency;
			reportType?: StepReportType;
			settings?: Record<string, unknown> | null;
		},
	): Promise<{
		success: boolean;
		data?: {
			id: number;
			name: string;
			url: string;
			dependency: StepDependency;
			reportType: StepReportType;
			settings: unknown;
		};
		error?: string;
	}> {
		const response = await api.patch(`/generation-steps/${stepId}`, payload);
		return response.data;
	},

	async getOrchestratorStatus(
		reportId: number,
	): Promise<OrchestratorStatusResponse> {
		const response = await api.get(`/deep-dive/${reportId}/orchestrator`);
		return response.data;
	},

	async ensureOrchestrator(
		reportId: number,
	): Promise<EnsureOrchestratorResponse> {
		const response = await api.put(`/deep-dive/${reportId}/orchestrator`);
		return response.data;
	},

	async startOrchestrator(
		reportId: number,
		options?: { parallel_limit?: number },
	): Promise<{
		success: boolean;
		data: { status: StepStatus; steps: number[] };
	}> {
		const response = await api.post(
			`/deep-dive/${reportId}/orchestrator`,
			options,
		);
		return response.data;
	},

	async updateOrchestrator(
		reportId: number,
		data: { status?: StepStatus; metadata?: Record<string, unknown> },
	): Promise<{ success: boolean }> {
		const response = await api.patch(
			`/deep-dive/${reportId}/orchestrator`,
			data,
		);
		return response.data;
	},

	async triggerEngineTick(
		reportId: number,
		instance: number,
	): Promise<{ success: boolean }> {
		const response = await api.post(
			`/deep-dive/${reportId}/orchestrator/trigger`,
			{ instance },
		);
		return response.data;
	},

	// ===== SM Engine run control =====
	// Only reached when the orchestrator is sm_engine. Under n8n the calls
	// above stay the whole story, untouched.

	async getOrchestratorController(): Promise<OrchestratorControllerResponse> {
		const response = await api.get(`/orchestrator/controller`);
		return response.data;
	},

	async getEngineRun(reportId: number): Promise<EngineRunResponse> {
		const response = await api.get(`/deep-dive/${reportId}/run`);
		return response.data;
	},

	/** Triggers a new run or resumes a paused one — the server decides which. */
	async startEngineRun(reportId: number): Promise<EngineRunActionResponse> {
		const response = await api.post(`/deep-dive/${reportId}/run/start`);
		return response.data;
	},

	async pauseEngineRun(reportId: number): Promise<EngineRunActionResponse> {
		const response = await api.post(`/deep-dive/${reportId}/run/pause`);
		return response.data;
	},
};

// ===== Queries =====

export const useGetGenerationSteps = (options?: { enabled?: boolean }) => {
	return useQuery({
		queryKey: ["generation-steps"],
		queryFn: () => reportStepsApi.getGenerationSteps(),
		enabled: options?.enabled ?? true,
	});
};

export const useGetReportSteps = (
	reportId: number | null,
	options?: { enabled?: boolean },
) => {
	return useQuery({
		queryKey: ["report-steps", reportId],
		queryFn: () => reportStepsApi.getReportSteps(reportId!),
		enabled:
			options?.enabled !== undefined ? options.enabled : reportId !== null,
	});
};

export const useGetStepsMatrix = (
	reportId: number | null,
	options?: { enabled?: boolean; refetchInterval?: number },
) => {
	return useQuery({
		queryKey: ["steps-matrix", reportId],
		queryFn: () => reportStepsApi.getStepsMatrix(reportId!),
		enabled:
			options?.enabled !== undefined ? options.enabled : reportId !== null,
		refetchInterval: options?.refetchInterval ?? 60000,
	});
};

export const useGetReportStepRuns = (
	reportId: number | null,
	options?: { enabled?: boolean; refetchInterval?: number },
) => {
	return useQuery({
		queryKey: ["step-runs", reportId],
		queryFn: () => reportStepsApi.getReportStepRuns(reportId!),
		enabled:
			options?.enabled !== undefined ? options.enabled : reportId !== null,
		refetchInterval: options?.refetchInterval ?? 30000,
	});
};

export const useGetCompanyStepStatuses = (
	reportId: number | null,
	companyId: number | null,
	options?: { enabled?: boolean },
) => {
	return useQuery({
		queryKey: ["company-step-statuses", reportId, companyId],
		queryFn: () => reportStepsApi.getCompanyStepStatuses(reportId!, companyId!),
		enabled:
			options?.enabled !== undefined
				? options.enabled
				: reportId !== null && companyId !== null,
	});
};

export const useGetOrchestratorStatus = (
	reportId: number | null,
	options?: { enabled?: boolean; refetchInterval?: number },
) => {
	return useQuery({
		queryKey: ["orchestrator", reportId],
		queryFn: () => reportStepsApi.getOrchestratorStatus(reportId!),
		enabled:
			options?.enabled !== undefined ? options.enabled : reportId !== null,
		refetchInterval: options?.refetchInterval ?? 60000,
	});
};

// ===== Mutations =====

export const useUpdateGenerationStepSettings = (reportId: number | null) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			stepId,
			payload,
		}: {
			stepId: number;
			payload: {
				name?: string;
				url?: string;
				dependency?: StepDependency;
				reportType?: StepReportType;
				settings?: Record<string, unknown> | null;
			};
		}) => reportStepsApi.updateGenerationStepSettings(stepId, payload),
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["report-steps", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
			queryClient
				.invalidateQueries({
					queryKey: ["generation-steps"],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useAddStepToReport = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (stepId: number) =>
			reportStepsApi.addStepToReport(reportId, stepId),
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["report-steps", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
			queryClient
				.invalidateQueries({
					queryKey: ["step-runs", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useRemoveStepFromReport = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (stepId: number) =>
			reportStepsApi.removeStepFromReport(reportId, stepId),
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["report-steps", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
			queryClient
				.invalidateQueries({
					queryKey: ["step-runs", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useReorderSteps = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (orderedStepIds: number[]) =>
			reportStepsApi.reorderSteps(reportId, orderedStepIds),
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["report-steps", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
			queryClient
				.invalidateQueries({
					queryKey: ["step-runs", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useUpdateStepOrder = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ stepId, order }: { stepId: number; order: number }) =>
			reportStepsApi.updateStepOrder(reportId, stepId, order),
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["report-steps", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
			queryClient
				.invalidateQueries({
					queryKey: ["step-runs", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useUpdateStepStatus = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			companyId,
			stepId,
			status,
		}: {
			companyId: number;
			stepId: number;
			status: StepStatus;
		}) => reportStepsApi.updateStepStatus(reportId, companyId, stepId, status),
		onSuccess: (_, variables) => {
			queryClient
				.invalidateQueries({
					queryKey: ["steps-matrix", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
			queryClient
				.invalidateQueries({
					queryKey: ["company-step-statuses", reportId, variables.companyId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useBulkUpdateStepStatuses = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			companyId,
			updates,
		}: {
			companyId: number;
			updates: Array<{ step_id: number; status: StepStatus }>;
		}) => reportStepsApi.bulkUpdateStepStatuses(reportId, companyId, updates),
		onSuccess: (_, variables) => {
			queryClient
				.invalidateQueries({
					queryKey: ["steps-matrix", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
			queryClient
				.invalidateQueries({
					queryKey: ["company-step-statuses", reportId, variables.companyId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useBulkUpdateReportStepStatuses = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: BulkStatusPayload) =>
			reportStepsApi.bulkUpdateReportStepStatuses(reportId, payload),
		onSuccess: () => {
			for (const key of [
				["steps-matrix", reportId],
				["company-step-statuses", reportId],
			]) {
				queryClient.invalidateQueries({ queryKey: key }).catch((error) => {
					console.error("Failed to invalidate query", error);
				});
			}
		},
	});
};

export const useStepPresets = (includeInactive = false) => {
	return useQuery({
		queryKey: ["step-presets", { includeInactive }],
		queryFn: () => reportStepsApi.listStepPresets(includeInactive),
	});
};

export const useStepPresetDetail = (templateId: string | null) => {
	return useQuery({
		queryKey: ["step-preset", templateId],
		queryFn: () => reportStepsApi.getStepPreset(templateId!),
		enabled: templateId !== null,
	});
};

export const useCreateStepPreset = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: {
			report_id: number;
			name: string;
			description?: string;
		}) => reportStepsApi.createStepPreset(payload),
		onSuccess: () => {
			queryClient
				.invalidateQueries({ queryKey: ["step-presets"] })
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useApplyStepPreset = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (templateId: string) =>
			reportStepsApi.applyStepPreset(templateId, reportId),
		onSuccess: () => {
			for (const key of [
				["report-steps", reportId],
				["steps-matrix", reportId],
				["step-runs", reportId],
			]) {
				queryClient.invalidateQueries({ queryKey: key }).catch((error) => {
					console.error("Failed to invalidate query", error);
				});
			}
		},
	});
};

export const useUpdateStepPreset = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			templateId,
			payload,
		}: {
			templateId: string;
			payload: {
				name?: string;
				description?: string | null;
				is_active?: boolean;
			};
		}) => reportStepsApi.updateStepPreset(templateId, payload),
		onSuccess: () => {
			queryClient
				.invalidateQueries({ queryKey: ["step-presets"] })
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useStartOrchestrator = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (options?: { parallel_limit?: number }) =>
			reportStepsApi.startOrchestrator(reportId, options),
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["orchestrator", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
			queryClient
				.invalidateQueries({
					queryKey: ["steps-matrix", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useEnsureOrchestrator = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => reportStepsApi.ensureOrchestrator(reportId),
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["orchestrator", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useUpdateOrchestrator = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: {
			status?: StepStatus;
			metadata?: Record<string, unknown>;
		}) => reportStepsApi.updateOrchestrator(reportId, data),
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["orchestrator", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
		onError: (error) => refreshControllerIfChanged(queryClient, error),
	});
};

export const useTriggerEngineTick = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (instance: number) =>
			reportStepsApi.triggerEngineTick(reportId, instance),
		onError: (error) => refreshControllerIfChanged(queryClient, error),
	});
};

// ===== SM Engine run control =====

/**
 * Which orchestrator is driving reports. An operator setting that changes
 * about never — but when it does, a page that cached it forever keeps
 * offering the losing orchestrator's controls, so it is re-read on a slow
 * poll. That only fixes what the page shows: every action re-checks the
 * value server-side and refuses if it moved, because no interval is short
 * enough to close that window on its own.
 */
export const useGetOrchestratorController = () => {
	return useQuery({
		queryKey: ["orchestrator-controller"],
		queryFn: () => reportStepsApi.getOrchestratorController(),
		staleTime: 60000,
		refetchInterval: 60000,
		retry: false,
	});
};

export const useGetEngineRun = (
	reportId: number | null,
	options?: { enabled?: boolean; refetchInterval?: number },
) => {
	return useQuery({
		queryKey: ["engine-run", reportId],
		queryFn: () => reportStepsApi.getEngineRun(reportId!),
		enabled:
			options?.enabled !== undefined ? options.enabled : reportId !== null,
		refetchInterval: options?.refetchInterval ?? 20000,
	});
};

export const useStartEngineRun = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => reportStepsApi.startEngineRun(reportId),
		onSuccess: () => invalidateRunViews(queryClient, reportId),
		onError: (error) => refreshControllerIfChanged(queryClient, error),
	});
};

export const usePauseEngineRun = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => reportStepsApi.pauseEngineRun(reportId),
		onSuccess: () => invalidateRunViews(queryClient, reportId),
		onError: (error) => refreshControllerIfChanged(queryClient, error),
	});
};

/**
 * The engine mirrors run state onto the orchestrator status the rest of the
 * page reads, so both views have to be refreshed after an action — otherwise
 * the button updates and the status card beside it stays stale.
 */
/**
 * The server refuses an action aimed at the orchestrator that no longer
 * drives reports. That answer is also the news that this page is out of
 * date, so the controller is re-read at once and the controls re-render as
 * the other orchestrator's rather than waiting out the poll.
 */
function refreshControllerIfChanged(
	queryClient: ReturnType<typeof useQueryClient>,
	error: unknown,
): void {
	if (!isControllerChanged(error)) return;

	queryClient
		.invalidateQueries({ queryKey: ["orchestrator-controller"] })
		.catch((invalidationError) => {
			console.error("Failed to invalidate query", invalidationError);
		});
}

function invalidateRunViews(
	queryClient: ReturnType<typeof useQueryClient>,
	reportId: number,
): void {
	for (const queryKey of [
		["engine-run", reportId],
		["orchestrator", reportId],
	]) {
		queryClient.invalidateQueries({ queryKey }).catch((error) => {
			console.error("Failed to invalidate query", error);
		});
	}
}

export default reportStepsApi;
