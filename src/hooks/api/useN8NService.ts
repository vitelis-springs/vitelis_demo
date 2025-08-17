import { useMutation, useQuery } from '@tanstack/react-query';
import N8NApiClient, { N8NApiError } from '../../config/client/n8n.api';

// Create API client instance
const n8nApi = new N8NApiClient();

// Types for execution details - matches the actual N8N API response
export interface N8NExecutionDetails {
  id: string;
  finished: boolean;
  mode: string;
  retryOf: string | null;
  retrySuccessId: string | null;
  status: 'running' | 'completed' | 'failed' | 'error' | 'waiting';
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
      data?: {
        companyName: string;
        businessLine: string;
        country: string;
        useCase: string;
        timeline: string;
      } | any;
      isTest?: boolean;
    }) => {
      const { workflowId, data, isTest = false } = params;
      
      // If no workflowId provided, use the default form endpoint
      if (!workflowId) {
        return n8nApi.startWorkflow(data as {
          companyName: string;
          businessLine: string;
          country: string;
          useCase: string;
          timeline: string;
        }, isTest);
      }
      
      // If workflowId provided, use the trigger workflow method
      return n8nApi.triggerWorkflow(workflowId, data);
    },
    onError: (error: N8NApiError) => {
      console.error('Failed to run workflow:', error);
    },
  });
};

// Get Execution Details Hook - fetches execution status and custom data
export const useGetExecutionDetails = (executionId: string | null, options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) => {
  return useQuery({
    queryKey: ['n8n-execution', executionId],
    queryFn: async (): Promise<N8NExecutionDetails> => {
      if (!executionId) {
        throw new Error('Execution ID is required');
      }
      
      // Make a direct API call to get the full execution details
      const response = await fetch(`${process.env.NEXT_PUBLIC_N8N_API_URL || 'https://vitelis.app.n8n.cloud/'}api/v1/executions/${executionId}?includeData=true`, {
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NEXT_PUBLIC_N8N_API_KEY && {
            'X-N8N-API-KEY': process.env.NEXT_PUBLIC_N8N_API_KEY
          })
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch execution details: ${response.status}`);
      }
      
      const execution = await response.json();
      
      // Transform the API response to match our interface
      return {
        id: execution.id,
        finished: execution.finished || false,
        mode: execution.mode || 'manual',
        retryOf: execution.retryOf || null,
        retrySuccessId: execution.retrySuccessId || null,
        status: execution.status,
        createdAt: execution.createdAt || execution.startedAt || new Date().toISOString(),
        startedAt: execution.startedAt || new Date().toISOString(),
        stoppedAt: execution.stoppedAt || null,
        customData: execution.customData || {},
        data: execution.data
      };
    },
    enabled: !!executionId && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval || 5000, // Poll every 5 seconds by default
    refetchIntervalInBackground: true,
    retry: 3,
    retryDelay: 1000,
  });
};
