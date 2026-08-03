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
	/**
	 * Opportunities where this unit was the actual decision-driver, not just
	 * corroborating context — see `trigger_signal_links` below for what counts.
	 * A lower bound: links that only exist via `opportunity_seed_signal_facts`
	 * (no `meta.trigger_signal_lineage` counterpart) carry no role and are
	 * never counted here, even though some of them are genuinely triggers.
	 */
	trigger_opportunities_count: bigint;
	trigger_efficiency_pct: number | null;
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
 *
 * trigger_opportunities_count narrows that same link set to entries where
 * the signal was the actual reason the opportunity was created
 * (`lineage_role` containing "trigger", e.g. `business_trigger` /
 * `primary trigger`), not just supporting/qualifying context alongside some
 * other signal. `lineage_role` is free-text LLM output (hundreds of distinct
 * values observed), so this is a heuristic bucket, not an enum match. It can
 * only be computed from `meta.trigger_signal_lineage` — `opportunity_seed_signal_facts`
 * carries no role — so it under-counts for opportunities whose only link to
 * this signal came through the seed-facts fallback.
 */

/**
 * The opportunity↔signal lineage resolution shared by every signal-stats
 * query variant (per-signal, per-category, ...). Must be interpolated right
 * after a `scoped_runs` CTE and followed by a comma — it defines
 * `opportunity_signal_links` (any link) and `trigger_signal_links` (links
 * where the signal was the actual trigger, see module docstring) for
 * downstream CTEs to group as needed.
 *
 * `capabilityTagIds` (empty = no filter) narrows `eligible_opportunities` to
 * those whose `lead_product_id` carries one of the given tags with
 * `role_type = 'anchor'` in `sm_customer_product_capability_map` — i.e. "this
 * specific opportunity's product is anchored on tag X", not "this customer
 * sells something tagged X somewhere in their portfolio". Opportunities with
 * a null `lead_product_id` (~1% of eligible rows) never match once a filter
 * is active, same as any other unmatched dimension. This only narrows the
 * opportunity side — `search_task_units`/`search_counts` (denominators) stay
 * scoped by `scoped_runs` alone, since signal_search_tasks has no product
 * concept; efficiency percentages are read the same way they already are
 * when unfiltered (numerator narrower than denominator by design).
 */
function buildLineageCtes(capabilityTagIds: bigint[]): Prisma.Sql {
	return Prisma.sql`
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
          AND (
            cardinality(${capabilityTagIds}::bigint[]) = 0
            OR EXISTS (
              SELECT 1 FROM public.sm_customer_product_capability_map m
              WHERE m.customer_product_id = oc.lead_product_id
                AND m.role_type = 'anchor'
                AND m.is_active IS TRUE
                AND m.capability_tag_id = ANY(${capabilityTagIds}::bigint[])
            )
          )
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
          NULLIF(item.value->>'signal_definition_id', '')::bigint AS signal_definition_id,
          item.value->>'lineage_role' AS lineage_role
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
          SELECT opportunity_id, company_id, signal_definition_id FROM fact_lineage
          UNION ALL
          SELECT opportunity_id, company_id, signal_definition_id FROM meta_lineage
        ) links
      ),
      trigger_signal_links AS (
        SELECT DISTINCT
          opportunity_id,
          company_id,
          signal_definition_id
        FROM meta_lineage
        WHERE lineage_role ILIKE '%trigger%'
      )
    `;
}

