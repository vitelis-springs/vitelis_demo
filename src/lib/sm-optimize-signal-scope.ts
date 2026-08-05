import {
	buildSignalStatsQuery,
	type SignalStatsRawRow,
} from "../app/server/modules/deep-dive/signal-stats-query";
import { buildScopedRunsCte } from "../app/server/modules/sales-miner-stats/sales-miner-stats.repository";
import prisma from "./prisma";

const DEFAULT_MIN_SAMPLE_THRESHOLD = 5;
const DEFAULT_WINNERS_RATIO = 0.8;

export class OptimizeSignalScopeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OptimizeSignalScopeError";
	}
}

export interface OptimizeSignalScopeOptions {
	minSampleThreshold?: number;
	useProductTagFilter?: boolean;
}

export interface OptimizeSignalScopeCompanySummary {
	companyId: number;
	candidateCount: number;
	winnersCount: number;
	losersCount: number;
	coldStartInLosersCount: number;
}

export interface OptimizeSignalScopeResult {
	sourceRowsCount: number;
	insertedCount: number;
	reactivatedCount: number;
	deactivatedCount: number;
	companySummaries: OptimizeSignalScopeCompanySummary[];
}

interface CompanyGicsRow {
	company_id: number;
	gics_code: string;
}

interface CandidateRow {
	company_id: number;
	subcategory_id: bigint;
	signal_definition_id: bigint;
}

interface ScoredCandidate {
	candidate: CandidateRow;
	score: number | null;
}

export interface SubcategoryEfficiencyInfo {
	efficiencyPct: number | null;
	companiesResearched: number;
}

export type SignalSelectionReason = "winner" | "random";

interface SelectedSignal {
	companyId: number;
	signalDefinitionId: bigint;
	reason: SignalSelectionReason;
	/** The candidate's signal_efficiency_pct score at the moment of this Optimize run — null for cold-start candidates. Frozen into report_company_signal_scope.selection_efficiency_pct as a snapshot. */
	efficiencyPct: number | null;
}

/**
 * Reduces the researched-signal set for every company in a report to
 * `targetCount` subcategories: 80% the best historical performers
 * (`signal_efficiency_pct`, Production/POC runs only, GICS-scoped with
 * parent-code fallback when a level lacks enough samples), 20% randomly
 * sampled from the rest (lower-ranked subcategories and ones with no
 * historical data at all) — a standing explore arm so unfavored/new
 * subcategories keep collecting data instead of being permanently starved
 * once excluded. Writes to `report_company_signal_scope`, the same table
 * `resetToDefaultSignalScope` (sm-reset-default-signals.ts) writes to and
 * the one the research-run-creation n8n flow reads to decide what to
 * research — so this directly controls what gets researched next.
 */
