import { NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../lib/auth";
import { report_status_enum } from "../../../../generated/prisma";
import { DeepDiveService } from "./deep-dive.service";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function toNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value: string | null) {
  if (value === null) return null;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseStatus(value: string | null) {
  if (!value) return null;
  const normalized = value.toUpperCase();
  return Object.values(report_status_enum).includes(normalized as report_status_enum)
    ? (normalized as report_status_enum)
    : null;
}

export class DeepDiveController {
  static async list(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const { searchParams } = new URL(request.url);
      const limit = Math.min(
        Math.max(toNumber(searchParams.get("limit")) ?? DEFAULT_LIMIT, 1),
        MAX_LIMIT
      );
      const offset = Math.max(toNumber(searchParams.get("offset")) ?? 0, 0);
      const query = searchParams.get("q")?.trim();
      const status = parseStatus(searchParams.get("status"));
      const useCaseRaw = toNumber(searchParams.get("useCaseId"));
      const industryRaw = toNumber(searchParams.get("industryId"));

      const result = await DeepDiveService.listDeepDives({
        limit,
        offset,
        query: query || undefined,
        status: status || undefined,
        useCaseId: useCaseRaw && useCaseRaw > 0 ? useCaseRaw : undefined,
        industryId: industryRaw && industryRaw > 0 ? industryRaw : undefined,
      });

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ DeepDiveController.list:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch deep dives" }, { status: 500 });
    }
  }

  static async getById(request: NextRequest, id: string): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(id);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json({ success: false, error: "Invalid report id" }, { status: 400 });
      }

      const result = await DeepDiveService.getDeepDiveById(reportId);
      if (!result) {
        return NextResponse.json({ success: false, error: "Deep dive not found" }, { status: 404 });
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ DeepDiveController.getById:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch deep dive" }, { status: 500 });
    }
  }

  static async getCompany(request: NextRequest, reportIdParam: string, companyIdParam: string) {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      const companyId = Number(companyIdParam);

      if (!Number.isFinite(reportId) || !Number.isFinite(companyId)) {
        return NextResponse.json({ success: false, error: "Invalid report/company id" }, { status: 400 });
      }

      const { searchParams } = new URL(request.url);
      const limit = Math.min(
        Math.max(toNumber(searchParams.get("sourcesLimit")) ?? DEFAULT_LIMIT, 1),
        MAX_LIMIT
      );
      const offset = Math.max(toNumber(searchParams.get("sourcesOffset")) ?? 0, 0);
      const tier = toNumber(searchParams.get("tier"));
      const isVectorized = toBoolean(searchParams.get("isVectorized"));
      const dateFrom = parseDate(searchParams.get("dateFrom"));
      const dateTo = parseDate(searchParams.get("dateTo"));
      const metaKey = searchParams.get("metaKey")?.trim() || undefined;
      const metaValue = searchParams.get("metaValue")?.trim();
      const metaGroupBy = searchParams.get("metaGroupBy")?.trim() || undefined;

      const result = await DeepDiveService.getCompanyDeepDive(reportId, companyId, {
        limit,
        offset,
        tier: tier ?? undefined,
        isVectorized: isVectorized ?? undefined,
        dateFrom: dateFrom ?? undefined,
        dateTo: dateTo ?? undefined,
        metaKey,
        metaValue: metaValue ?? undefined,
        metaGroupBy,
      });

      if (!result) {
        return NextResponse.json({ success: false, error: "Company not found in report" }, { status: 404 });
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ DeepDiveController.getCompany:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch company deep dive" }, { status: 500 });
    }
  }
}
