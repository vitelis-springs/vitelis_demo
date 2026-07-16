import { OPPS_QUERY_SQL } from "./opps-query-sql";
import type { RawRow } from "./types";

type QueryClient = {
	$queryRawUnsafe: <T = unknown>(
		query: string,
		...values: unknown[]
	) => Promise<T>;
};

function sqlIntArray(values: number[]): string {
	if (values.length === 0) return "";
	return values.map((v) => Math.trunc(v)).join(",");
}

function sqlTextOrNull(value: string | null): string {
	if (value === null) return "NULL::text";
	const escaped = value.replace(/'/g, "''");
	return `'${escaped}'::text`;
}

export async function resolveRankingVersion(
	prisma: QueryClient,
	reportId: number,
): Promise<string | null> {
	const rows = await prisma.$queryRawUnsafe<
		Array<{ ranking_version: string; cnt: bigint }>
	>(
		`
    SELECT oc.ranking_version, COUNT(*)::bigint AS cnt
    FROM opportunity_candidates oc
    JOIN research_runs rr
      ON rr.id = oc.research_run_id
     AND rr.report_id = ${Math.trunc(reportId)}
    WHERE oc.ranking_version IS NOT NULL
      AND BTRIM(oc.ranking_version) <> ''
    GROUP BY oc.ranking_version
    ORDER BY COUNT(*) DESC, oc.ranking_version ASC
    LIMIT 1
    `,
	);
	return rows[0]?.ranking_version ?? null;
}

export type LoadRawExportOptions = {
	reportId: number;
	companyIds?: number[];
	researchRunIds?: number[];
	rankingVersion?: string | null;
};

/**
 * Loads the full OPPS_QUERY result for a report.
 * SQL is bundled via opps-query-sql.ts (Vercel-safe); params are injected below.
 */
export async function loadRawExport(
	prisma: QueryClient,
	options: LoadRawExportOptions,
): Promise<{ rows: RawRow[]; rankingVersion: string | null; sql: string }> {
	const reportId = Math.trunc(options.reportId);
	const rankingVersion =
		options.rankingVersion !== undefined
			? options.rankingVersion
			: await resolveRankingVersion(prisma, reportId);

	const sql = OPPS_QUERY_SQL.replace("{{REPORT_IDS}}", sqlIntArray([reportId]))
		.replace("{{COMPANY_IDS}}", sqlIntArray(options.companyIds ?? []))
		.replace("{{RESEARCH_RUN_IDS}}", sqlIntArray(options.researchRunIds ?? []))
		.replace("{{RANKING_VERSION}}", sqlTextOrNull(rankingVersion));

	const rows = await prisma.$queryRawUnsafe<RawRow[]>(sql);
	return { rows, rankingVersion, sql };
}

/**
 * Loads deep-dive property values for the given opportunity candidate IDs,
 * joined with property definitions.
 */
export async function loadDeepDivePropertyValues(
	prisma: QueryClient,
	opportunityIds: number[],
): Promise<RawRow[]> {
	if (opportunityIds.length === 0) return [];

	const ids = opportunityIds
		.filter((id) => Number.isFinite(id))
		.map((id) => Math.trunc(id));
	if (ids.length === 0) return [];

	return prisma.$queryRawUnsafe<RawRow[]>(`
SELECT
  v.opportunity_id AS opportunity_candidate_id,
  c.name AS account,
  oc.title AS opportunity_title,
  p.id AS property_id,
  p.property_key,
  p.path AS property_path,
  p.kind AS property_kind,
  p.property_group,
  p.description AS property_description,
  p.fill_mode,
  p.preferred_shape,
  p.assemble_order,
  p.is_active AS property_is_active,
  v.id AS value_id,
  v.value_json,
  v.status AS value_status,
  v.error_message,
  v.model,
  v.requires_tools_used,
  v.generated_at,
  v.updated_at AS value_updated_at
FROM opportunity_deep_dive_property_values v
JOIN opportunity_deep_dive_properties p
  ON p.id = v.property_id
JOIN opportunity_candidates oc
  ON oc.id = v.opportunity_id
JOIN companies c
  ON c.id = oc.company_id
WHERE v.opportunity_id = ANY(ARRAY[${ids.join(",")}]::bigint[])
ORDER BY
  c.name,
  oc.title,
  v.opportunity_id,
  COALESCE(p.assemble_order, 100),
  p.property_key
`);
}