export function buildSignalStatsQuery(
	scopedRunsCte: Prisma.Sql,
	capabilityTagIds: bigint[] = [],
): Prisma.Sql {
	return Prisma.sql`
      WITH scoped_runs AS (
        ${scopedRunsCte}
      ),
      ${buildLineageCtes(capabilityTagIds)},
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
      trigger_units AS (
        SELECT
          tsl.opportunity_id,
          tsl.signal_definition_id,
          CASE
            WHEN sd.sm_signal_subcategory_id IS NOT NULL THEN 'subcategory'
            ELSE 'product_signal'
          END AS unit_type,
          COALESCE(sd.sm_signal_subcategory_id, tsl.signal_definition_id) AS unit_id
        FROM trigger_signal_links tsl
        LEFT JOIN public.signal_definitions sd
          ON sd.id = tsl.signal_definition_id
      ),
      by_unit_trigger AS (
        SELECT
          unit_type,
          unit_id,
          COUNT(DISTINCT opportunity_id) AS trigger_opportunities_count
        FROM trigger_units
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
        ) AS company_hit_rate_pct,
        COALESCE(but.trigger_opportunities_count, 0) AS trigger_opportunities_count,
        ROUND(
          COALESCE(but.trigger_opportunities_count, 0)::numeric / NULLIF(sc.completed_search_count, 0) * 100,
          1
        ) AS trigger_efficiency_pct
      FROM search_counts sc
      LEFT JOIN unit_labels ul
        ON ul.unit_type = sc.unit_type AND ul.unit_id = sc.unit_id
      LEFT JOIN by_unit bu
        ON bu.unit_type = sc.unit_type AND bu.unit_id = sc.unit_id
      LEFT JOIN by_unit_trigger but
        ON but.unit_type = sc.unit_type AND but.unit_id = sc.unit_id
      ORDER BY
        sc.unit_type,
        COALESCE(bu.opportunities_count, 0) DESC
    `;
}

export interface SignalCategoryStatsRawRow {
	/** Null for the synthetic "Custom / Product Signals" bucket — see buildSignalCategoryStatsQuery. */
	category_id: bigint | null;
	category_name: string;
	subcategory_count: bigint;
	opportunities_count: bigint;
	distinct_signal_definition_count: bigint;
	completed_search_count: bigint;
	signal_efficiency_pct: number | null;
	companies_researched_count: bigint;
	companies_with_opportunity_count: bigint;
	company_hit_rate_pct: number | null;
	trigger_opportunities_count: bigint;
	trigger_efficiency_pct: number | null;
}

/**
 * Rolls up `opportunity_signal_links` (from buildLineageCtes) to
 * `sm_signal_category_id` — shared verbatim by buildSignalCategoryStatsQuery
 * and buildCategoryProductTagMatrixQuery, which both need the same
 * opportunity↔category resolution before diverging into their own grouping.
 */
const categorySignalLinksCte = Prisma.sql`
      category_signal_links AS (
        SELECT
          osl.opportunity_id,
          osl.company_id,
          osl.signal_definition_id,
          ssc.sm_signal_category_id AS category_id
        FROM opportunity_signal_links osl
        LEFT JOIN public.signal_definitions sd
          ON sd.id = osl.signal_definition_id
        LEFT JOIN public.sm_signal_subcategories ssc
          ON ssc.id = sd.sm_signal_subcategory_id
      )`;

/** `sm_signal_categories` id→name lookup — shared verbatim by the same two query builders as categorySignalLinksCte. */
const categoryLabelsCte = Prisma.sql`
      category_labels AS (
        SELECT id AS category_id, name AS category_name
        FROM public.sm_signal_categories
      )`;

/**
 * Same underlying lineage as buildSignalStatsQuery, rolled up one level to
 * `sm_signal_categories` (14 rows today) instead of per-signal. Product
 * signals (report-specific, no `sm_signal_subcategory_id`) have no category
 * to roll up into, so they're grouped into one synthetic
 * `category_id IS NULL` / "Custom / Product Signals" row rather than
 * dropped — the universal-vs-custom contrast is exactly what the per-signal
 * view has shown to matter, and losing it here would hide that.
 */