export async function optimizeSignalScope(
	reportId: number,
	targetCount: number,
	opts: OptimizeSignalScopeOptions = {},
): Promise<OptimizeSignalScopeResult> {
	const minSampleThreshold =
		opts.minSampleThreshold ?? DEFAULT_MIN_SAMPLE_THRESHOLD;
	const useProductTagFilter = opts.useProductTagFilter ?? false;

	const [classifierIds, gicsRows, candidateRows] = await Promise.all([
		resolveProductionPocClassifierIds(),
		fetchCompanyGicsChains(reportId),
		fetchCandidateSignals(reportId),
	]);

	const capabilityTagIds = useProductTagFilter
		? await resolveReportCustomerProductTags(reportId)
		: [];

	const chainsByCompany = new Map<number, string[]>();
	for (const row of gicsRows) {
		const list = chainsByCompany.get(row.company_id);
		if (list) list.push(row.gics_code);
		else chainsByCompany.set(row.company_id, [row.gics_code]);
	}

	const candidatesByCompany = new Map<number, CandidateRow[]>();
	for (const row of candidateRows) {
		const list = candidatesByCompany.get(row.company_id);
		if (list) list.push(row);
		else candidatesByCompany.set(row.company_id, [row]);
	}

	const distinctGicsCodes = new Set<string>();
	for (const codes of Array.from(chainsByCompany.values())) {
		for (const code of codes) distinctGicsCodes.add(code);
	}

	const statsByGicsCode = await fetchStatsByGicsCode(
		distinctGicsCodes,
		classifierIds,
		capabilityTagIds,
	);

	const companySummaries: OptimizeSignalScopeCompanySummary[] = [];
	const selected: SelectedSignal[] = [];

	for (const [companyId, candidates] of Array.from(
		candidatesByCompany.entries(),
	)) {
		const chain = chainsByCompany.get(companyId) ?? [];

		const scored: ScoredCandidate[] = candidates.map((candidate) => ({
			candidate,
			score: resolveScore(
				candidate,
				chain,
				statsByGicsCode,
				minSampleThreshold,
			),
		}));

		const winnersTarget = Math.round(targetCount * DEFAULT_WINNERS_RATIO);
		const scoredOnly = scored
			.filter((s): s is ScoredCandidate & { score: number } => s.score !== null)
			.sort((a, b) => b.score - a.score);

		const winners = scoredOnly.slice(
			0,
			Math.min(winnersTarget, scoredOnly.length),
		);
		const losersTarget = targetCount - winners.length;

		const winnerKeys = new Set(
			winners.map((w) => w.candidate.subcategory_id.toString()),
		);
		const loserPool = scored.filter(
			(s) => !winnerKeys.has(s.candidate.subcategory_id.toString()),
		);
		const losers = shuffle(loserPool).slice(
			0,
			Math.min(losersTarget, loserPool.length),
		);

		for (const w of winners) {
			selected.push({
				companyId,
				signalDefinitionId: w.candidate.signal_definition_id,
				reason: "winner",
				efficiencyPct: w.score,
			});
		}
		for (const l of losers) {
			selected.push({
				companyId,
				signalDefinitionId: l.candidate.signal_definition_id,
				reason: "random",
				efficiencyPct: l.score,
			});
		}

		companySummaries.push({
			companyId,
			candidateCount: candidates.length,
			winnersCount: winners.length,
			losersCount: losers.length,
			coldStartInLosersCount: losers.filter((l) => l.score === null).length,
		});
	}

	const upsertResult = await applySignalScopeSelection(reportId, selected);

	return { ...upsertResult, companySummaries };
}

function resolveScore(
	candidate: CandidateRow,
	gicsChain: string[],
	statsByGicsCode: Map<string, Map<string, SubcategoryEfficiencyInfo>>,
	minSampleThreshold: number,
): number | null {
	const subcategoryKey = candidate.subcategory_id.toString();
	for (const gicsCode of gicsChain) {
		const stat = statsByGicsCode.get(gicsCode)?.get(subcategoryKey);
		if (stat && stat.companiesResearched >= minSampleThreshold) {
			return stat.efficiencyPct;
		}
	}
	return null;
}

function shuffle<T>(items: T[]): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const a = copy[i];
		const b = copy[j];
		if (a === undefined || b === undefined) continue;
		copy[i] = b;
		copy[j] = a;
	}
	return copy;
}

async function resolveProductionPocClassifierIds(): Promise<number[]> {
	const rows = await prisma.report_classifiers.findMany({
		where: { name: { in: ["Production", "POC"] } },
		select: { id: true },
	});
	return rows.map((r) => r.id);
}

async function fetchStatsByGicsCode(
	gicsCodes: Set<string>,
	classifierIds: number[],
	capabilityTagIds: bigint[],
): Promise<Map<string, Map<string, SubcategoryEfficiencyInfo>>> {
	const result = new Map<string, Map<string, SubcategoryEfficiencyInfo>>();

	await Promise.all(
		Array.from(gicsCodes).map(async (code) => {
			const rows = await prisma.$queryRaw<SignalStatsRawRow[]>(
				buildSignalStatsQuery(
					buildScopedRunsCte({
						customerIds: [],
						targetGicsCodes: [code],
						classifierIds,
					}),
					capabilityTagIds,
				),
			);
			const map = new Map<string, SubcategoryEfficiencyInfo>();
			for (const row of rows) {
				if (row.unit_type !== "subcategory") continue;
				map.set(row.unit_id.toString(), {
					// Postgres NUMERIC comes back as a string via node-postgres — same coercion used everywhere else signal_efficiency_pct is read (e.g. deep-dive.service.ts).
					efficiencyPct:
						row.signal_efficiency_pct != null
							? Number(row.signal_efficiency_pct)
							: null,
					companiesResearched: Number(row.companies_researched_count),
				});
			}
			result.set(code, map);
		}),
	);

	return result;
}

