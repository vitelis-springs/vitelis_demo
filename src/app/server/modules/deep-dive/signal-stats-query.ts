import { Prisma } from "../../../../generated/prisma";

export interface SignalStatsRawRow {
	unit_type: string;
	unit_id: bigint;
	unit_name: string | null;
	external_id: string | null;
	signal_class: string | null;
	opportunities_count: bigint;
	distinct_signal_definition_count: bigint;
	completed_search_count: bigint;
	signal_efficiency_pct: number | null;
	companies_researched_count: bigint;
	companies_with_opportunity_count: bigint;
	company_hit_rate_pct: number | null;
}

/**
 * Shared signal-stats query used by both the per-report Signal Statistics
 * tab (deep-dive) and the cross-report Statistics tab (sales-miner-stats).
 * Callers supply only the `scoped_runs` CTE body (a `SELECT rr.id ...`
 * over `public.research_runs rr`, aliased `rr`) to scope which runs count;
 * everything downstream is identical between the two callers.
 *
 * opportunities_count is derived from real `opportunity_candidates` rows
 * (approved + not excluded from the final pack), linked to signals via
 * `opportunity_seed_signal_facts` where available and falling back to
 * `meta.trigger_signal_lineage` otherwise — NOT from counting
 * `opportunity_seed_signal_facts` rows directly, since a large share of
 * real opportunities have no matching seed-fact row, and a smaller share
 * of seed-facts correspond to seeds that were never turned into an
 * opportunity at all.
 */
export function buildSignalStatsQuery(scopedRunsCte: Prisma.Sql): Prisma.Sql {
	return Prisma.sql`
      WITH scoped_runs AS (
        ${scopedRunsCte}
      ),
      eligible_opportunities AS (
        SELECT
          oc.id AS opportunity_id,
          oc.research_run_id,
          oc.company_id,
          NULLIF(oc.meta->>'seed_id', '') AS seed_id,
          COALESCE(oc.meta->'trigger_signal_lineage', '[]'::jsonb) AS trigger_signal_lineage
        FROM public.opportunity_candidates oc
        INNER JOIN scoped_runs sr
          ON sr.id = oc.research_run_id
        WHERE oc.is_approved IS TRUE
          AND COALESCE((oc.meta->>'include_in_final_pack')::boolean, true) IS TRUE
      ),
      fact_lineage AS (
        SELECT
          eo.opportunity_id,
          eo.company_id,
          f.signal_definition_id
        FROM eligible_opportunities eo
        INNER JOIN public.opportunity_seed_signal_facts f
          ON f.research_run_id = eo.research_run_id
         AND f.company_id = eo.company_id
         AND f.seed_id = eo.seed_id
      ),
      meta_lineage AS (
        SELECT
          eo.opportunity_id,
          eo.company_id,
          NULLIF(item.value->>'signal_definition_id', '')::bigint AS signal_definition_id
        FROM eligible_opportunities eo
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(eo.trigger_signal_lineage) = 'array' THEN eo.trigger_signal_lineage
            ELSE '[]'::jsonb
          END
        ) item
        WHERE NULLIF(item.value->>'signal_definition_id', '') IS NOT NULL
      ),
      opportunity_signal_links AS (
        SELECT DISTINCT
          opportunity_id,
          company_id,
          signal_definition_id
        FROM (
          SELECT * FROM fact_lineage
          UNION ALL
          SELECT * FROM meta_lineage
        ) links
      ),
      opportunity_units AS (
        SELECT
          osl.opportunity_id,
          osl.company_id,
          osl.signal_definition_id,
          CASE
            WHEN sd.sm_signal_subcategory_id IS NOT NULL THEN 'subcategory'
            ELSE 'product_signal'
          END AS unit_type,
          COALESCE(sd.sm_signal_subcategory_id, osl.signal_definition_id) AS unit_id
        FROM opportunity_signal_links osl
        LEFT JOIN public.signal_definitions sd
          ON sd.id = osl.signal_definition_id
      ),
      by_unit AS (
        SELECT
          unit_type,
          unit_id,
          COUNT(DISTINCT opportunity_id) AS opportunities_count,
          COUNT(DISTINCT signal_definition_id) AS distinct_signal_definition_count,
          COUNT(DISTINCT company_id) AS companies_with_opportunity_count
        FROM opportunity_units
        GROUP BY unit_type, unit_id
      ),
      search_task_units AS (
        SELECT
          CASE
            WHEN sd.sm_signal_subcategory_id IS NOT NULL THEN 'subcategory'
            ELSE 'product_signal'
          END AS unit_type,
          COALESCE(sd.sm_signal_subcategory_id, sst.signal_definition_id) AS unit_id,
          sst.company_id
        FROM public.signal_search_tasks sst
        LEFT JOIN public.signal_definitions sd
          ON sd.id = sst.signal_definition_id
        INNER JOIN scoped_runs sr
          ON sr.id = sst.research_run_id
        WHERE sst.status = 'completed'
      ),
      search_counts AS (
        SELECT
          unit_type,
          unit_id,
          COUNT(*) AS completed_search_count,
          COUNT(DISTINCT company_id) AS companies_researched_count
        FROM search_task_units
        GROUP BY unit_type, unit_id
      ),
      unit_labels AS (
        SELECT DISTINCT
          stu.unit_type,
          stu.unit_id,
          CASE WHEN stu.unit_type = 'subcategory' THEN ssc.name ELSE sd.name END AS unit_name,
          CASE WHEN stu.unit_type = 'subcategory' THEN ssc.external_id END AS external_id,
          CASE WHEN stu.unit_type = 'subcategory' THEN ssc.signal_class END AS signal_class
        FROM search_task_units stu
        LEFT JOIN public.signal_definitions sd
          ON stu.unit_type = 'product_signal' AND sd.id = stu.unit_id
        LEFT JOIN public.sm_signal_subcategories ssc
          ON stu.unit_type = 'subcategory' AND ssc.id = stu.unit_id
      )
      SELECT
        sc.unit_type,
        sc.unit_id,
        ul.unit_name,
        ul.external_id,
        ul.signal_class,
        COALESCE(bu.opportunities_count, 0) AS opportunities_count,
        COALESCE(bu.distinct_signal_definition_count, 0) AS distinct_signal_definition_count,
        sc.completed_search_count,
        ROUND(
          COALESCE(bu.opportunities_count, 0)::numeric / NULLIF(sc.completed_search_count, 0) * 100,
          1
        ) AS signal_efficiency_pct,
        sc.companies_researched_count,
        COALESCE(bu.companies_with_opportunity_count, 0) AS companies_with_opportunity_count,
        ROUND(
          COALESCE(bu.companies_with_opportunity_count, 0)::numeric / NULLIF(sc.companies_researched_count, 0) * 100,
          1
        ) AS company_hit_rate_pct
      FROM search_counts sc
      LEFT JOIN unit_labels ul
        ON ul.unit_type = sc.unit_type AND ul.unit_id = sc.unit_id
      LEFT JOIN by_unit bu
        ON bu.unit_type = sc.unit_type AND bu.unit_id = sc.unit_id
      ORDER BY
        sc.unit_type,
        COALESCE(bu.opportunities_count, 0) DESC
    `;
}
