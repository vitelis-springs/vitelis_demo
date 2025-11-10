import { useAuthStore } from "../stores/auth-store";
import type { AnalysisContent, AnalysisData } from "./docx/docx-generator";

/**
 * Client-side DOCX export utilities
 * These functions call the server API to generate DOCX files
 */

// Re-export types for convenience
export type { AnalysisContent, AnalysisData } from "./docx/docx-generator";

/**
 * Client-side function to export analysis report as DOCX
 * Calls the server API to generate the document
 */
export async function exportAnalysisReportDocx(
  quizData: AnalysisData,
  content: AnalysisContent,
  reportType: "Bizminer Analysis" | "SalesMiner Analysis" = "Bizminer Analysis"
): Promise<void> {
  try {
    // Get token from auth store
    const authToken = useAuthStore.getState().token;
    if (!authToken) {
      throw new Error("Authentication token not found. Please log in again.");
    }

    console.log("📄 Client: Requesting DOCX export for:", {
      company: quizData.companyName,
      reportType,
    });

    // Call the server API
    const response = await fetch("/api/export/docx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        quizData,
        content,
        reportType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate DOCX");
    }

    // Get the blob from response
    const blob = await response.blob();

    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = `${quizData.companyName.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_${reportType.replace(/\s+/g, "_")}_${
      new Date().toISOString().split("T")[0]
    }.docx`;

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }

    console.log("✅ Client: DOCX received, downloading:", filename);

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log("✅ Client: Download initiated successfully");
  } catch (error) {
    console.error("❌ Client: Error exporting to DOCX:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to export document"
    );
  }
}

/**
 * Helper function to convert analysis data to the format expected by the API
 */
export function prepareAnalysisData(rawData: any): {
  quizData: AnalysisData;
  content: AnalysisContent;
} {
  return {
    quizData: {
      companyName: rawData.companyName || rawData.company || "Unknown Company",
      businessLine: rawData.businessLine || rawData.business || "N/A",
      country: rawData.country || "N/A",
      useCase: rawData.useCase || "N/A",
      timeline: rawData.timeline || "N/A",
      language: rawData.language,
      additionalInformation: rawData.additionalInformation || rawData.notes,
    },
    content: {
      summary: rawData.summary || rawData.executiveSummary,
      kpiScorecard: rawData.kpiScorecard,
      narrativeFindings: rawData.narrativeFindings,
      improvementLevers: rawData.improvementLevers,
      improvementLeverages:
        rawData.improvementLeverages || rawData.recommendations,
      headToHead: rawData.headToHead || rawData.competitiveAnalysis,
      sources: rawData.sources || rawData.references,
    },
  };
}
