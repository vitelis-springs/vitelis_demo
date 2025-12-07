import axios from "axios";
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
    const response = await axios.post(
      triggerUrl,
      {
        companyName,
        businessLine,
        country,
        useCase,
        timeline,
        language,
        additionalInformation,
        url,
        competitors,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-KEY": n8nApiKey,
        },
        timeout: 30000,
      }
    );

    console.log("📥 Server: N8N BizMiner API response:", response.data);

    return NextResponse.json({
      success: true,
      data: response.data,
    });
  } catch (error: any) {
    console.error("❌ Server: Error calling N8N BizMiner API:", error);

    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          success: false,
          error:
            error.response?.data?.message ||
            error.message ||
            "N8N API request failed",
        },
        { status: error.response?.status || 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
