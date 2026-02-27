import type { generated_company_reports } from "../../../../generated/prisma";
import { GeneratedCompanyReportsRepository } from "./generated-company-reports.repository";

export class GeneratedCompanyReportsService {
  private static readonly PRESIGNED_URL_ENDPOINT = "/generate-presigned-url";

  private static getExcelMergerBaseUrl(): string {
    const base = process.env.VITELIS_EXCEL_MERGER_URL;
    if (!base) {
      throw new Error("VITELIS_EXCEL_MERGER_URL is not configured");
    }
    return base.replace(/\/$/, "");
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

    const docxFile = this.findDocxInFiles(report.files);
    if (!docxFile) {
      throw new Error("No DOCX file found in report files");
    }

    const presignedUrl = await this.fetchPresignedUrl(docxFile);
    const buffer = await this.fetchFileFromUrl(presignedUrl);

    const contentType =
      docxFile.contentType ||
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const filename = docxFile.name || `seller-brief-${id}.docx`;

    return {
      buffer,
      filename,
      contentType,
    };
  }

  private static findDocxInFiles(
    filesJson: unknown
  ): { url: string; name?: string; contentType?: string; key?: string; bucket?: string } | null {
    if (!filesJson || typeof filesJson !== "object") {
      return null;
    }

    const obj = filesJson as Record<string, unknown>;
    const files = obj.files;
    if (!Array.isArray(files)) {
      return null;
    }

    const docxMime =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const docx = files.find(
      (f: Record<string, unknown>) => {
        const ct = (f.contentType ?? f.content_type)?.toString?.();
        const name = (f.name ?? f.filename)?.toString?.() ?? "";
        const urlStr = f.url?.toString?.() ?? "";
        return (
          ct?.toLowerCase() === docxMime ||
          name.toLowerCase().endsWith(".docx") ||
          urlStr.toLowerCase().endsWith(".docx")
        );
      }
    );

    if (!docx?.url) {
      return null;
    }

    const d = docx as Record<string, unknown>;
    return {
      url: String(d.url),
      name: (d.name ?? d.filename)?.toString(),
      contentType: (d.contentType ?? d.content_type)?.toString(),
      key: d.key?.toString(),
      bucket: d.bucket?.toString(),
    };
  }

  private static async fetchPresignedUrl(docxFile: {
    url: string;
    key?: string;
    bucket?: string;
  }): Promise<string> {
    const base = this.getExcelMergerBaseUrl();
    const url = `${base}${this.PRESIGNED_URL_ENDPOINT}`;

    const body: Record<string, unknown> = {
      object_key: docxFile.key ?? docxFile.url,
      expiration: 3600,
    };
    if (docxFile.bucket) {
      body.bucket = docxFile.bucket;
    }

    console.log("[generate-presigned-url] request:", { url, body });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-presigned-url] failed:", response.status, errorText);
      throw new Error(
        `Presigned URL request failed (${response.status}): ${errorText || "No details"}`
      );
    }

    const json = (await response.json()) as { presigned_url?: string; expires_in?: number; key?: string; bucket?: string };
    console.log("[generate-presigned-url] response:", {
      presigned_url: json.presigned_url ? `${json.presigned_url.slice(0, 80)}...` : undefined,
      presigned_url_full: json.presigned_url,
      expires_in: json.expires_in,
      key: json.key,
      bucket: json.bucket,
    });

    if (!json.presigned_url) {
      throw new Error("Presigned URL response missing presigned_url");
    }

    return json.presigned_url;
  }

  private static async fetchFileFromUrl(url: string): Promise<Buffer> {
    console.log("[fetch-presigned-file] url:", url.slice(0, 120) + (url.length > 120 ? "..." : ""));
    const response = await fetch(url);
    console.log("[fetch-presigned-file] status:", response.status, response.statusText);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[fetch-presigned-file] error body:", errorBody.slice(0, 500));
      throw new Error(`Failed to fetch file (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
