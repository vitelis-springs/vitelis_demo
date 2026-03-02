import { NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../lib/auth";
import { GeneratedCompanyReportsService } from "./generated-company-reports.service";

export class GeneratedCompanyReportsController {
  static async get(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const { searchParams } = new URL(request.url);
      const idParam = searchParams.get("id");
      const companyIdParam = searchParams.get("companyId");
      const reportIdParam = searchParams.get("reportId");

      if (idParam) {
        const id = Number(idParam);
        if (!Number.isFinite(id)) {
          return NextResponse.json({ error: "id must be a number" }, { status: 400 });
        }

        const report = await GeneratedCompanyReportsService.getById(id);
        if (!report) {
          return NextResponse.json({ error: "Generated report not found" }, { status: 404 });
        }

        return NextResponse.json(report);
      }

      if (companyIdParam && reportIdParam) {
        const companyId = Number(companyIdParam);
        const reportId = Number(reportIdParam);

        if (!Number.isFinite(companyId) || !Number.isFinite(reportId)) {
          return NextResponse.json(
            { error: "companyId and reportId must be numbers" },
            { status: 400 }
          );
        }

        const report = await GeneratedCompanyReportsService.getLatestByCompanyAndReport(
          companyId,
          reportId
        );

        if (!report) {
          return NextResponse.json({ error: "Generated report not found" }, { status: 404 });
        }

        return NextResponse.json(report);
      }

      return NextResponse.json(
        { error: "Either id or companyId+reportId query params are required" },
        { status: 400 }
      );
    } catch (error) {
      console.error("Error in GeneratedCompanyReportsController.get:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  static async generateSellerBriefDocx(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const body = await request.json();
      const id = Number(body?.id);

      if (!Number.isFinite(id)) {
        return NextResponse.json({ error: "id must be a number" }, { status: 400 });
      }

      const { buffer, filename, contentType } =
        await GeneratedCompanyReportsService.generateSellerBriefDocxFromReport(id);

      const uint8Array = new Uint8Array(buffer);

      return new NextResponse(uint8Array, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": buffer.length.toString(),
        },
      });
    } catch (error) {
      console.error("Error in GeneratedCompanyReportsController.generateSellerBriefDocx:", error);
      return NextResponse.json(
        { error: "Failed to generate seller brief DOCX", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
  }
}
