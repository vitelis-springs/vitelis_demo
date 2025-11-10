import { NextRequest, NextResponse } from "next/server";
import {
  AnalysisContent,
  AnalysisData,
  generateAnalysisDocxBuffer,
} from "../../../../lib/docx/docx-generator";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Access token required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Basic JWT validation
    try {
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const payload = JSON.parse(
        atob(tokenParts[1]!.replace(/-/g, "+").replace(/_/g, "/"))
      );

      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }

      console.log("📄 DOCX Export API: Authenticated user:", {
        userId: payload.userId,
        email: payload.email,
      });
    } catch (jwtError) {
      console.error("📄 DOCX Export API: JWT validation failed:", jwtError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { quizData, content, reportType } = body;

    console.log("📄 DOCX Export API: Generating document for:", {
      company: quizData?.companyName,
      reportType,
    });

    // Validate required data
    if (!quizData || !content) {
      return NextResponse.json(
        { error: "Missing required data: quizData and content are required" },
        { status: 400 }
      );
    }

    // Generate DOCX buffer
    const buffer = await generateAnalysisDocxBuffer(
      quizData as AnalysisData,
      content as AnalysisContent,
      reportType || "Bizminer Analysis"
    );

    // Generate filename
    const filename = `${quizData.companyName.replace(/[^a-zA-Z0-9]/g, "_")}_${(
      reportType || "Bizminer Analysis"
    ).replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.docx`;

    console.log("✅ DOCX Export API: Document generated successfully:", {
      filename,
      size: buffer.length,
    });

    // Return the buffer as a downloadable file
    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("❌ Error in POST /api/export/docx:", error);
    return NextResponse.json(
      {
        error: "Failed to generate DOCX document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
