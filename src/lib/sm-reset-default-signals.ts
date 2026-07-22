import prisma from "./prisma";

export interface ResetToDefaultSignalsResult {
	sourceRowsCount: number;
	insertedCount: number;
	reactivatedCount: number;
	deactivatedCount: number;
}

/**
 * Resets the signal scope for every company in a SalesMiner report to the
 * default model derived from each company's GICS code (walking up to the
 * closest ancestor GICS level that has a matching signal definition).
 * Signals not matching the default model are deactivated; previously
 * deactivated default signals are reactivated.
 */
export async function resetToDefaultSignalScope(
	reportId: number,
): Promise<ResetToDefaultSignalsResult> {
	// Combined query: Q1 (find best-match signal per company/subcategory via GICS walk-up)
	// feeds directly into Q2 (upsert report_company_signal_scope)
	const rows = await prisma.$queryRaw<
		Array<{
			source_rows_count: bigint;
			inserted_count: bigint;
			reactivated_existing_count: bigint;
			deactivated_obsolete_count: bigint;
		}>
	>`
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
				ssi.signal_definition_id,
				ROW_NUMBER() OVER (
					PARTITION BY gp.company_id, ssi.sm_signal_subcategory_id
					ORDER BY gp.gics_level DESC, ssi.updated_at DESC NULLS LAST, ssi.id DESC
				) AS rn
			FROM sm_signal_subcategories_industries ssi
			JOIN company_gics_path gp ON gp.gics_code = ssi.gics_code
			WHERE ssi.signal_definition_id IS NOT NULL
			  AND ssi.status IS TRUE
		),
		source_rows AS (
			SELECT
				${reportId}::bigint AS report_id,
				company_id,
				signal_definition_id
			FROM ranked_signal_definitions
			WHERE rn = 1
		),
		deactivated_obsolete AS (
			UPDATE report_company_signal_scope rcss
			SET is_active = false, updated_at = now()
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
			SET is_active = true, updated_at = now()
			FROM source_rows sr
			WHERE rcss.report_id = sr.report_id
			  AND rcss.company_id = sr.company_id
			  AND rcss.signal_definition_id = sr.signal_definition_id
			  AND rcss.is_active IS DISTINCT FROM true
			RETURNING rcss.id
		),
		inserted AS (
			INSERT INTO report_company_signal_scope
				(report_id, company_id, signal_definition_id, is_active, created_at, updated_at)
			SELECT sr.report_id, sr.company_id, sr.signal_definition_id, true, now(), now()
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
			(SELECT count(*) FROM source_rows)        AS source_rows_count,
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
