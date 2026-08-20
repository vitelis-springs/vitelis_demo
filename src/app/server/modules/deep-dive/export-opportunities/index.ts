import type { ApprovalFilter } from "./opps-query";
import { loadDeepDivePropertyValues, loadRawExport } from "./opps-query";
import { asNumber, getField } from "./parsers";
import {
	buildCompetitiveAnalysis,
	buildCompetitiveAwareness,
	buildDeepDiveNarrative,
	buildDiscoveryQuestions,
	buildMeddpicc,
	buildNextBestActions,
	buildOpportunityDetails,
	buildOpportunityPortfolio,
	buildOutreachMessages,
	buildOverview,
	buildProducts,
	buildProofPoints,
	buildQaDetails,
	buildQaSummary,
	buildRawExport,
	buildSignalsAndEvidence,
	buildStakeholders,
	buildWhatToOffer,
	buildWhyNow,
	detectMissingColumns,
} from "./sheets";
import type {
	ExportDiagnostics,
	ParseWarningBucket,
	RawRow,
	SheetData,
} from "./types";
import { writeWorkbook } from "./workbook";

type QueryClient = {
	$queryRawUnsafe: <T = unknown>(
		query: string,
		...values: unknown[]
	) => Promise<T>;
};

export type ExportOpportunitiesResult = {
	buffer: ArrayBuffer;
	diagnostics: ExportDiagnostics;
};

/** One report in the export, optionally narrowed to some of its accounts. */
export type ExportScopeReport = {
	reportId: number;
	/** Empty or omitted means every account in the report. */
	companyIds?: number[];
};

export type ExportOpportunitiesScope = {
	reports: ExportScopeReport[];
	approval?: ApprovalFilter;
};

/** A plain report id keeps the original single-report call sites working. */
function normalizeScope(
	scope: number | ExportOpportunitiesScope,
): ExportOpportunitiesScope {
	return typeof scope === "number" ? { reports: [{ reportId: scope }] } : scope;
}

/**
 * Reads report names for the Overview breakdown. Kept separate from the heavy
 * OPPS_QUERY so a missing name never fails the export.
 */
async function loadReportNames(
	prisma: QueryClient,
	reportIds: number[],
): Promise<Map<number, string>> {
	if (reportIds.length === 0) return new Map();
	const ids = reportIds.map((id) => Math.trunc(id)).join(",");
	const rows = await prisma.$queryRawUnsafe<
		Array<{ id: number; name: string | null }>
	>(`SELECT id, name FROM public.reports WHERE id = ANY(ARRAY[${ids}]::int[])`);
	return new Map(rows.map((r) => [Number(r.id), r.name?.trim() || ""]));
}

/**
 * Builds the multi-sheet opportunities workbook for one or more Sales Miner
 * reports. Each report is queried on its own — ranking_version is resolved per
 * report, so reports on different ranking versions still each contribute their
 * current opportunities — and the rows are then merged through the same sheet
 * builders the single-report export uses.
 */
