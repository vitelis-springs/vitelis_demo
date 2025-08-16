import { useMutation } from '@tanstack/react-query';
import N8NApiClient, { N8NApiError } from '@/config/client/n8n.api';

// Create API client instance
const n8nApi = new N8NApiClient();

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
    }) => {
      const { workflowId, data } = params;
      
      // If no workflowId provided, use the default form endpoint
      if (!workflowId) {
        return n8nApi.startWorkflow(data as {
          companyName: string;
          businessLine: string;
          country: string;
          useCase: string;
          timeline: string;
        });
      }
      
      // If workflowId provided, use the trigger workflow method
      return n8nApi.triggerWorkflow(workflowId, data);
    },
    onError: (error: N8NApiError) => {
      console.error('Failed to run workflow:', error);
    },
  });
};
