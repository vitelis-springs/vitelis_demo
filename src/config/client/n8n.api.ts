import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Environment variable for N8N API URL
const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || 'https://vitelis.app.n8n.cloud/';

// Types for N8N API responses
export interface N8NWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  settings?: any;
  staticData?: any;
  tags?: string[];
  versionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface N8NExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'waiting';
  data?: any;
  startedAt?: string;
  stoppedAt?: string;
  error?: string;
}

export interface N8NWebhookResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface N8NError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Custom error class for N8N API errors
export class N8NApiError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'N8NApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Error handler function
const handleApiError = (error: AxiosError): N8NApiError => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data as any;
    
    return new N8NApiError(
      data?.message || `HTTP ${status}: ${error.message}`,
      status,
      data?.code,
      data
    );
  } else if (error.request) {
    // Request was made but no response received
    return new N8NApiError(
      'No response received from N8N server',
      0,
      'NETWORK_ERROR'
    );
  } else {
    // Something else happened
    return new N8NApiError(
      `Request setup error: ${error.message}`,
      0,
      'REQUEST_ERROR'
    );
  }
};

// N8N API Client class
export class N8NApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = N8N_API_URL) {
    this.baseURL = baseURL;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        // Add API key if available
        const apiKey = process.env.NEXT_PUBLIC_N8N_API_KEY;
        if (apiKey) {
          config.headers.Authorization = `Bearer ${apiKey}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        const n8nError = handleApiError(error);
        return Promise.reject(n8nError);
      }
    );
  }

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Workflow methods
  async getWorkflows(): Promise<N8NWorkflow[]> {
    return this.request<N8NWorkflow[]>({
      method: 'GET',
      url: '/api/v1/workflows',
    });
  }

  async getWorkflow(id: string): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>({
      method: 'GET',
      url: `/api/v1/workflows/${id}`,
    });
  }

  async createWorkflow(workflow: Partial<N8NWorkflow>): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>({
      method: 'POST',
      url: '/api/v1/workflows',
      data: workflow,
    });
  }

  async updateWorkflow(id: string, workflow: Partial<N8NWorkflow>): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>({
      method: 'PUT',
      url: `/api/v1/workflows/${id}`,
      data: workflow,
    });
  }

  async deleteWorkflow(id: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      url: `/api/v1/workflows/${id}`,
    });
  }

  async activateWorkflow(id: string): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>({
      method: 'POST',
      url: `/api/v1/workflows/${id}/activate`,
    });
  }

  async deactivateWorkflow(id: string): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>({
      method: 'POST',
      url: `/api/v1/workflows/${id}/deactivate`,
    });
  }

  // Execution methods
  async getExecutions(workflowId?: string): Promise<N8NExecution[]> {
    const params = workflowId ? { workflowId } : {};
    return this.request<N8NExecution[]>({
      method: 'GET',
      url: '/api/v1/executions',
      params,
    });
  }

  async getExecution(id: string): Promise<N8NExecution> {
    return this.request<N8NExecution>({
      method: 'GET',
      url: `/api/v1/executions/${id}`,
    });
  }

  async triggerWorkflow(workflowId: string, data?: any): Promise<N8NExecution> {
    return this.request<N8NExecution>({
      method: 'POST',
      url: `/api/v1/workflows/${workflowId}/trigger`,
      data,
    });
  }

  // Webhook methods
  async triggerWebhook(webhookId: string, data?: any): Promise<N8NWebhookResponse> {
    return this.request<N8NWebhookResponse>({
      method: 'POST',
      url: `/webhook/${webhookId}`,
      data,
    });
  }

  // Start workflow with form data
  async startWorkflow(data: {
    companyName: string;
    businessLine: string;
    country: string;
    useCase: string;
    timeline: string;
  }): Promise<any> {
    return this.request<any>({
      method: 'POST',
      url: '/form/8bc7a70d-a943-4b97-b242-a722aa42b944',
      data,
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>({
      method: 'GET',
      url: '/healthz',
    });
  }

  // Get API info
  async getApiInfo(): Promise<any> {
    return this.request<any>({
      method: 'GET',
      url: '/api/v1',
    });
  }
}

// Export the class for custom instances
export default N8NApiClient;