/**
 * Per-subcategory `signal_efficiency_pct` for a single company, resolved the
 * same way `optimizeSignalScope` scores candidates: walk the company's GICS
 * ancestry most-specific-first, freeze the first level with at least
 * `minSampleThreshold` Production/POC runs. Used to annotate the Signal
 * Catalog UI with the same numbers that drive `optimizeSignalScope`'s
 * winner/loser split, so admins can see why a signal ranks where it does.
 */
export async function getCompanySubcategoryEfficiencyMap(
	companyId: number,
	opts: { minSampleThreshold?: number; capabilityTagIds?: bigint[] } = {},
): Promise<Map<string, SubcategoryEfficiencyInfo>> {
	const minSampleThreshold =
		opts.minSampleThreshold ?? DEFAULT_MIN_SAMPLE_THRESHOLD;
	const capabilityTagIds = opts.capabilityTagIds ?? [];

	const [classifierIds, chain] = await Promise.all([
		resolveProductionPocClassifierIds(),
		fetchSingleCompanyGicsChain(companyId),
	]);

	const statsByGicsCode = await fetchStatsByGicsCode(
		new Set(chain),
		classifierIds,
		capabilityTagIds,
	);

	const result = new Map<string, SubcategoryEfficiencyInfo>();
	for (const gicsCode of chain) {
		const levelMap = statsByGicsCode.get(gicsCode);
		if (!levelMap) continue;
		for (const [subcategoryId, stat] of Array.from(levelMap.entries())) {
			if (result.has(subcategoryId)) continue;
			if (stat.companiesResearched >= minSampleThreshold) {
				result.set(subcategoryId, stat);
			}
		}
	}
	return result;
}

/** Same GICS ancestry walk as fetchCompanyGicsChains, scoped to one company instead of a whole report. */
async function fetchSingleCompanyGicsChain(
	companyId: number,
): Promise<string[]> {
	const rows = await prisma.$queryRaw<Array<{ gics_code: string }>>`
		WITH RECURSIVE company_gics_path AS (
			SELECT g.code AS gics_code, g.level AS gics_level, g.parent_code
			FROM companies c
			JOIN gics_codes g ON g.code = c.gics_code
			WHERE c.id = ${companyId}
			UNION ALL
			SELECT g.code, g.level, g.parent_code
			FROM company_gics_path p
			JOIN gics_codes g ON g.code = p.parent_code
		)
		SELECT gics_code
		FROM company_gics_path
		ORDER BY gics_level DESC
	`;
	return rows.map((r) => r.gics_code);
}

/** Walks every report company's GICS ancestry, most specific first — same shape as sm-reset-default-signals.ts's company_gics_path. */
async function fetchCompanyGicsChains(
	reportId: number,
): Promise<CompanyGicsRow[]> {
	return prisma.$queryRaw<CompanyGicsRow[]>`
		WITH RECURSIVE
		report_company_list AS (
			SELECT DISTINCT rc.company_id
			FROM report_companies rc
			WHERE rc.report_id = ${reportId}
		),
		company_gics_path AS (
			SELECT
				c.id       AS company_id,
				g.code     AS gics_code,
				g.level    AS gics_level,
				g.parent_code
			FROM companies c
			JOIN report_company_list rcl ON rcl.company_id = c.id
			JOIN gics_codes g ON g.code = c.gics_code
			UNION ALL
			SELECT
				p.company_id,
				g.code,
				g.level,
				g.parent_code
			FROM company_gics_path p
			JOIN gics_codes g ON g.code = p.parent_code
		)
		SELECT company_id, gics_code
		FROM company_gics_path
		ORDER BY company_id, gics_level DESC
	`;
}

