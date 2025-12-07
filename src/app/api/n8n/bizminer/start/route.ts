import { NextRequest, NextResponse } from "next/server";

const BIZMINER_PATH_V2_ALLIANZ = "webhook/v2/bizminer/allianz";
const BIZMINER_PATH_V2_DEFAULT = "webhook/v2/bizminer/default";

/**
 * POST /api/n8n/workflow/start
 * Starts a BizMiner workflow on N8N
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      businessLine,
      country,
      useCase,
      timeline,
      language,
      additionalInformation,
      competitors,
      url,
    } = body;

    // Validate required fields
    if (!companyName || !businessLine || !country || !useCase || !timeline) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: companyName, businessLine, country, useCase, timeline",
        },
        { status: 400 }
      );
    }

    // Get N8N configuration from environment
    const n8nBizMinerUrl = process.env.N8N_BIZMINER_URL;
    const n8nApiKey =
      process.env.N8N_BIZMINER_API_KEY || process.env.N8N_API_KEY;

    if (!n8nBizMinerUrl || !n8nApiKey) {
      console.error("❌ Server: N8N BizMiner configuration missing");
      return NextResponse.json(
        { success: false, error: "N8N BizMiner configuration not found" },
        { status: 500 }
      );
    }

    // Determine which webhook path to use based on use case
    let webhookPath = BIZMINER_PATH_V2_DEFAULT;
    if (useCase.toLowerCase().indexOf("allianz") !== -1) {
      webhookPath = BIZMINER_PATH_V2_ALLIANZ;
    }

    const triggerUrl = `${n8nBizMinerUrl}${webhookPath}`;

    console.log("🌐 Server: Making N8N BizMiner API request to:", triggerUrl);
    console.log("📤 Server: Request data:", {
      companyName,
      url,
      competitors,
      businessLine,
      country,
      useCase,
      timeline,
    });

    // Make request to N8N
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(triggerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-KEY": n8nApiKey,
        },
        body: JSON.stringify({
          companyName,
          businessLine,
          country,
          useCase,
          timeline,
          language,
          additionalInformation,
          url,
          competitors,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `N8N API request failed with status ${response.status}`
        );
      }

      const data = await response.json();

      if (!data?.executionId) {
        console.warn(
          "⚠️ Server: N8N response does not contain executionId. Check N8N workflow configuration."
        );
        console.warn(
          "⚠️ Server: Full N8N response:",
          JSON.stringify(data, null, 2)
        );
      }

      return NextResponse.json(data);
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error: any) {
    console.error("❌ Server: Error calling N8N BizMiner API:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "N8N API request failed",
      },
      { status: 500 }
    );
  }
}
