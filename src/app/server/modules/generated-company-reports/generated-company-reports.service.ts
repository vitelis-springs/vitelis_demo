import type { generated_company_reports } from "../../../../generated/prisma";
import { GeneratedCompanyReportsRepository } from "./generated-company-reports.repository";
import { AWSS3Service } from "../../../../lib/aws-s3";

export class GeneratedCompanyReportsService {

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
    const key = this.resolveS3Key(docxFile);
    return AWSS3Service.getPresignedUrl(key);
  }

  private static resolveS3Key(docxFile: { url: string; key?: string }): string {
    if (docxFile.key) {
      return docxFile.key;
    }

    const rawUrl = docxFile.url;
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new Error(`Invalid DOCX file url: ${rawUrl}`);
    }

    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      throw new Error("AWS_S3_BUCKET is not configured");
    }

    const path = parsed.pathname.replace(/^\/+/, "");

    if (path.startsWith(`${bucket}/`)) {
      return path.slice(bucket.length + 1);
    }

    return path;
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