/**
 * The default-model candidate set per company — same GICS-walk-up catalog
 * resolution as sm-reset-default-signals.ts's ranked_signal_definitions,
 * just also emitting subcategory_id so callers can rank/filter by
 * subcategory before deciding which signal_definition_id to keep.
 */
async function fetchCandidateSignals(
	reportId: number,
): Promise<CandidateRow[]> {
	return prisma.$queryRaw<CandidateRow[]>`
		WITH RECURSIVE
		report_company_list AS (
			SELECT DISTINCT rc.company_id
			FROM report_companies rc
			WHERE rc.report_id = ${reportId}
		),
		company_gics_path AS (
			SELECT
				c.id       AS company_id,
				g.code     AS gics_code,
				g.level    AS gics_level,
				g.parent_code
			FROM companies c
			JOIN report_company_list rcl ON rcl.company_id = c.id
			JOIN gics_codes g ON g.code = c.gics_code
			UNION ALL
			SELECT
				p.company_id,
				g.code,
				g.level,
				g.parent_code
			FROM company_gics_path p
			JOIN gics_codes g ON g.code = p.parent_code
		),
		ranked_signal_definitions AS (
			SELECT
				gp.company_id,
				ssi.sm_signal_subcategory_id AS subcategory_id,
				ssi.signal_definition_id,
				ROW_NUMBER() OVER (
					PARTITION BY gp.company_id, ssi.sm_signal_subcategory_id
					ORDER BY gp.gics_level DESC, ssi.updated_at DESC NULLS LAST, ssi.id DESC
				) AS rn
			FROM sm_signal_subcategories_industries ssi
			JOIN company_gics_path gp ON gp.gics_code = ssi.gics_code
			WHERE ssi.signal_definition_id IS NOT NULL
			  AND ssi.status IS TRUE
		)
		SELECT company_id, subcategory_id, signal_definition_id
		FROM ranked_signal_definitions
		WHERE rn = 1
	`;
}

/**
 * Resolves anchor capability tags for the report's customer from
 * `report_settings.settings.customer_id` (set at SalesMiner report creation).
 * Throws if the filter was requested but customer or tags can't be resolved —
 * never silently falls back to an unfiltered stats query.
 */
async function resolveReportCustomerProductTags(
	reportId: number,
): Promise<bigint[]> {
	const customerRows = await prisma.$queryRaw<
		Array<{ customer_id: string | null }>
	>`
		SELECT rs.settings->>'customer_id' AS customer_id
		FROM reports r
		JOIN report_settings rs ON rs.id = r.report_settings_id
		WHERE r.id = ${reportId}
	`;
	const customerIdRaw = customerRows[0]?.customer_id;
	if (customerIdRaw == null || customerIdRaw === "") {
		throw new OptimizeSignalScopeError(
			`Report ${reportId} has no customer_id in report_settings; cannot apply product-tag filter`,
		);
	}
	const customerId = BigInt(customerIdRaw);

	const tagRows = await prisma.$queryRaw<Array<{ capability_tag_id: bigint }>>`
		SELECT DISTINCT m.capability_tag_id
		FROM sm_customer_product_capability_map m
		JOIN customer_products cp ON cp.id = m.customer_product_id
		WHERE m.customer_id = ${customerId}
		  AND cp.is_active IS TRUE
		  AND m.is_active IS TRUE
		  AND m.role_type = 'anchor'
	`;
	if (tagRows.length === 0) {
		throw new OptimizeSignalScopeError(
			`No active anchor product capability tags found for customer ${customerId}; cannot apply product-tag filter`,
		);
	}
	return tagRows.map((r) => r.capability_tag_id);
}

/**
 * Same insert/reactivate/deactivate upsert shape as resetToDefaultSignalScope,
 * driven by an application-computed source-rows set instead of a purely
 * SQL-derived one, plus stamping `selection_reason` ('winner' | 'random') and
 * a frozen `selection_efficiency_pct` snapshot on every row this run selects —
 * including ones that were already active (e.g. a signal ranked 'random' last
 * time and 'winner' this time gets both refreshed). Rows this run deactivates
 * clear both selection columns so Pick/At Selection only describe currently
 * in-scope Optimize picks. Rows never touched by Optimize (manual toggles,
 * Reset to default) keep whatever values they already had.
 */