export function buildSignalCategoryStatsQuery(
	scopedRunsCte: Prisma.Sql,
	capabilityTagIds: bigint[] = [],
): Prisma.Sql {
	return Prisma.sql`
      WITH scoped_runs AS (
        ${scopedRunsCte}
      ),
      ${buildLineageCtes(capabilityTagIds)},
      ${categorySignalLinksCte},
      by_category AS (
        SELECT
          category_id,
          COUNT(DISTINCT opportunity_id) AS opportunities_count,
          COUNT(DISTINCT signal_definition_id) AS distinct_signal_definition_count,
          COUNT(DISTINCT company_id) AS companies_with_opportunity_count
        FROM category_signal_links
        GROUP BY category_id
      ),
      category_trigger_links AS (
        SELECT
          tsl.opportunity_id,
          tsl.signal_definition_id,
          ssc.sm_signal_category_id AS category_id
        FROM trigger_signal_links tsl
        LEFT JOIN public.signal_definitions sd
          ON sd.id = tsl.signal_definition_id
        LEFT JOIN public.sm_signal_subcategories ssc
          ON ssc.id = sd.sm_signal_subcategory_id
      ),
      by_category_trigger AS (
        SELECT
          category_id,
          COUNT(DISTINCT opportunity_id) AS trigger_opportunities_count
        FROM category_trigger_links
        GROUP BY category_id
      ),
      search_task_categories AS (
        SELECT
          ssc.sm_signal_category_id AS category_id,
          sd.sm_signal_subcategory_id AS subcategory_id,
          sst.company_id
        FROM public.signal_search_tasks sst
        LEFT JOIN public.signal_definitions sd
          ON sd.id = sst.signal_definition_id
        LEFT JOIN public.sm_signal_subcategories ssc
          ON ssc.id = sd.sm_signal_subcategory_id
        INNER JOIN scoped_runs sr
          ON sr.id = sst.research_run_id
        WHERE sst.status = 'completed'
      ),
      search_counts AS (
        SELECT
          category_id,
          COUNT(*) AS completed_search_count,
          COUNT(DISTINCT company_id) AS companies_researched_count,
          COUNT(DISTINCT subcategory_id) AS subcategory_count
        FROM search_task_categories
        GROUP BY category_id
      ),
      ${categoryLabelsCte}
      SELECT
        sc.category_id,
        COALESCE(cl.category_name, 'Custom / Product Signals') AS category_name,
        sc.subcategory_count,
        COALESCE(bc.opportunities_count, 0) AS opportunities_count,
        COALESCE(bc.distinct_signal_definition_count, 0) AS distinct_signal_definition_count,
        sc.completed_search_count,
        ROUND(
          COALESCE(bc.opportunities_count, 0)::numeric / NULLIF(sc.completed_search_count, 0) * 100,
          1
        ) AS signal_efficiency_pct,
        sc.companies_researched_count,
        COALESCE(bc.companies_with_opportunity_count, 0) AS companies_with_opportunity_count,
        ROUND(
          COALESCE(bc.companies_with_opportunity_count, 0)::numeric / NULLIF(sc.companies_researched_count, 0) * 100,
          1
        ) AS company_hit_rate_pct,
        COALESCE(bct.trigger_opportunities_count, 0) AS trigger_opportunities_count,
        ROUND(
          COALESCE(bct.trigger_opportunities_count, 0)::numeric / NULLIF(sc.completed_search_count, 0) * 100,
          1
        ) AS trigger_efficiency_pct
      FROM search_counts sc
      LEFT JOIN category_labels cl
        ON cl.category_id = sc.category_id
      LEFT JOIN by_category bc
        ON bc.category_id IS NOT DISTINCT FROM sc.category_id
      LEFT JOIN by_category_trigger bct
        ON bct.category_id IS NOT DISTINCT FROM sc.category_id
      ORDER BY
        COALESCE(bc.opportunities_count, 0) DESC
    `;
}

export interface CategoryProductTagCellRawRow {
	/** Null for the synthetic "Custom / Product Signals" row bucket — same as SignalCategoryStatsRawRow. */
	category_id: bigint | null;
	category_name: string;
	/** Null for the synthetic "No Product Tag" column bucket — opportunities whose lead_product_id has no anchor mapping (or is null). */
	capability_tag_id: bigint | null;
	tag_name: string;
	opportunities_count: bigint;
	/** This category's own completed_search_count (same denominator as SignalCategoryStatsRawRow's row) — repeated on every tag cell for the same category, since search isn't scoped by product; only the numerator narrows per tag. */
	completed_search_count: bigint;
	signal_efficiency_pct: number | null;
}

