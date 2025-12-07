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

/**
 * N8N API Client for interacting with N8N workflows
 * All requests are proxied through our backend API for security
 */
export class N8NApiClient {
  constructor() {
    // All requests are proxied through our backend API for security
  }

  /**
   * Start a BizMiner workflow
   * Calls our backend API which then calls N8N
   */
  async startBizminerWorkflow(data: {
    companyName: string;
    businessLine: string;
    country: string;
    useCase: string;
    timeline: string;
    language?: string;
    additionalInformation?: string;
  }): Promise<any> {
    console.log("📤 Client: Starting BizMiner workflow via backend API", data);

    const response = await fetch("/api/n8n/bizminer/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Client: BizMiner workflow start failed:", error);
      throw new Error(error.error || "Failed to start BizMiner workflow");
    }

    const result = await response.json();
    console.log("📥 Client: BizMiner workflow result.data:", result.data);

    if (!result.data?.executionId) {
      console.warn("⚠️ Client: No executionId in response from backend!");
    }

    return result.data;
  }

  /**
   * Start a SalesMiner workflow
   * Calls our backend API which then calls N8N
   */
  async startSalesMinerWorkflow(data: {
    companyName: string;
    businessLine: string;
    country: string;
    useCase: string;
    timeline: string;
    language: string;
    additionalInformation?: string;
  }): Promise<any> {
    console.log("🌐 Client: Starting SalesMiner workflow via backend API");
    console.log("📤 Client: Request data:", data);

    const response = await fetch("/api/n8n/salesminer/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Client: SalesMiner workflow start failed:", error);
      throw new Error(error.error || "Failed to start SalesMiner workflow");
    }

    const result = await response.json();
    console.log("📥 Client: SalesMiner workflow result.data:", result.data);

    if (!result.data?.executionId) {
      console.warn("⚠️ Client: No executionId in response from backend!");
    }

    return result.data;
  }
}

export default N8NApiClient;
