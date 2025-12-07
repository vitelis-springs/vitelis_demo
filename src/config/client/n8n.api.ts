import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

const N8N_API_URL =
  process.env.NEXT_PUBLIC_N8N_API_URL || "https://vitelis.app.n8n.cloud/";
const N8N_BIZMINER_URL =
  process.env.NEXT_PUBLIC_N8N_BIZMINER_URL || N8N_API_URL;
const N8N_SALESMINER_URL =
  process.env.NEXT_PUBLIC_N8N_SALESMINER_URL || N8N_API_URL;

const BIZMINER_PATH_V2_ALLIANZ = "webhook/v2/bizminer/allianz"; // specific for Allianz use case
const SALESMINER_PATH_V1 = "webhook/v1/salesminer";
const ALIXPARTNER_PATH_V1 = "webhook/v1/alixpartner";
const BIZMINER_PATH_V2_DEFAULT = "webhook/v2/bizminer/default";

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
  private bizminer_path: string;
  private salesminer_path: string;
  private alixpartner_path: string;
  private bizminer_alllianz: string;

  constructor(baseURL: string = N8N_API_URL) {
    this.baseURL = baseURL;

    this.bizminer_path = BIZMINER_PATH_V2_DEFAULT;
    this.salesminer_path = SALESMINER_PATH_V1;
    this.alixpartner_path = ALIXPARTNER_PATH_V1;
    this.bizminer_alllianz = BIZMINER_PATH_V2_ALLIANZ;

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

  private getBizMinerClient() {
    const client = axios.create({
      baseURL: N8N_BIZMINER_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
    client.interceptors.request.use((config) => {
      const apiKey =
        process.env.NEXT_PUBLIC_N8N_BIZMINER_API_KEY ||
        process.env.NEXT_PUBLIC_N8N_API_KEY;
      if (apiKey) {
        config.headers["X-N8N-API-KEY"] = `${apiKey}`;
      }
      return config;
    });
    return client;
  }

  private getSalesMinerClient() {
    const client = axios.create({
      baseURL: N8N_SALESMINER_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
    client.interceptors.request.use((config) => {
      const apiKey =
        process.env.NEXT_PUBLIC_N8N_SALESMINER_API_KEY ||
        process.env.NEXT_PUBLIC_N8N_API_KEY;
      if (apiKey) {
        config.headers["X-N8N-API-KEY"] = `${apiKey}`;
      }
      return config;
    });
    return client;
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
    let triggerUrl = `${this.bizminer_path}`;
    if (data.useCase.toLowerCase().indexOf("allianz") !== -1) {
      triggerUrl = `${this.bizminer_alllianz}`;
    }

    console.log("🌐 Making N8N API request to:", triggerUrl);
    console.log("📤 Request data:", data);

    // Make request using BizMiner client
    const response = await this.getBizMinerClient().post(triggerUrl, data);

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
    const triggerUrl = `${this.salesminer_path}`;

    console.log("🌐 Making N8N SalesMiner API request to:", triggerUrl);
    console.log("📤 SalesMiner Request data:", data);

    // Make request using SalesMiner client
    const response = await this.getSalesMinerClient().post(triggerUrl, data);

    console.log("📥 N8N SalesMiner API response:", response.data);
    return response.data;
  }
}

export default N8NApiClient;
