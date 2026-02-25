import { NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../lib/auth";
import { report_status_enum } from "../../../../generated/prisma";
import {
  isKpiScoreTier,
  isKpiScoreValue,
  type KpiScoreTier,
  type KpiScoreValue,
} from "../../../../shared/kpi-score";
import {
  DeepDiveService,
  type DeepDiveMetricKey,
  type UpdateCompanyDataPointPayload,
  type ReportSettingsAction,
  type ValidatorSettingsAction,
} from "./deep-dive.service";
import { N8NService } from "../n8n/n8n.service";
import type { SortOrder } from "../../../../types/sorting";

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

function parseSortOrder(value: string | null): SortOrder | undefined {
  if (value === "asc" || value === "desc") return value;
  return undefined;
}

function isDeepDiveMetricKey(value: string): value is DeepDiveMetricKey {
  return (
    value === "companies-count" ||
    value === "orchestrator-status" ||
    value === "total-sources" ||
    value === "used-sources" ||
    value === "total-scrape-candidates" ||
    value === "total-queries"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseReportSettingsAction(value: unknown): ReportSettingsAction | null {
  if (!isRecord(value)) return null;

  if (value.mode === "reuse") {
    if (typeof value.id !== "number" || !Number.isInteger(value.id)) return null;
    return { mode: "reuse", id: value.id };
  }

  if (value.mode !== "create") return null;
  if (value.strategy === "clone") {
    if (
      typeof value.baseId !== "number" ||
      !Number.isInteger(value.baseId) ||
      !isJsonObject(value.settings)
    ) {
      return null;
    }
    return {
      mode: "create",
      strategy: "clone",
      baseId: value.baseId,
      name: typeof value.name === "string" ? value.name : undefined,
      settings: value.settings,
    };
  }

  if (value.strategy === "blank") {
    if (
      typeof value.name !== "string" ||
      typeof value.masterFileId !== "string" ||
      !isJsonObject(value.settings)
    ) {
      return null;
    }
    const prefix =
      value.prefix === undefined || value.prefix === null
        ? null
        : typeof value.prefix === "number" && Number.isInteger(value.prefix)
          ? value.prefix
          : undefined;
    if (prefix === undefined) return null;

    return {
      mode: "create",
      strategy: "blank",
      name: value.name,
      masterFileId: value.masterFileId,
      prefix,
      settings: value.settings,
    };
  }

  return null;
}

function parseValidatorSettingsAction(value: unknown): ValidatorSettingsAction | null {
  if (!isRecord(value)) return null;

  if (value.mode === "reuse") {
    if (typeof value.id !== "number" || !Number.isInteger(value.id)) return null;
    return { mode: "reuse", id: value.id };
  }

  if (value.mode !== "create") return null;
  if (value.strategy === "clone") {
    if (
      typeof value.baseId !== "number" ||
      !Number.isInteger(value.baseId) ||
      !isJsonObject(value.settings)
    ) {
      return null;
    }
    return {
      mode: "create",
      strategy: "clone",
      baseId: value.baseId,
      name: typeof value.name === "string" ? value.name : undefined,
      settings: value.settings,
    };
  }

  if (value.strategy === "blank") {
    if (typeof value.name !== "string" || !isJsonObject(value.settings)) {
      return null;
    }
    return {
      mode: "create",
      strategy: "blank",
      name: value.name,
      settings: value.settings,
    };
  }

  return null;
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
      const sortBy = searchParams.get("sortBy")?.trim() || undefined;
      const sortOrder = parseSortOrder(searchParams.get("sortOrder"));

      const result = await DeepDiveService.listDeepDives({
        limit,
        offset,
        query: query || undefined,
        status: status || undefined,
        useCaseId: useCaseRaw && useCaseRaw > 0 ? useCaseRaw : undefined,
        industryId: industryRaw && industryRaw > 0 ? industryRaw : undefined,
        sortBy,
        sortOrder,
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

  static async getOverview(
    request: NextRequest,
    reportIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report id" },
          { status: 400 }
        );
      }

      const result = await DeepDiveService.getDeepDiveOverview(reportId);
      if (!result) {
        return NextResponse.json(
          { success: false, error: "Deep dive not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ DeepDiveController.getOverview:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch deep dive overview" },
        { status: 500 }
      );
    }
  }

  static async getMetric(
    request: NextRequest,
    reportIdParam: string,
    metricParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report id" },
          { status: 400 }
        );
      }

      if (!isDeepDiveMetricKey(metricParam)) {
        return NextResponse.json(
          { success: false, error: "Invalid metric key" },
          { status: 400 }
        );
      }

      const result = await DeepDiveService.getDeepDiveMetric(reportId, metricParam);
      if (!result) {
        return NextResponse.json(
          { success: false, error: "Deep dive not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ DeepDiveController.getMetric:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch deep dive metric" },
        { status: 500 }
      );
    }
  }

  static async getKpiChart(
    request: NextRequest,
    reportIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report id" },
          { status: 400 }
        );
      }

      const result = await DeepDiveService.getDeepDiveKpiChart(reportId);
      if (!result) {
        return NextResponse.json(
          { success: false, error: "Deep dive not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ DeepDiveController.getKpiChart:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch deep dive KPI chart" },
        { status: 500 }
      );
    }
  }

  static async getCompaniesTable(
    request: NextRequest,
    reportIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report id" },
          { status: 400 }
        );
      }

      const result = await DeepDiveService.getDeepDiveCompaniesTable(reportId);
      if (!result) {
        return NextResponse.json(
          { success: false, error: "Deep dive not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ DeepDiveController.getCompaniesTable:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch deep dive companies" },
        { status: 500 }
      );
    }
  }

  static async getSettings(
    request: NextRequest,
    reportIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report id" },
          { status: 400 }
        );
      }

      const result = await DeepDiveService.getSettings(reportId);
      if (!result) {
        return NextResponse.json(
          { success: false, error: "Deep dive not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ DeepDiveController.getSettings:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch deep dive settings" },
        { status: 500 }
      );
    }
  }

  static async updateSettings(
    request: NextRequest,
    reportIdParam: string
  ): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report id" },
          { status: 400 }
        );
      }

      const body = (await request.json()) as unknown;
      if (!isRecord(body)) {
        return NextResponse.json(
          { success: false, error: "Body must be an object" },
          { status: 400 }
        );
      }

      const parsedReportAction =
        body.reportSettingsAction === undefined
          ? undefined
          : parseReportSettingsAction(body.reportSettingsAction);
      if (body.reportSettingsAction !== undefined && !parsedReportAction) {
        return NextResponse.json(
          { success: false, error: "Invalid reportSettingsAction format" },
          { status: 400 }
        );
      }

      const parsedValidatorAction =
        body.validatorSettingsAction === undefined
          ? undefined
          : parseValidatorSettingsAction(body.validatorSettingsAction);
      if (body.validatorSettingsAction !== undefined && !parsedValidatorAction) {
        return NextResponse.json(
          { success: false, error: "Invalid validatorSettingsAction format" },
          { status: 400 }
        );
      }

      const reportSettingsAction = parsedReportAction ?? undefined;
      const validatorSettingsAction = parsedValidatorAction ?? undefined;

      const result = await DeepDiveService.updateSettings(reportId, {
        reportSettingsAction,
        validatorSettingsAction,
      });

      if (!result.success) {
        const error =
          "error" in result && typeof result.error === "string"
            ? result.error
            : "Failed to update deep dive settings";
        const status = error === "Deep dive not found" ? 404 : 400;
        return NextResponse.json({ success: false, error }, { status });
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ DeepDiveController.updateSettings:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update deep dive settings" },
        { status: 500 }
      );
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

  static async updateCompanyDataPoint(
    request: NextRequest,
    reportIdParam: string,
    companyIdParam: string,
    resultIdParam: string,
  ) {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      const companyId = Number(companyIdParam);
      const resultId = Number(resultIdParam);

      if (!Number.isFinite(reportId) || !Number.isFinite(companyId) || !Number.isFinite(resultId)) {
        return NextResponse.json(
          { success: false, error: "Invalid report/company/result id" },
          { status: 400 },
        );
      }

      const body = (await request.json()) as unknown;
      if (!isRecord(body)) {
        return NextResponse.json(
          { success: false, error: "Body must be an object" },
          { status: 400 },
        );
      }

      const payload: UpdateCompanyDataPointPayload = {};

      if ("reasoning" in body) {
        if (body.reasoning !== null && typeof body.reasoning !== "string") {
          return NextResponse.json(
            { success: false, error: "reasoning must be a string or null" },
            { status: 400 },
          );
        }
        payload.reasoning = body.reasoning as string | null;
      }

      if ("sources" in body) {
        if (body.sources !== null && typeof body.sources !== "string") {
          return NextResponse.json(
            { success: false, error: "sources must be a string or null" },
            { status: 400 },
          );
        }
        payload.sources = body.sources as string | null;
      }

      if ("score" in body) {
        const score = body.score;
        if (
          score !== null &&
          typeof score !== "string" &&
          typeof score !== "number"
        ) {
          return NextResponse.json(
            { success: false, error: "score must be a string, number, or null" },
            { status: 400 },
          );
        }
        payload.score = score as string | number | null;
      }

      if ("scoreValue" in body) {
        const scoreValue = body.scoreValue;
        if (scoreValue !== null && !isKpiScoreValue(scoreValue)) {
          return NextResponse.json(
            { success: false, error: "scoreValue must be an integer from 1 to 5 or null" },
            { status: 400 },
          );
        }
        payload.scoreValue = scoreValue as KpiScoreValue | null;
      }

      if ("scoreTier" in body) {
        const scoreTier = body.scoreTier;
        if (scoreTier !== null && !isKpiScoreTier(scoreTier)) {
          return NextResponse.json(
            { success: false, error: "scoreTier must be one of: Low, Low-Medium, Medium, Medium-High, High, or null" },
            { status: 400 },
          );
        }
        payload.scoreTier = scoreTier as KpiScoreTier | null;
      }

      if ("status" in body) {
        if (typeof body.status !== "boolean") {
          return NextResponse.json(
            { success: false, error: "status must be a boolean" },
            { status: 400 },
          );
        }
        payload.status = body.status;
      }

      if (Object.keys(payload).length === 0) {
        return NextResponse.json(
          { success: false, error: "At least one field is required" },
          { status: 400 },
        );
      }

      const result = await DeepDiveService.updateCompanyDataPoint(
        reportId,
        companyId,
        resultId,
        payload,
      );

      if (!result) {
        return NextResponse.json(
          { success: false, error: "Data point result not found in report/company" },
          { status: 404 },
        );
      }

      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ DeepDiveController.updateCompanyDataPoint:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update data point" },
        { status: 500 },
      );
    }
  }

  static async getSourcesAnalytics(
    request: NextRequest,
    reportIdParam: string,
    companyIdParam: string,
  ) {
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
        Math.max(toNumber(searchParams.get("limit")) ?? DEFAULT_LIMIT, 1),
        MAX_LIMIT,
      );
      const offset = Math.max(toNumber(searchParams.get("offset")) ?? 0, 0);
      const tier = toNumber(searchParams.get("tier"));
      const qualityClass = searchParams.get("qualityClass")?.trim() || undefined;
      const isValid = toBoolean(searchParams.get("isValid"));
      const agent = searchParams.get("agent")?.trim() || undefined;
      const category = searchParams.get("category")?.trim() || undefined;
      const tag = searchParams.get("tag")?.trim() || undefined;
      const dateFrom = parseDate(searchParams.get("dateFrom"));
      const dateTo = parseDate(searchParams.get("dateTo"));
      const search = searchParams.get("search")?.trim() || undefined;
      const sortBy = searchParams.get("sortBy")?.trim() || undefined;
      const sortOrder = parseSortOrder(searchParams.get("sortOrder"));

      const result = await DeepDiveService.getSourcesAnalytics(reportId, companyId, {
        limit,
        offset,
        tier: tier ?? undefined,
        qualityClass,
        isValid: isValid ?? undefined,
        agent,
        category,
        tag,
        dateFrom: dateFrom ?? undefined,
        dateTo: dateTo ?? undefined,
        search,
        sortBy,
        sortOrder,
      });

      if (!result) {
        return NextResponse.json({ success: false, error: "Company not found in report" }, { status: 404 });
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ DeepDiveController.getSourcesAnalytics:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch sources analytics" }, { status: 500 });
    }
  }

  static async getQueries(request: NextRequest, reportIdParam: string) {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json({ success: false, error: "Invalid report id" }, { status: 400 });
      }

      const { searchParams } = new URL(request.url);
      const sortBy = searchParams.get("sortBy")?.trim() || undefined;
      const sortOrder = parseSortOrder(searchParams.get("sortOrder"));

      const result = await DeepDiveService.getReportQueries(reportId, {
        sortBy,
        sortOrder,
      });
      if (!result) {
        return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ DeepDiveController.getQueries:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch report queries" }, { status: 500 });
    }
  }

  static async updateQuery(
    request: NextRequest,
    reportIdParam: string,
    queryIdParam: string,
  ) {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      const queryId = Number(queryIdParam);

      if (!Number.isFinite(reportId) || !Number.isFinite(queryId)) {
        return NextResponse.json({ success: false, error: "Invalid report/query id" }, { status: 400 });
      }

      const body = await request.json() as { goal?: string; searchQueries?: string[] };

      if (typeof body.goal !== "string" || !Array.isArray(body.searchQueries)) {
        return NextResponse.json(
          { success: false, error: "Body must include goal (string) and searchQueries (string[])" },
          { status: 400 },
        );
      }

      const result = await DeepDiveService.updateQuery(reportId, queryId, {
        goal: body.goal,
        searchQueries: body.searchQueries,
      });

      if (!result) {
        return NextResponse.json({ success: false, error: "Query not found in report" }, { status: 404 });
      }

      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ DeepDiveController.updateQuery:", error);
      return NextResponse.json({ success: false, error: "Failed to update query" }, { status: 500 });
    }
  }

  static async getScrapeCandidates(
    request: NextRequest,
    reportIdParam: string,
    companyIdParam: string,
  ) {
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
        Math.max(toNumber(searchParams.get("limit")) ?? DEFAULT_LIMIT, 1),
        MAX_LIMIT,
      );
      const offset = Math.max(toNumber(searchParams.get("offset")) ?? 0, 0);
      const search = searchParams.get("search")?.trim() || undefined;
      const sortBy = searchParams.get("sortBy")?.trim() || undefined;
      const sortOrder = parseSortOrder(searchParams.get("sortOrder"));

      const result = await DeepDiveService.getScrapeCandidates(reportId, companyId, {
        limit,
        offset,
        search,
        sortBy,
        sortOrder,
      });

      if (!result) {
        return NextResponse.json({ success: false, error: "Company not found in report" }, { status: 404 });
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error("❌ DeepDiveController.getScrapeCandidates:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch scrape candidates" }, { status: 500 });
    }
  }

  static async exportReport(request: NextRequest, reportIdParam: string): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json({ success: false, error: "Invalid report id" }, { status: 400 });
      }

      const n8nResponse = await N8NService.exportGroupedReport(reportId);

      return new NextResponse(n8nResponse.body, {
        headers: {
          "Content-Type":
            n8nResponse.headers.get("Content-Type") ||
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition":
            n8nResponse.headers.get("Content-Disposition") ||
            `attachment; filename="report-${reportId}.xlsx"`,
        },
      });
    } catch (error) {
      console.error("❌ DeepDiveController.exportReport:", error);
      return NextResponse.json({ success: false, error: "Failed to export report" }, { status: 500 });
    }
  }

  static async tryQuery(request: NextRequest, reportIdParam: string): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const reportId = Number(reportIdParam);
      if (!Number.isFinite(reportId)) {
        return NextResponse.json({ success: false, error: "Invalid report id" }, { status: 400 });
      }

      const body = (await request.json()) as {
        query: string;
        company_id: number;
        metadata_filters?: Record<string, unknown>;
      };

      if (!body.query || typeof body.query !== "string" || !body.query.trim()) {
        return NextResponse.json({ success: false, error: "Query must be a non-empty string" }, { status: 400 });
      }

      if (!Number.isFinite(body.company_id)) {
        return NextResponse.json({ success: false, error: "company_id must be a valid number" }, { status: 400 });
      }

      const filters: Record<string, unknown> = {
        ...body.metadata_filters,
        company_id: body.company_id,
      };

      const result = await N8NService.tryQuery(body.query.trim(), filters);

      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      console.error("❌ DeepDiveController.tryQuery:", error);
      return NextResponse.json({ success: false, error: "Failed to execute query" }, { status: 500 });
    }
  }
}
