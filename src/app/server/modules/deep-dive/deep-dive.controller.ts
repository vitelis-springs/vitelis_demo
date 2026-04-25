/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanatфівion> */
import { type NextRequest, NextResponse } from "next/server";
import { Prisma, report_status_enum } from "../../../../generated/prisma";
import { extractAdminFromRequest } from "../../../../lib/auth";
import {
	isKpiScoreTier,
	isKpiScoreValue,
	type KpiScoreTier,
	type KpiScoreValue,
} from "../../../../shared/kpi-score";
import type { SortOrder } from "../../../../types/sorting";
import { N8NService } from "../n8n/n8n.service";
import {
	type CreateReportModelItemPayload,
	type DeepDiveMetricKey,
	DeepDiveService,
	type ReportModelImportRow,
	type UpdateCompanyDataPointPayload,
	type UpdateReportModelItemPayload,
} from "./deep-dive.service";
import { ValidationController } from "./validation/validation.controller";

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
	return Object.values(report_status_enum).includes(
		normalized as report_status_enum,
	)
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

function parseReportModelRows(value: unknown): ReportModelImportRow[] | null {
	if (!Array.isArray(value)) return null;

	const rows: ReportModelImportRow[] = [];
	for (const entry of value) {
		if (!isRecord(entry) || typeof entry.dataPointId !== "string") {
			return null;
		}

		if (
			entry.includeToReport !== undefined &&
			typeof entry.includeToReport !== "boolean"
		) {
			return null;
		}

		rows.push({
			dataPointId: entry.dataPointId,
			includeToReport: entry.includeToReport,
		});
	}

	return rows;
}

function parseUpdateReportModelItemPayload(
	value: unknown,
): UpdateReportModelItemPayload | null {
	if (!isRecord(value) || typeof value.dataPointId !== "string") {
		return null;
	}

	if (
		value.name !== undefined &&
		value.name !== null &&
		typeof value.name !== "string"
	) {
		return null;
	}

	if (value.settings !== undefined && !isJsonObject(value.settings)) {
		return null;
	}

	return {
		dataPointId: value.dataPointId,
		name: value.name === undefined ? undefined : (value.name as string | null),
		settings: value.settings as Record<string, unknown> | undefined,
	};
}

function parseCreateReportModelItemPayload(
	value: unknown,
): CreateReportModelItemPayload | null {
	if (
		!isRecord(value) ||
		typeof value.dataPointId !== "string" ||
		typeof value.type !== "string" ||
		!isJsonObject(value.settings)
	) {
		return null;
	}

	if (
		value.name !== undefined &&
		value.name !== null &&
		typeof value.name !== "string"
	) {
		return null;
	}

	return {
		dataPointId: value.dataPointId,
		type: value.type,
		name: value.name === undefined ? undefined : (value.name as string | null),
		settings: value.settings as Record<string, unknown>,
	};
}

function serializeError(error: unknown): Record<string, unknown> {
	if (!(error instanceof Error)) {
		return { message: String(error) };
	}

	const details: Record<string, unknown> = {
		name: error.name,
		message: error.message,
		stack: error.stack,
	};

	const withCode = error as Error & { code?: unknown; meta?: unknown };
	if (withCode.code !== undefined) details.code = withCode.code;
	if (withCode.meta !== undefined) details.meta = withCode.meta;

	return details;
}