/**
 * A (category × capability tag) matrix, meant to be rendered as extra
 * per-tag columns on top of the buildSignalCategoryStatsQuery table, not as
 * a standalone view: each category row keeps ITS OWN completed_search_count
 * denominator (from signal_search_tasks, exactly like the plain category
 * view), while the numerator is narrowed to opportunities whose lead product
 * is anchored on that specific tag (sm_customer_product_capability_map,
 * role_type='anchor'). Unlike a flat per-tag rollup, this has a real,
 * meaningful denominator per cell — no "same total on every row" caveat.
 *
 * Returns long-format rows (one per non-empty category×tag cell), not a
 * pre-pivoted matrix — the caller joins these onto the category rows from
 * buildSignalCategoryStatsQuery by category_id, and derives the column set
 * from the distinct tags actually present. A cell absent from the result
 * means 0 opportunities for that combination, not a query error.
 */
export function buildCategoryProductTagMatrixQuery(
	scopedRunsCte: Prisma.Sql,
	capabilityTagIds: bigint[] = [],
): Prisma.Sql {
	return Prisma.sql`
      WITH scoped_runs AS (
        ${scopedRunsCte}
      ),
      ${buildLineageCtes(capabilityTagIds)},
      ${categorySignalLinksCte},
      category_opportunity_products AS (
        SELECT DISTINCT
          csl.category_id,
          csl.opportunity_id,
          oc.lead_product_id
        FROM category_signal_links csl
        INNER JOIN public.opportunity_candidates oc
          ON oc.id = csl.opportunity_id
      ),
      category_tag_links AS (
        SELECT
          cop.category_id,
          cop.opportunity_id,
          m.capability_tag_id
        FROM category_opportunity_products cop
        LEFT JOIN public.sm_customer_product_capability_map m
          ON m.customer_product_id = cop.lead_product_id
         AND m.role_type = 'anchor'
         AND m.is_active IS TRUE
      ),
      by_category_tag AS (
        SELECT
          category_id,
          capability_tag_id,
          COUNT(DISTINCT opportunity_id) AS opportunities_count
        FROM category_tag_links
        GROUP BY category_id, capability_tag_id
      ),
      search_task_categories AS (
        SELECT
          ssc.sm_signal_category_id AS category_id,
          sst.company_id
        FROM public.signal_search_tasks sst
        LEFT JOIN public.signal_definitions sd
          ON sd.id = sst.signal_definition_id
        LEFT JOIN public.sm_signal_subcategories ssc
          ON ssc.id = sd.sm_signal_subcategory_id
        INNER JOIN scoped_runs sr
          ON sr.id = sst.research_run_id
        WHERE sst.status = 'completed'
      ),
      search_counts AS (
        SELECT
          category_id,
          COUNT(*) AS completed_search_count
        FROM search_task_categories
        GROUP BY category_id
      ),
      ${categoryLabelsCte},
      tag_labels AS (
        SELECT id AS capability_tag_id, name AS tag_name
        FROM public.sm_capability_tags
      )
      SELECT
        bct.category_id,
        COALESCE(cl.category_name, 'Custom / Product Signals') AS category_name,
        bct.capability_tag_id,
        COALESCE(tl.tag_name, 'No Product Tag') AS tag_name,
        bct.opportunities_count,
        sc.completed_search_count,
        ROUND(
          bct.opportunities_count::numeric / NULLIF(sc.completed_search_count, 0) * 100,
          2
        ) AS signal_efficiency_pct
      FROM by_category_tag bct
      LEFT JOIN category_labels cl
        ON cl.category_id = bct.category_id
      LEFT JOIN tag_labels tl
        ON tl.capability_tag_id = bct.capability_tag_id
      LEFT JOIN search_counts sc
        ON sc.category_id IS NOT DISTINCT FROM bct.category_id
      ORDER BY
        bct.category_id,
        bct.opportunities_count DESC
    `;
}
