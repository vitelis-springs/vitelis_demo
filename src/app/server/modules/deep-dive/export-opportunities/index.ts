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
import type { ExportDiagnostics, ParseWarningBucket, SheetData } from "./types";
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

/**
 * Builds the multi-sheet opportunities workbook for a Sales Miner report.
 * Public entry point used by DeepDiveController.exportOpportunitiesXlsx.
 */
export async function exportOpportunitiesWorkbook(
	prisma: QueryClient,
	reportId: number,
): Promise<ExportOpportunitiesResult> {
	const { rows, rankingVersion } = await loadRawExport(prisma, { reportId });

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

	const overview = buildOverview(rows);
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
		reportId,
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
