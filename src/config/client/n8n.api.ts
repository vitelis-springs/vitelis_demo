import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const N8N_API_URL = process.env.NEXT_PUBLIC_N8N_API_URL || 'https://vitelis.app.n8n.cloud/';

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

export class N8NApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = N8N_API_URL) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const apiKey = process.env.NEXT_PUBLIC_N8N_API_KEY;
      if (apiKey) {
        config.headers['X-N8N-API-KEY'] = `${apiKey}`;
      }
      return config;
    });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    console.log('🔧 Making axios request:', {
      method: config.method,
      url: config.url,
      baseURL: this.baseURL
    });
    
    const response = await this.client.request<T>(config);
    console.log('📡 Axios response status:', response.status);
    
    return response.data;
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
    
    console.log('🌐 Making N8N API request to:', this.baseURL + endpoint);
    console.log('📤 Request data:', data);
    
    const result = await this.request<any>({
      method: 'POST',
      url: endpoint,
      data,
    });
    
    console.log('📥 N8N API response:', result);
    return result;
  }
}

export default N8NApiClient;