export class DeepDiveController {
	static async getReportCloneData(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const data = await DeepDiveService.getReportCloneData(reportId);
			if (!data) {
				return NextResponse.json(
					{ success: false, error: "Not found" },
					{ status: 404 },
				);
			}

			return NextResponse.json({ success: true, data });
		} catch (error) {
			console.error("❌ DeepDiveController.getReportCloneData:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to get clone data" },
				{ status: 500 },
			);
		}
	}

	static async getNextReportId(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const { _max } = await (
				await import("../../../../lib/prisma")
			).default.reports.aggregate({ _max: { id: true } });
			return NextResponse.json({
				success: true,
				data: { nextId: (_max.id ?? 0) + 1 },
			});
		} catch (error) {
			console.error("❌ DeepDiveController.getNextReportId:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to get next report id" },
				{ status: 500 },
			);
		}
	}

	static async createReport(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const body = await request.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return NextResponse.json(
					{ success: false, error: "Invalid request body" },
					{ status: 400 },
				);
			}

			const VALID_REPORT_TYPES = ["biz_miner", "sales_miner", "internal"];
			const {
				name,
				description,
				useCaseId,
				reportType,
				reportSettings,
				sourceValidationSettings,
				cloneFromId,
				cloneOptions,
			} = body as Record<string, unknown>;

			if (typeof name !== "string" || !name.trim()) {
				return NextResponse.json(
					{ success: false, error: "name is required" },
					{ status: 400 },
				);
			}
			if (
				typeof reportType !== "string" ||
				!VALID_REPORT_TYPES.includes(reportType)
			) {
				return NextResponse.json(
					{ success: false, error: "Invalid reportType" },
					{ status: 400 },
				);
			}

			const toRecord = (v: unknown): Record<string, unknown> | null =>
				typeof v === "object" && v !== null
					? (v as Record<string, unknown>)
					: null;

			const rs = toRecord(reportSettings);
			const svs = toRecord(sourceValidationSettings);

			const cloneOpts = toRecord(cloneOptions);

			const result = await DeepDiveService.createReport({
				name: name.trim(),
				description:
					typeof description === "string" ? description.trim() : undefined,
				useCaseId:
					typeof useCaseId === "number" && useCaseId > 0
						? useCaseId
						: undefined,
				reportType,
				reportSettings:
					rs && typeof rs.name === "string"
						? {
								name: rs.name,
								masterFileId:
									typeof rs.masterFileId === "string" ? rs.masterFileId : "",
								prefix: typeof rs.prefix === "number" ? rs.prefix : undefined,
								settings:
									typeof rs.settings === "object" && rs.settings !== null
										? (rs.settings as object)
										: {},
							}
						: undefined,
				sourceValidationSettings:
					svs && typeof svs.name === "string"
						? {
								name: svs.name,
								settings:
									typeof svs.settings === "object" && svs.settings !== null
										? (svs.settings as object)
										: {},
							}
						: undefined,
				cloneFromId: typeof cloneFromId === "number" ? cloneFromId : undefined,
				cloneOptions: cloneOpts
					? {
							orchestrator: cloneOpts.orchestrator === true,
							kpiModel: cloneOpts.kpiModel === true,
							companies: cloneOpts.companies === true,
						}
					: undefined,
			});

			return NextResponse.json(
				{ success: true, data: result },
				{ status: 201 },
			);
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				return NextResponse.json(
					{ success: false, error: "ID_CONFLICT" },
					{ status: 409 },
				);
			}
			console.error("❌ DeepDiveController.createReport:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to create report" },
				{ status: 500 },
			);
		}
	}

	static async list(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const { searchParams } = new URL(request.url);
			const limit = Math.min(
				Math.max(toNumber(searchParams.get("limit")) ?? DEFAULT_LIMIT, 1),
				MAX_LIMIT,
			);
			const offset = Math.max(toNumber(searchParams.get("offset")) ?? 0, 0);
			const query = searchParams.get("q")?.trim();
			const status = parseStatus(searchParams.get("status"));
			const useCaseRaw = toNumber(searchParams.get("useCaseId"));
			const industryRaw = toNumber(searchParams.get("industryId"));
			const sortBy = searchParams.get("sortBy")?.trim() || undefined;
			const sortOrder = parseSortOrder(searchParams.get("sortOrder"));
			const reportTypeRaw = searchParams.get("reportType")?.trim();
			const VALID_REPORT_TYPES = ["biz_miner", "sales_miner", "internal"];
			const reportType =
				reportTypeRaw && VALID_REPORT_TYPES.includes(reportTypeRaw)
					? reportTypeRaw
					: undefined;

			const result = await DeepDiveService.listDeepDives({
				limit,
				offset,
				query: query || undefined,
				status: status || undefined,
				useCaseId: useCaseRaw && useCaseRaw > 0 ? useCaseRaw : undefined,
				industryId: industryRaw && industryRaw > 0 ? industryRaw : undefined,
				reportType,
				sortBy,
				sortOrder,
			});

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.list:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch deep dives" },
				{ status: 500 },
			);
		}
	}

	static async getById(
		request: NextRequest,
		id: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(id);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.getDeepDiveById(reportId);
			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Deep dive not found" },
					{ status: 404 },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.getById:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch deep dive" },
				{ status: 500 },
			);
		}
	}

	static async getOverview(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.getDeepDiveOverview(reportId);
			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Deep dive not found" },
					{ status: 404 },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.getOverview:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch deep dive overview" },
				{ status: 500 },
			);
		}
	}

	static async getMetric(
		request: NextRequest,
		reportIdParam: string,
		metricParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			if (!isDeepDiveMetricKey(metricParam)) {
				return NextResponse.json(
					{ success: false, error: "Invalid metric key" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.getDeepDiveMetric(
				reportId,
				metricParam,
			);
			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Deep dive not found" },
					{ status: 404 },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.getMetric:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch deep dive metric" },
				{ status: 500 },
			);
		}
	}

	static async getKpiChart(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.getDeepDiveKpiChart(reportId);
			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Deep dive not found" },
					{ status: 404 },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.getKpiChart:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch deep dive KPI chart" },
				{ status: 500 },
			);
		}
	}

	static async getCompaniesTable(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		const startedAt = Date.now();
		const requestId = request.headers.get("x-request-id");
		const endpointContext = {
			endpoint: "/api/deep-dive/[id]/companies",
			method: request.method,
			pathname: request.nextUrl.pathname,
			reportIdParam,
			requestId,
			hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
		};

		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) {
				console.warn("⚠️ DeepDiveController.getCompaniesTable auth failed", {
					...endpointContext,
					status: auth.response.status,
					durationMs: Date.now() - startedAt,
				});
				return auth.response;
			}

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				console.warn(
					"⚠️ DeepDiveController.getCompaniesTable invalid report id",
					{
						...endpointContext,
						status: 400,
						durationMs: Date.now() - startedAt,
					},
				);
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.getDeepDiveCompaniesTable(reportId);
			if (!result) {
				console.warn(
					"⚠️ DeepDiveController.getCompaniesTable deep dive not found",
					{
						...endpointContext,
						reportId,
						status: 404,
						durationMs: Date.now() - startedAt,
					},
				);
				return NextResponse.json(
					{ success: false, error: "Deep dive not found" },
					{ status: 404 },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.getCompaniesTable failed", {
				...endpointContext,
				status: 500,
				durationMs: Date.now() - startedAt,
				error: serializeError(error),
			});
			return NextResponse.json(
				{ success: false, error: "Failed to fetch deep dive companies" },
				{ status: 500 },
			);
		}
	}

	static async getSettings(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.getSettings(reportId);
			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Deep dive not found" },
					{ status: 404 },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.getSettings:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch deep dive settings" },
				{ status: 500 },
			);
		}
	}

	static async updateSettings(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
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

			const { reportInfo, reportSettings, validatorSettings } = body;

			if (
				!isRecord(reportInfo) ||
				typeof reportInfo.name !== "string" ||
				!isRecord(reportSettings) ||
				!isJsonObject(reportSettings.settings) ||
				!isRecord(validatorSettings) ||
				!isJsonObject(validatorSettings.settings)
			) {
				return NextResponse.json(
					{ success: false, error: "Invalid payload" },
					{ status: 400 },
				);
			}

			const prefix =
				reportSettings.prefix === undefined || reportSettings.prefix === null
					? null
					: typeof reportSettings.prefix === "number" &&
							Number.isInteger(reportSettings.prefix)
						? reportSettings.prefix
						: undefined;

			if (prefix === undefined) {
				return NextResponse.json(
					{ success: false, error: "prefix must be an integer or null" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.updateSettings(reportId, {
				reportInfo: {
					name: reportInfo.name,
					description:
						typeof reportInfo.description === "string"
							? reportInfo.description
							: null,
					useCaseId:
						reportInfo.useCaseId === null || reportInfo.useCaseId === undefined
							? null
							: typeof reportInfo.useCaseId === "number"
								? reportInfo.useCaseId
								: null,
				},
				reportSettings: {
					name:
						typeof reportSettings.name === "string"
							? reportSettings.name
							: undefined,
					masterFileId:
						typeof reportSettings.masterFileId === "string"
							? reportSettings.masterFileId
							: undefined,
					prefix,
					settings: reportSettings.settings as Record<string, unknown>,
				},
				validatorSettings: {
					name:
						typeof validatorSettings.name === "string"
							? validatorSettings.name
							: undefined,
					settings: validatorSettings.settings as Record<string, unknown>,
				},
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
				{ status: 500 },
			);
		}
	}

	static async getModel(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.getReportModel(reportId);
			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Deep dive not found" },
					{ status: 404 },
				);
			}

			if (!result.success) {
				return NextResponse.json(
					{ success: false, error: result.error },
					{ status: 400 },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.getModel:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch report model" },
				{ status: 500 },
			);
		}
	}

	static async replaceModel(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const body = (await request.json().catch(() => null)) as unknown;
			if (!isRecord(body)) {
				return NextResponse.json(
					{ success: false, error: "Body must be an object" },
					{ status: 400 },
				);
			}

			const rows = parseReportModelRows(body.rows);
			if (!rows) {
				return NextResponse.json(
					{ success: false, error: "Invalid rows payload" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.replaceReportModel(reportId, rows);
			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Deep dive not found" },
					{ status: 404 },
				);
			}

			if (!result.success) {
				const status = result.error === "Deep dive not found" ? 404 : 400;
				return NextResponse.json(
					{
						success: false,
						error: result.error,
						details: "details" in result ? result.details : undefined,
					},
					{ status },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.replaceModel:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to replace report model" },
				{ status: 500 },
			);
		}
	}

	static async importModel(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const body = (await request.json().catch(() => null)) as unknown;
			if (!isRecord(body) || !Array.isArray(body.dataPoints)) {
				return NextResponse.json(
					{ success: false, error: "Body must be { dataPoints: [...] }" },
					{ status: 400 },
				);
			}

			const dataPoints = (body.dataPoints as unknown[]).filter(
				(
					item,
				): item is {
					id: string;
					type: string;
					name: string | null;
					settings: Record<string, unknown>;
				} =>
					isRecord(item) &&
					typeof item.id === "string" &&
					typeof item.type === "string" &&
					(item.name === null || typeof item.name === "string") &&
					isRecord(item.settings),
			);

			if (!dataPoints.length) {
				return NextResponse.json(
					{ success: false, error: "dataPoints array is empty or invalid" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.importKpiModel(reportId, dataPoints);
			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Deep dive not found" },
					{ status: 404 },
				);
			}

			if (!result.success) {
				const status = result.error === "Deep dive not found" ? 404 : 400;
				return NextResponse.json(
					{ success: false, error: result.error },
					{ status },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.importModel:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to import KPI model" },
				{ status: 500 },
			);
		}
	}

	static async updateModelItem(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const body = (await request.json().catch(() => null)) as unknown;
			const payload = parseUpdateReportModelItemPayload(body);
			if (!payload) {
				return NextResponse.json(
					{ success: false, error: "Invalid payload" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.updateReportModelItem(
				reportId,
				payload,
			);
			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Deep dive not found" },
					{ status: 404 },
				);
			}

			if (!result.success) {
				const status =
					result.error === "Deep dive not found" ||
					result.error === "Model item not found"
						? 404
						: 400;
				return NextResponse.json(
					{ success: false, error: result.error },
					{ status },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.updateModelItem:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to update report model item" },
				{ status: 500 },
			);
		}
	}

	static async createModelItem(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const body = (await request.json().catch(() => null)) as unknown;
			const payload = parseCreateReportModelItemPayload(body);
			if (!payload) {
				return NextResponse.json(
					{ success: false, error: "Invalid payload" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.createReportModelItem(
				reportId,
				payload,
			);
			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Deep dive not found" },
					{ status: 404 },
				);
			}

			if (!result.success) {
				const status = result.error === "Deep dive not found" ? 404 : 400;
				return NextResponse.json(
					{ success: false, error: result.error },
					{ status },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.createModelItem:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to create report model item" },
				{ status: 500 },
			);
		}
	}

	static async deleteModelItem(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const body = (await request.json().catch(() => null)) as unknown;
			if (!isRecord(body) || typeof body.dataPointId !== "string") {
				return NextResponse.json(
					{ success: false, error: "dataPointId is required" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.deleteReportModelItem(
				reportId,
				body.dataPointId,
			);
			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Deep dive not found" },
					{ status: 404 },
				);
			}

			if (!result.success) {
				const status =
					result.error === "Deep dive not found" ||
					result.error === "Model item not found"
						? 404
						: 400;
				return NextResponse.json(
					{ success: false, error: result.error },
					{ status },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.deleteModelItem:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to delete report model item" },
				{ status: 500 },
			);
		}
	}

	static async getCompany(
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
				return NextResponse.json(
					{ success: false, error: "Invalid report/company id" },
					{ status: 400 },
				);
			}

			const { searchParams } = new URL(request.url);
			const limit = Math.min(
				Math.max(
					toNumber(searchParams.get("sourcesLimit")) ?? DEFAULT_LIMIT,
					1,
				),
				MAX_LIMIT,
			);
			const offset = Math.max(
				toNumber(searchParams.get("sourcesOffset")) ?? 0,
				0,
			);
			const tier = toNumber(searchParams.get("tier"));
			const isVectorized = toBoolean(searchParams.get("isVectorized"));
			const dateFrom = parseDate(searchParams.get("dateFrom"));
			const dateTo = parseDate(searchParams.get("dateTo"));
			const metaKey = searchParams.get("metaKey")?.trim() || undefined;
			const metaValue = searchParams.get("metaValue")?.trim();
			const metaGroupBy = searchParams.get("metaGroupBy")?.trim() || undefined;

			const result = await DeepDiveService.getCompanyDeepDive(
				reportId,
				companyId,
				{
					limit,
					offset,
					tier: tier ?? undefined,
					isVectorized: isVectorized ?? undefined,
					dateFrom: dateFrom ?? undefined,
					dateTo: dateTo ?? undefined,
					metaKey,
					metaValue: metaValue ?? undefined,
					metaGroupBy,
				},
			);

			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Company not found in report" },
					{ status: 404 },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.getCompany:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch company deep dive" },
				{ status: 500 },
			);
		}
	}

	static async getSalesMinerCompany(
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
				return NextResponse.json(
					{ success: false, error: "Invalid parameters" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.getSalesMinerCompanyData(
				reportId,
				companyId,
			);

			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Not found or not a sales_miner report" },
					{ status: 404 },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.getSalesMinerCompany:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch sales miner data" },
				{ status: 500 },
			);
		}
	}

	static async getSalesMinerReportOverview(
		request: NextRequest,
		reportIdParam: string,
	) {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const result =
				await DeepDiveService.getSalesMinerReportOverview(reportId);
			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Not found or not a sales_miner report" },
					{ status: 404 },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error(
				"❌ DeepDiveController.getSalesMinerReportOverview:",
				error,
			);
			return NextResponse.json(
				{
					success: false,
					error: "Failed to fetch sales miner report overview",
				},
				{ status: 500 },
			);
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

			if (
				!Number.isFinite(reportId) ||
				!Number.isFinite(companyId) ||
				!Number.isFinite(resultId)
			) {
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
						{
							success: false,
							error: "score must be a string, number, or null",
						},
						{ status: 400 },
					);
				}
				payload.score = score as string | number | null;
			}

			if ("scoreValue" in body) {
				const scoreValue = body.scoreValue;
				if (scoreValue !== null && !isKpiScoreValue(scoreValue)) {
					return NextResponse.json(
						{
							success: false,
							error: "scoreValue must be an integer from 1 to 5 or null",
						},
						{ status: 400 },
					);
				}
				payload.scoreValue = scoreValue as KpiScoreValue | null;
			}

			if ("scoreTier" in body) {
				const scoreTier = body.scoreTier;
				if (scoreTier !== null && !isKpiScoreTier(scoreTier)) {
					return NextResponse.json(
						{
							success: false,
							error:
								"scoreTier must be one of: Low, Low-Medium, Medium, Medium-High, High, or null",
						},
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
					{
						success: false,
						error: "Data point result not found in report/company",
					},
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
				return NextResponse.json(
					{ success: false, error: "Invalid report/company id" },
					{ status: 400 },
				);
			}

			const { searchParams } = new URL(request.url);
			const limit = Math.min(
				Math.max(toNumber(searchParams.get("limit")) ?? DEFAULT_LIMIT, 1),
				MAX_LIMIT,
			);
			const offset = Math.max(toNumber(searchParams.get("offset")) ?? 0, 0);
			const tier = toNumber(searchParams.get("tier"));
			const qualityClass =
				searchParams.get("qualityClass")?.trim() || undefined;
			const isValid = toBoolean(searchParams.get("isValid"));
			const agent = searchParams.get("agent")?.trim() || undefined;
			const category = searchParams.get("category")?.trim() || undefined;
			const tag = searchParams.get("tag")?.trim() || undefined;
			const dateFrom = parseDate(searchParams.get("dateFrom"));
			const dateTo = parseDate(searchParams.get("dateTo"));
			const search = searchParams.get("search")?.trim() || undefined;
			const sortBy = searchParams.get("sortBy")?.trim() || undefined;
			const sortOrder = parseSortOrder(searchParams.get("sortOrder"));

			const result = await DeepDiveService.getSourcesAnalytics(
				reportId,
				companyId,
				{
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
				},
			);

			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Company not found in report" },
					{ status: 404 },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.getSourcesAnalytics:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch sources analytics" },
				{ status: 500 },
			);
		}
	}

	static async getQueries(request: NextRequest, reportIdParam: string) {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const { searchParams } = new URL(request.url);
			const sortBy = searchParams.get("sortBy")?.trim() || undefined;
			const sortOrder = parseSortOrder(searchParams.get("sortOrder"));

			const result = await DeepDiveService.getReportQueries(reportId, {
				sortBy,
				sortOrder,
			});
			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Report not found" },
					{ status: 404 },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.getQueries:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch report queries" },
				{ status: 500 },
			);
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
				return NextResponse.json(
					{ success: false, error: "Invalid report/query id" },
					{ status: 400 },
				);
			}

			const body = (await request.json()) as {
				goal?: string;
				searchQueries?: string[];
			};

			if (typeof body.goal !== "string" || !Array.isArray(body.searchQueries)) {
				return NextResponse.json(
					{
						success: false,
						error:
							"Body must include goal (string) and searchQueries (string[])",
					},
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.updateQuery(reportId, queryId, {
				goal: body.goal,
				searchQueries: body.searchQueries,
			});

			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Query not found in report" },
					{ status: 404 },
				);
			}

			if (!result.success) {
				return NextResponse.json(result, { status: 400 });
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.updateQuery:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to update query" },
				{ status: 500 },
			);
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
				return NextResponse.json(
					{ success: false, error: "Invalid report/company id" },
					{ status: 400 },
				);
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

			const result = await DeepDiveService.getScrapeCandidates(
				reportId,
				companyId,
				{
					limit,
					offset,
					search,
					sortBy,
					sortOrder,
				},
			);

			if (!result) {
				return NextResponse.json(
					{ success: false, error: "Company not found in report" },
					{ status: 404 },
				);
			}

			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.getScrapeCandidates:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch scrape candidates" },
				{ status: 500 },
			);
		}
	}

	static async exportReport(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
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
			return NextResponse.json(
				{ success: false, error: "Failed to export report" },
				{ status: 500 },
			);
		}
	}

	static async exportOpportunitiesXlsx(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const backendUrl = process.env.BACKEND_URL;
			if (!backendUrl) {
				return NextResponse.json(
					{ success: false, error: "BACKEND_URL is not configured" },
					{ status: 500 },
				);
			}

			const backendResponse = await fetch(
				`${backendUrl}/export-opportunities-xlsx/${reportId}`,
				{ method: "GET" },
			);

			if (!backendResponse.ok) {
				return NextResponse.json(
					{
						success: false,
						error: `Backend returned ${backendResponse.status}`,
					},
					{ status: backendResponse.status === 404 ? 404 : 500 },
				);
			}

			return new NextResponse(backendResponse.body, {
				headers: {
					"Content-Type":
						backendResponse.headers.get("Content-Type") ||
						"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					"Content-Disposition":
						backendResponse.headers.get("Content-Disposition") ||
						`attachment; filename="opportunities_report_${reportId}.xlsx"`,
				},
			});
		} catch (error) {
			console.error("❌ DeepDiveController.exportOpportunitiesXlsx:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to export opportunities" },
				{ status: 500 },
			);
		}
	}

	static async getSalesMinerSignalStats(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const result = await DeepDiveService.getSalesMinerSignalStats(reportId);
			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.getSalesMinerSignalStats:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch signal stats" },
				{ status: 500 },
			);
		}
	}

	static async tryQuery(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const body = (await request.json()) as {
				query: string;
				company_id: number;
				metadata_filters?: Record<string, unknown>;
			};

			if (!body.query || typeof body.query !== "string" || !body.query.trim()) {
				return NextResponse.json(
					{ success: false, error: "Query must be a non-empty string" },
					{ status: 400 },
				);
			}

			if (!Number.isFinite(body.company_id)) {
				return NextResponse.json(
					{ success: false, error: "company_id must be a valid number" },
					{ status: 400 },
				);
			}

			const filters: Record<string, unknown> = {
				...body.metadata_filters,
				company_id: body.company_id,
			};

			const result = await N8NService.tryQuery(body.query.trim(), filters);

			return NextResponse.json({ success: true, data: result });
		} catch (error) {
			console.error("❌ DeepDiveController.tryQuery:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to execute query" },
				{ status: 500 },
			);
		}
	}

	static async updateCompany(
		request: NextRequest,
		reportIdParam: string,
		companyIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			const companyId = Number(companyIdParam);
			if (!Number.isFinite(reportId) || !Number.isFinite(companyId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid id" },
					{ status: 400 },
				);
			}

			const body = await request.json();
			const result = await DeepDiveService.updateCompany(
				reportId,
				companyId,
				body,
			);

			if (!result.success) {
				return NextResponse.json(result, { status: 404 });
			}
			return NextResponse.json(result);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			if (msg.includes("Unique constraint")) {
				return NextResponse.json(
					{ success: false, error: "Slug already taken" },
					{ status: 409 },
				);
			}
			console.error("❌ DeepDiveController.updateCompany:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to update company" },
				{ status: 500 },
			);
		}
	}

	static async addCompanyToReport(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const body = await request.json();
			const result = await DeepDiveService.addCompanyToReport(reportId, body);

			if (!result.success) {
				return NextResponse.json(result, { status: 400 });
			}

			return NextResponse.json(result);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			if (msg.includes("Unique constraint")) {
				return NextResponse.json(
					{ success: false, error: "Company is already linked to this report" },
					{ status: 409 },
				);
			}
			console.error("❌ DeepDiveController.addCompanyToReport:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to add company" },
				{ status: 500 },
			);
		}
	}

	static async searchCompanies(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const q = new URL(request.url).searchParams.get("q") ?? "";
			if (q.trim().length < 2) {
				return NextResponse.json({ success: true, data: [] });
			}

			const result = await DeepDiveService.searchCompanies(q.trim());
			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ DeepDiveController.searchCompanies:", error);
			return NextResponse.json(
				{ success: false, error: "Search failed" },
				{ status: 500 },
			);
		}
	}

	static async getValidationSummary(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		return ValidationController.getValidationSummary(request, reportIdParam);
	}

	static async getReportValidationRules(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		return ValidationController.getReportValidationRules(
			request,
			reportIdParam,
		);
	}

	static async addReportValidationRule(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		return ValidationController.addReportValidationRule(request, reportIdParam);
	}

	static async removeReportValidationRule(
		request: NextRequest,
		reportIdParam: string,
		ruleIdParam: string,
	): Promise<NextResponse> {
		return ValidationController.removeReportValidationRule(
			request,
			reportIdParam,
			ruleIdParam,
		);
	}

	static async updateValidationRule(
		request: NextRequest,
		ruleIdParam: string,
	): Promise<NextResponse> {
		return ValidationController.updateValidationRule(request, ruleIdParam);
	}

	static async createValidationRule(
		request: NextRequest,
	): Promise<NextResponse> {
		return ValidationController.createValidationRule(request);
	}

	static async getValidationByCompany(
		request: NextRequest,
		reportIdParam: string,
		companyIdParam: string,
	): Promise<NextResponse> {
		return ValidationController.getValidationByCompany(
			request,
			reportIdParam,
			companyIdParam,
		);
	}
}
