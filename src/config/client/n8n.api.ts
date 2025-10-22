import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

const N8N_API_URL =
  process.env.NEXT_PUBLIC_N8N_API_URL || "https://vitelis.app.n8n.cloud/";

const BIZMINER_PATH_V2 = "webhook/v2/bizminer"; // "webhook-test/v2/bizminer" - test porposes
const SALESMINER_PATH_V1 = "webhook/v1/salesminer"; // "webhook-test/v1/salesminer" - test porposes
const ALIXPARTNER_PATH_V1 = "webhook/v1/alixpartner"; // For future use - "webhook-test/v1/alixpartner" - test porposes
const BIZMINER_PATH_V1 = "webhook/v1/bizminer"; // "webhook-test/v1/bizminer" - test porposes

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
  status: "running" | "completed" | "failed" | "waiting";
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
        "Content-Type": "application/json",
      },
    });

    this.client.interceptors.request.use((config) => {
      const apiKey = process.env.NEXT_PUBLIC_N8N_API_KEY;
      if (apiKey) {
        config.headers["X-N8N-API-KEY"] = `${apiKey}`;
      }
      return config;
    });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    console.log("🔧 Making axios request:", {
      method: config.method,
      url: config.url,
      baseURL: this.baseURL,
    });

    const response = await this.client.request<T>(config);
    console.log("📡 Axios response status:", response.status);

    return response.data;
  }

  async getWorkflow(id: string): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>({
      method: "GET",
      url: `/api/v1/workflows/${id}`,
    });
  }

  async getExecution(id: string): Promise<N8NExecution> {
    return this.request<N8NExecution>({
      method: "GET",
      url: `/api/v1/executions/${id}`,
    });
  }

  async startWorkflow(data: {
    companyName: string;
    businessLine: string;
    country: string;
    useCase: string;
    timeline: string;
    language?: string;
    additionalInformation?: string;
  }): Promise<any> {
    // Use the environment variable for the trigger URL
    let triggerUrl = `${this.baseURL}${BIZMINER_PATH_V1}`;
    if (data.useCase.toLowerCase().indexOf("allianz") !== -1) {
      triggerUrl = `${this.baseURL}${BIZMINER_PATH_V2}`;
    }

    console.log("🌐 Making N8N API request to:", triggerUrl);
    console.log("📤 Request data:", data);

    // Make direct request to the trigger URL instead of using baseURL
    const response = await axios.post(triggerUrl, data, {
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("📥 N8N API response:", response.data);
    return response.data;
  }

  async startSalesMinerWorkflow(data: {
    companyName: string;
    businessLine: string;
    country: string;
    useCase: string;
    timeline: string;
    language: string;
    additionalInformation?: string;
  }): Promise<any> {
    // Use the specific SalesMiner trigger URL
    const triggerUrl = `${this.baseURL}${SALESMINER_PATH_V1}`;

    console.log("🌐 Making N8N SalesMiner API request to:", triggerUrl);
    console.log("📤 SalesMiner Request data:", data);

    // Make direct request to the SalesMiner trigger URL
    const response = await axios.post(triggerUrl, data, {
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("📥 N8N SalesMiner API response:", response.data);
    return response.data;
  }
}

export default N8NApiClient;
