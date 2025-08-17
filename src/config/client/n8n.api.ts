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
          config.headers['X-N8N-API-KEY'] = `${apiKey}`;
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

  

  async getWorkflow(id: string): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>({
      method: 'GET',
      url: `/api/v1/workflows/${id}`,
    });
  }

  


  async getExecution(id: string): Promise<N8NExecution> {
    return this.request<N8NExecution>({
      method: 'GET',
      url: `/api/v1/executions/${id}`,
    });
  }

 

  // Start workflow with form data
  async startWorkflow(data: {
    companyName: string;
    businessLine: string;
    country: string;
    useCase: string;
    timeline: string;
  }, isTest: boolean = false): Promise<any> {
    const endpoint = isTest 
      ? '/webhook-test/dfbf30af-cc93-4e3f-bc19-755c8c3d57f4'
      : '/webhook/dfbf30af-cc93-4e3f-bc19-755c8c3d57f4';
    
    return this.request<any>({
      method: 'POST',
      url: endpoint,
      data,
    });
  }

  
}

// Export the class for custom instances
export default N8NApiClient;
