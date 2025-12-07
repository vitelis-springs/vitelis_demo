import { useMutation, useQuery } from "@tanstack/react-query";
import N8NApiClient from "../../config/client/n8n.api";

// Create API client instance
const n8nApi = new N8NApiClient();

// Types for execution details - matches the actual N8N API response
export interface N8NExecutionDetails {
  id: string;
  finished: boolean;
  mode: string;
  retryOf: string | null;
  retrySuccessId: string | null;
  status:
    | "running"
    | "completed"
    | "failed"
    | "error"
    | "waiting"
    | "canceled"
    | "crashed";
  createdAt: string;
  startedAt: string;
  stoppedAt: string | null;
  customData?: {
    step?: string;
    [key: string]: any;
  };
  data?: any;
}

// Run Workflow Hook - uses default form endpoint if no workflowId provided
export const useRunWorkflow = () => {
  return useMutation({
    mutationFn: async (params: {
      workflowId?: string;
      data?:
        | {
            companyName: string;
            businessLine: string;
            country: string;
            useCase: string;
            timeline: string;
          }
        | any;
      isTest?: boolean;
    }) => {
      const { workflowId, data, isTest = false } = params;

      // If no workflowId provided, use the default form endpoint
      if (!workflowId) {
        return n8nApi.startWorkflow(
          data as {
            companyName: string;
            businessLine: string;
            country: string;
            useCase: string;
            timeline: string;
          }
        );
      }

      // If workflowId provided, use the trigger workflow method
      return n8nApi.startWorkflow(data);
    },
    retry: false, // Отключаем автоматические повторы
  });
};

// Sales Miner Workflow Hook - specifically for SalesMinerAnalyze workflow
export const useSalesMinerWorkflow = () => {
  return useMutation({
    mutationFn: async (params: {
      workflowId?: string;
      data?:
        | {
            companyName: string;
            businessLine: string;
            country: string;
            useCase: string;
            timeline: string;
            language: string;
            additionalInformation?: string;
          }
        | any;
      isTest?: boolean;
    }) => {
      const { workflowId, data, isTest = false } = params;

      // Always use the SalesMiner-specific workflow endpoint
      return n8nApi.startSalesMinerWorkflow(
        data as {
          companyName: string;
          businessLine: string;
          country: string;
          useCase: string;
          timeline: string;
          language: string;
          additionalInformation?: string;
        }
      );
    },
    retry: false,
  });
};

// Get Execution Details Hook - fetches execution status and custom data
export const useGetExecutionDetails = (
  executionId: string | null,
  instanceType: "bizminer" | "salesminer" = "bizminer",
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) => {
  return useQuery({
    queryKey: ["n8n-execution", executionId, instanceType],
    queryFn: async (): Promise<N8NExecutionDetails> => {
      if (!executionId) {
        throw new Error("Execution ID is required");
      }

      console.log(
        "🌐 Client: Fetching execution details for ID:",
        executionId,
        "Type:",
        instanceType
      );

      // Use our server-side API endpoint instead of direct N8N API call
      const response = await fetch(
        `/api/n8n/execution/${executionId}?type=${instanceType}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch execution details: ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch execution details");
      }

      console.log("📥 Client: Execution details received:", result.data);

      return result.data;
    },
    enabled: !!executionId && options?.enabled !== false,
    refetchInterval: options?.refetchInterval || 5000,
    refetchIntervalInBackground: true,
    retry: false,
  });
};
