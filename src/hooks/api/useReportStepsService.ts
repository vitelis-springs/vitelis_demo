import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";

// ===== Types =====

export type StepStatus = "PENDING" | "PROCESSING" | "DONE" | "ERROR";
export type StepDependency = "rdp" | "kpi" | "category" | "url" | null;

export interface GenerationStep {
  id: number;
  name: string;
  url: string;
  dependency: StepDependency;
  settings: unknown;
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

export interface StepsMatrixCompany {
  id: number;
  name: string;
}

export interface StepsMatrixStep {
  id: number;
  name: string;
  order: number;
}

export interface StepsMatrixRow {
  companyId: number;
  statuses: Array<{
    stepId: number;
    status: StepStatus;
  }>;
}

export interface StepsMatrixResponse {
  success: boolean;
  data: {
    companies: StepsMatrixCompany[];
    steps: StepsMatrixStep[];
    matrix: StepsMatrixRow[];
  };
}

export interface CompanyStepStatus {
  stepId: number;
  stepName: string;
  status: StepStatus;
  metadata: unknown;
  updatedAt: string | null;
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

// ===== API Functions =====

const reportStepsApi = {
  async getGenerationSteps(): Promise<{ success: boolean; data: GenerationStep[] }> {
    const response = await api.get("/generation-steps");
    return response.data;
  },

  async getReportSteps(reportId: number): Promise<ReportStepsResponse> {
    const response = await api.get(`/deep-dive/${reportId}/steps`);
    return response.data;
  },

  async addStepToReport(
    reportId: number,
    stepId: number
  ): Promise<{ success: boolean; data?: { id: number; name: string; order: number }; error?: string }> {
    const response = await api.post(`/deep-dive/${reportId}/steps`, {
      step_id: stepId,
    });
    return response.data;
  },

  async removeStepFromReport(
    reportId: number,
    stepId: number
  ): Promise<{ success: boolean; error?: string }> {
    const response = await api.delete(`/deep-dive/${reportId}/steps/${stepId}`);
    return response.data;
  },

  async reorderSteps(
    reportId: number,
    orderedStepIds: number[]
  ): Promise<{ success: boolean }> {
    const response = await api.patch(`/deep-dive/${reportId}/steps`, {
      ordered_step_ids: orderedStepIds,
    });
    return response.data;
  },

  async updateStepOrder(
    reportId: number,
    stepId: number,
    order: number
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

  async getCompanyStepStatuses(
    reportId: number,
    companyId: number
  ): Promise<CompanyStepStatusesResponse> {
    const response = await api.get(
      `/deep-dive/${reportId}/companies/${companyId}/steps`
    );
    return response.data;
  },

  async updateStepStatus(
    reportId: number,
    companyId: number,
    stepId: number,
    status: StepStatus
  ): Promise<{ success: boolean }> {
    const response = await api.patch(
      `/deep-dive/${reportId}/companies/${companyId}/steps`,
      { step_id: stepId, status }
    );
    return response.data;
  },

  async bulkUpdateStepStatuses(
    reportId: number,
    companyId: number,
    updates: Array<{ step_id: number; status: StepStatus }>
  ): Promise<{ success: boolean }> {
    const response = await api.patch(
      `/deep-dive/${reportId}/companies/${companyId}/steps`,
      { updates }
    );
    return response.data;
  },

  async updateGenerationStepSettings(
    stepId: number,
    settings: Record<string, string> | null
  ): Promise<{ success: boolean; data?: { id: number; name: string; settings: unknown }; error?: string }> {
    const response = await api.patch(`/generation-steps/${stepId}`, { settings });
    return response.data;
  },

  async getOrchestratorStatus(
    reportId: number
  ): Promise<OrchestratorStatusResponse> {
    const response = await api.get(`/deep-dive/${reportId}/orchestrator`);
    return response.data;
  },

  async startOrchestrator(
    reportId: number,
    options?: { parallel_limit?: number }
  ): Promise<{ success: boolean; data: { status: StepStatus; steps: number[] } }> {
    const response = await api.post(
      `/deep-dive/${reportId}/orchestrator`,
      options
    );
    return response.data;
  },

  async updateOrchestrator(
    reportId: number,
    data: { status?: StepStatus; metadata?: Record<string, unknown> }
  ): Promise<{ success: boolean }> {
    const response = await api.patch(`/deep-dive/${reportId}/orchestrator`, data);
    return response.data;
  },

  async triggerEngineTick(
    reportId: number,
    instance: number
  ): Promise<{ success: boolean }> {
    const response = await api.post(
      `/deep-dive/${reportId}/orchestrator/trigger`,
      { instance }
    );
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
  options?: { enabled?: boolean }
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
  options?: { enabled?: boolean; refetchInterval?: number }
) => {
  return useQuery({
    queryKey: ["steps-matrix", reportId],
    queryFn: () => reportStepsApi.getStepsMatrix(reportId!),
    enabled:
      options?.enabled !== undefined ? options.enabled : reportId !== null,
    refetchInterval: options?.refetchInterval ?? 60000,
  });
};

export const useGetCompanyStepStatuses = (
  reportId: number | null,
  companyId: number | null,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["company-step-statuses", reportId, companyId],
    queryFn: () =>
      reportStepsApi.getCompanyStepStatuses(reportId!, companyId!),
    enabled:
      options?.enabled !== undefined
        ? options.enabled
        : reportId !== null && companyId !== null,
  });
};

export const useGetOrchestratorStatus = (
  reportId: number | null,
  options?: { enabled?: boolean; refetchInterval?: number }
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
      settings,
    }: {
      stepId: number;
      settings: Record<string, string> | null;
    }) => reportStepsApi.updateGenerationStepSettings(stepId, settings),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["report-steps", reportId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["generation-steps"],
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
      void queryClient.invalidateQueries({
        queryKey: ["report-steps", reportId],
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
      void queryClient.invalidateQueries({
        queryKey: ["report-steps", reportId],
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
      void queryClient.invalidateQueries({
        queryKey: ["report-steps", reportId],
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
      void queryClient.invalidateQueries({
        queryKey: ["report-steps", reportId],
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
      void queryClient.invalidateQueries({
        queryKey: ["steps-matrix", reportId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["company-step-statuses", reportId, variables.companyId],
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
      void queryClient.invalidateQueries({
        queryKey: ["steps-matrix", reportId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["company-step-statuses", reportId, variables.companyId],
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
      void queryClient.invalidateQueries({
        queryKey: ["orchestrator", reportId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["steps-matrix", reportId],
      });
    },
  });
};

export const useUpdateOrchestrator = (reportId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { status?: StepStatus; metadata?: Record<string, unknown> }) =>
      reportStepsApi.updateOrchestrator(reportId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["orchestrator", reportId],
      });
    },
  });
};

export const useTriggerEngineTick = (reportId: number) => {
  return useMutation({
    mutationFn: (instance: number) =>
      reportStepsApi.triggerEngineTick(reportId, instance),
  });
};

export default reportStepsApi;
