interface N8NConfig {
  url: string;
  apiKey: string;
}

interface BizMinerWorkflowData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  language?: string;
  additionalInformation?: string;
  url?: string;
  competitors?: { name: string; url: string }[];
}

interface SalesMinerWorkflowData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  language: string;
  additionalInformation?: string;
  url?: string;
  competitors?: { name: string; url: string }[];
}

const BIZMINER_PATH_V2_ALLIANZ = "webhook/v2/bizminer/allianz";
const BIZMINER_PATH_V2_DEFAULT = "webhook/v2/bizminer/default";
const SALESMINER_PATH_V1 = "webhook/v1/salesminer";

export class N8NService {
  private static getBizMinerConfig(): N8NConfig {
    const url = process.env.N8N_BIZMINER_URL;
    const apiKey = process.env.N8N_BIZMINER_API_KEY || process.env.N8N_API_KEY;

    if (!url || !apiKey) {
      throw new Error("N8N BizMiner configuration not found");
    }

    return { url, apiKey };
  }

  private static getSalesMinerConfig(): N8NConfig {
    const url = process.env.N8N_SALESMINER_URL;
    const apiKey =
      process.env.N8N_SALESMINER_API_KEY || process.env.N8N_API_KEY;

    if (!url || !apiKey) {
      throw new Error("N8N SalesMiner configuration not found");
    }

    return { url, apiKey };
  }

  private static getConfigByType(type?: string | null): N8NConfig {
    if (type === "salesminer") {
      return this.getSalesMinerConfig();
    }
    if (type === "bizminer") {
      return this.getBizMinerConfig();
    }
    // Default fallback
    const url = process.env.N8N_API_URL || "https://vitelis.app.n8n.cloud/";
    const apiKey = process.env.N8N_API_KEY;
    if (!apiKey) {
      throw new Error("N8N API key not configured");
    }
    return { url, apiKey };
  }

  private static async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = 30000,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  static async startBizMinerWorkflow(data: BizMinerWorkflowData): Promise<any> {
    const config = this.getBizMinerConfig();

    let webhookPath = BIZMINER_PATH_V2_DEFAULT;
    if (data.useCase.toLowerCase().indexOf("allianz") !== -1) {
      webhookPath = BIZMINER_PATH_V2_ALLIANZ;
    }

    const triggerUrl = `${config.url}${webhookPath}`;
    console.log("🌐 N8NService: Making BizMiner API request to:", triggerUrl);

    const response = await this.fetchWithTimeout(triggerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": config.apiKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`N8N API request failed with status ${response.status}`);
    }

    const result = await response.json();

    if (!result?.executionId) {
      console.warn("⚠️ N8NService: N8N response does not contain executionId");
    }

    return result;
  }

  static async startSalesMinerWorkflow(
    data: SalesMinerWorkflowData,
  ): Promise<any> {
    const config = this.getSalesMinerConfig();
    const triggerUrl = `${config.url}${SALESMINER_PATH_V1}`;
    console.log("🌐 N8NService: Making SalesMiner API request to:", triggerUrl);

    const response = await this.fetchWithTimeout(triggerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": config.apiKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`N8N API request failed with status ${response.status}`);
    }

    const result = await response.json();

    if (!result?.executionId) {
      console.warn("⚠️ N8NService: N8N response does not contain executionId");
    }

    return result;
  }

  static async exportGroupedReport(
    reportId: number,
    companyIds: number[],
  ): Promise<Response> {
    const config = this.getConfigByType();
    const url = `${config.url}webhook/deep-dive/grouped-report`;

    console.log(
      "📊 N8NService: Requesting grouped report export for report:",
      reportId,
    );

    const response = await this.fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-KEY": config.apiKey,
        },
        body: JSON.stringify({ report_id: reportId, company_ids: companyIds }),
      },
      120000,
    );

    if (!response.ok) {
      throw new Error(
        `N8N export request failed with status ${response.status}`,
      );
    }

    return response;
  }

  static async tryQuery(
    query: string,
    metadataFilters: Record<string, unknown>,
  ): Promise<unknown> {
    const config = this.getConfigByType();
    const url = `${config.url}webhook/deep-dive/try_vector_query`;

    console.log("🔍 N8NService: Executing try-query:", query);

    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": config.apiKey,
      },
      body: JSON.stringify({ query, metadata_filters: metadataFilters }),
    });

    if (!response.ok) {
      throw new Error(
        `N8N try-query request failed with status ${response.status}`,
      );
    }

    return response.json();
  }

  static async getExecutionDetails(
    executionId: string,
    type?: string | null,
  ): Promise<any> {
    const config = this.getConfigByType(type);
    const url = `${config.url}api/v1/executions/${executionId}?includeData=true`;

    console.log(
      "🔄 N8NService: Fetching execution details for ID:",
      executionId,
      "Type:",
      type,
    );

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": config.apiKey,
      },
    });

    if (!response.ok) {
      console.error(
        "❌ N8NService: N8N API error:",
        response.status,
        response.statusText,
      );
      throw new Error(`N8N API error: ${response.status}`);
    }

    const execution = await response.json();
    console.log(
      `✅ N8NService: Execution ${executionId} status:`,
      execution.status,
    );

    return {
      id: execution.id,
      finished: execution.finished || false,
      mode: execution.mode || "manual",
      retryOf: execution.retryOf || null,
      retrySuccessId: execution.retrySuccessId || null,
      status: execution.status,
      createdAt:
        execution.createdAt || execution.startedAt || new Date().toISOString(),
      startedAt: execution.startedAt || new Date().toISOString(),
      stoppedAt: execution.stoppedAt || null,
      customData: execution.customData || {},
      data: execution.data,
    };
  }
}