async function applySignalScopeSelection(
	reportId: number,
	selected: SelectedSignal[],
): Promise<{
	sourceRowsCount: number;
	insertedCount: number;
	reactivatedCount: number;
	deactivatedCount: number;
}> {
	if (selected.length === 0) {
		return {
			sourceRowsCount: 0,
			insertedCount: 0,
			reactivatedCount: 0,
			deactivatedCount: 0,
		};
	}

	const companyIds = selected.map((s) => s.companyId);
	const signalDefinitionIds = selected.map((s) => s.signalDefinitionId);
	const reasons = selected.map((s) => s.reason);
	const efficiencyPcts = selected.map((s) => s.efficiencyPct);

	const rows = await prisma.$queryRaw<
		Array<{
			source_rows_count: bigint;
			inserted_count: bigint;
			reactivated_existing_count: bigint;
			deactivated_obsolete_count: bigint;
		}>
	>`
		WITH source_rows AS (
			SELECT DISTINCT
				${reportId}::bigint AS report_id,
				company_id,
				signal_definition_id,
				reason,
				efficiency_pct
			FROM unnest(
				${companyIds}::int[],
				${signalDefinitionIds}::bigint[],
				${reasons}::text[],
				${efficiencyPcts}::numeric[]
			) AS t(company_id, signal_definition_id, reason, efficiency_pct)
		),
		deactivated_obsolete AS (
			UPDATE report_company_signal_scope rcss
			SET
				is_active = false,
				selection_reason = null,
				selection_efficiency_pct = null,
				updated_at = now()
			WHERE rcss.report_id = ${reportId}
			  AND rcss.is_active IS DISTINCT FROM false
			  AND NOT EXISTS (
				SELECT 1 FROM source_rows src
				WHERE src.company_id = rcss.company_id
				  AND src.signal_definition_id = rcss.signal_definition_id
			  )
			RETURNING rcss.id
		),
		updated_existing AS (
			UPDATE report_company_signal_scope rcss
			SET
				is_active = true,
				selection_reason = sr.reason,
				selection_efficiency_pct = sr.efficiency_pct,
				updated_at = now()
			FROM source_rows sr
			WHERE rcss.report_id = sr.report_id
			  AND rcss.company_id = sr.company_id
			  AND rcss.signal_definition_id = sr.signal_definition_id
			  AND (
				rcss.is_active IS DISTINCT FROM true
				OR rcss.selection_reason IS DISTINCT FROM sr.reason
				OR rcss.selection_efficiency_pct IS DISTINCT FROM sr.efficiency_pct
			  )
			RETURNING rcss.id
		),
		inserted AS (
			INSERT INTO report_company_signal_scope
				(report_id, company_id, signal_definition_id, is_active, selection_reason, selection_efficiency_pct, created_at, updated_at)
			SELECT sr.report_id, sr.company_id, sr.signal_definition_id, true, sr.reason, sr.efficiency_pct, now(), now()
			FROM source_rows sr
			WHERE NOT EXISTS (
				SELECT 1 FROM report_company_signal_scope rcss
				WHERE rcss.report_id = sr.report_id
				  AND rcss.company_id = sr.company_id
				  AND rcss.signal_definition_id = sr.signal_definition_id
			)
			RETURNING id
		)
		SELECT
			(SELECT count(*) FROM source_rows)         AS source_rows_count,
			(SELECT count(*) FROM inserted)            AS inserted_count,
			(SELECT count(*) FROM updated_existing)    AS reactivated_existing_count,
			(SELECT count(*) FROM deactivated_obsolete) AS deactivated_obsolete_count
	`;

	const r = rows[0]!;
	return {
		sourceRowsCount: Number(r.source_rows_count),
		insertedCount: Number(r.inserted_count),
		reactivatedCount: Number(r.reactivated_existing_count),
		deactivatedCount: Number(r.deactivated_obsolete_count),
	};
}
