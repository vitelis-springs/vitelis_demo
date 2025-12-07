import { NextRequest, NextResponse } from "next/server";

const SALESMINER_PATH_V1 = "webhook/v1/salesminer";

/**
 * POST /api/n8n/workflow/salesminer/start
 * Starts a SalesMiner workflow on N8N
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
      url,
      competitors,
    } = body;

    // Validate required fields
    if (
      !companyName ||
      !businessLine ||
      !country ||
      !useCase ||
      !timeline ||
      !language
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: companyName, businessLine, country, useCase, timeline, language",
        },
        { status: 400 }
      );
    }

    // Get N8N configuration from environment
    const n8nSalesMinerUrl = process.env.N8N_SALESMINER_URL;
    const n8nApiKey =
      process.env.N8N_SALESMINER_API_KEY || process.env.N8N_API_KEY;

    if (!n8nSalesMinerUrl || !n8nApiKey) {
      console.error("❌ Server: N8N SalesMiner configuration missing");
      return NextResponse.json(
        { success: false, error: "N8N SalesMiner configuration not found" },
        { status: 500 }
      );
    }

    const triggerUrl = `${n8nSalesMinerUrl}${SALESMINER_PATH_V1}`;

    console.log("🌐 Server: Making N8N SalesMiner API request to:", triggerUrl);
    console.log("📤 Server: Request data:", {
      companyName,
      url,
      competitors,
      businessLine,
      country,
      useCase,
      timeline,
      language,
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

      // Check if N8N returned executionId
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
    console.error("❌ Server: Error calling N8N SalesMiner API:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "N8N API request failed",
      },
      { status: 500 }
    );
  }
}
