import type { generated_company_reports } from "../../../../generated/prisma";
import { GeneratedCompanyReportsRepository } from "./generated-company-reports.repository";

export class GeneratedCompanyReportsService {
  private static readonly SELLER_BRIEF_DOCX_ENDPOINT = "/seller-brief-docx";

  private static getSellerBriefDocxUrl(): string {
    const base = process.env.VITELIS_EXCEL_MERGER_URL;
    if (!base) {
      throw new Error("VITELIS_EXCEL_MERGER_URL is not configured");
    }
    return `${base.replace(/\/$/, "")}${this.SELLER_BRIEF_DOCX_ENDPOINT}`;
  }

  static async getById(id: number): Promise<generated_company_reports | null> {
    return GeneratedCompanyReportsRepository.findById(id);
  }

  static async getLatestByCompanyAndReport(
    companyId: number,
    reportId: number
  ): Promise<generated_company_reports | null> {
    return GeneratedCompanyReportsRepository.findLatestByCompanyAndReport(companyId, reportId);
  }

  static async generateSellerBriefDocxFromReport(
    id: number
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const report = await GeneratedCompanyReportsRepository.findById(id);
    if (!report) {
      throw new Error("Generated report not found");
    }

    if (report.data === null || report.data === undefined) {
      throw new Error("Generated report data is empty");
    }

    const response = await fetch(this.getSellerBriefDocxUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(report.data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Seller brief service request failed (${response.status}): ${errorText || "No details"}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") ||
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const filename =
      this.extractFilename(response.headers.get("content-disposition")) ||
      `seller-brief-${id}.docx`;

    return {
      buffer: Buffer.from(arrayBuffer),
      filename,
      contentType,
    };
  }

  private static extractFilename(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
      return null;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    return asciiMatch?.[1] ?? null;
  }
}