export async function exportOpportunitiesWorkbook(
	prisma: QueryClient,
	scope: number | ExportOpportunitiesScope,
): Promise<ExportOpportunitiesResult> {
	const { reports, approval } = normalizeScope(scope);
	if (reports.length === 0) {
		throw new Error("No reports selected for export");
	}

	const rows: RawRow[] = [];
	const perReport: Array<{
		reportId: number;
		rowCount: number;
		rankingVersion: string | null;
	}> = [];

	for (const report of reports) {
		const loaded = await loadRawExport(prisma, {
			reportId: report.reportId,
			companyIds: report.companyIds,
			approval,
		});
		rows.push(...loaded.rows);
		perReport.push({
			reportId: report.reportId,
			rowCount: loaded.rows.length,
			rankingVersion: loaded.rankingVersion,
		});
	}

	// Single-report exports keep reporting one version, as they always have.
	const rankingVersion =
		perReport.length === 1
			? (perReport[0]?.rankingVersion ?? null)
			: Array.from(
					new Set(
						perReport
							.map((r) => r.rankingVersion)
							.filter((v): v is string => Boolean(v)),
					),
				)
					.sort()
					.join(", ") || null;

	const warnings: ParseWarningBucket = {};
	const missingColumns = detectMissingColumns(rows);

	if (rows.some((r) => getField(r, "opportunity_candidate_id") == null)) {
		console.warn(
			"[export-opportunities] Some rows are missing opportunity_candidate_id",
		);
	}

	const opportunityIds = [
		...new Set(
			rows
				.map((r) => asNumber(getField(r, "opportunity_candidate_id")))
				.filter((id): id is number => id !== null),
		),
	];
	const deepDivePropertyRows = await loadDeepDivePropertyValues(
		prisma,
		opportunityIds,
	);

	const details = buildOpportunityDetails(rows);
	const portfolio = buildOpportunityPortfolio(rows);
	const qaSummary = buildQaSummary(rows);
	const qaDetails = buildQaDetails(rows);
	const raw = buildRawExport(rows);
	const deepDiveNarrative = buildDeepDiveNarrative(deepDivePropertyRows);
	const meddpicc = buildMeddpicc(deepDivePropertyRows);
	const nextBestActions = buildNextBestActions(deepDivePropertyRows);
	const competitiveAnalysis = buildCompetitiveAnalysis(deepDivePropertyRows);
	const discoveryQuestions = buildDiscoveryQuestions(deepDivePropertyRows);
	const whatToOffer = buildWhatToOffer(deepDivePropertyRows);
	const proofPoints = buildProofPoints(deepDivePropertyRows);
	const whyNow = buildWhyNow(deepDivePropertyRows);

	const optional: Array<SheetData | null> = [
		buildStakeholders(rows, warnings),
		buildOutreachMessages(rows, warnings),
		buildProducts(rows, warnings),
		buildSignalsAndEvidence(rows, warnings),
		buildCompetitiveAwareness(rows, warnings),
	];

	const mid: SheetData[] = [portfolio, details];
	const stage2Names = [
		"03 Stakeholders",
		"04 Outreach Messages",
		"05 Products",
		"06 Signals & Evidence",
		"07 Competitive Awareness",
	];
	for (const name of stage2Names) {
		const sheet = optional.find((s) => s?.name === name) ?? null;
		if (sheet) mid.push(sheet);
	}
	mid.push(qaSummary, qaDetails);
	if (deepDiveNarrative) mid.push(deepDiveNarrative);
	if (meddpicc) mid.push(meddpicc);
	if (nextBestActions) mid.push(nextBestActions);
	if (competitiveAnalysis) mid.push(competitiveAnalysis);
	if (discoveryQuestions) mid.push(discoveryQuestions);
	if (whatToOffer) mid.push(whatToOffer);
	if (proofPoints) mid.push(proofPoints);
	if (whyNow) mid.push(whyNow);
	mid.push(raw);

	// Rows from different reports are indistinguishable once merged, so a
	// multi-report export names its sources in the Overview sheet.
	const reportNames =
		perReport.length > 1
			? await loadReportNames(
					prisma,
					perReport.map((r) => r.reportId),
				)
			: new Map<number, string>();
	const overview = buildOverview(
		rows,
		perReport.length > 1
			? perReport.map((r) => ({
					id: r.reportId,
					name: reportNames.get(r.reportId) || `Report #${r.reportId}`,
					opportunities: r.rowCount,
				}))
			: undefined,
	);
	const ordered: SheetData[] = [overview, ...mid];

	// exceljs is a runtime dependency; types may be absent in incomplete installs
	// @ts-expect-error exceljs may not have local type declarations
	const ExcelJSImport = await import("exceljs");
	const ExcelJS = ExcelJSImport as {
		Workbook?: new () => unknown;
		default?: { Workbook: new () => unknown };
	};
	const WorkbookCtor = ExcelJS.Workbook ?? ExcelJS.default?.Workbook;
	if (!WorkbookCtor) {
		throw new Error("exceljs Workbook constructor not available");
	}
	const mod = {
		Workbook: WorkbookCtor,
	} as import("./exceljs-types").ExcelJSModule;
	const buffer = await writeWorkbook(mod, ordered);

	const diagnostics: ExportDiagnostics = {
		rawRowCount: rows.length,
		sheets: ordered.map((s) => ({
			name: s.name,
			rowCount:
				s.name === "00 Overview"
					? (s.overviewTables?.reduce((n, t) => n + t.rows.length, 0) ?? 0)
					: s.rows.length,
		})),
		parseWarnings: warnings,
		missingColumns,
		rankingVersion,
	};

	console.info("[export-opportunities] completed", {
		reports: perReport,
		approval: approval ?? "approved",
		rankingVersion,
		rawRowCount: diagnostics.rawRowCount,
		sheetCount: diagnostics.sheets.length,
		sheets: diagnostics.sheets,
		parseWarnings: diagnostics.parseWarnings,
		missingColumns: diagnostics.missingColumns,
	});

	return { buffer: buffer as unknown as ArrayBuffer, diagnostics };
}

export { loadRawExport, resolveRankingVersion } from "./opps-query";
