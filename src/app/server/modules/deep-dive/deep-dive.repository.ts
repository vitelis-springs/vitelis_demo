import { Prisma, report_status_enum } from "../../../../generated/prisma";
import prisma from "../../../../lib/prisma";
import type { SortOrder } from "../../../../types/sorting";

export interface DeepDiveListParams {
  limit: number;
  offset: number;
  query?: string;
  status?: report_status_enum;
  useCaseId?: number;
  industryId?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface SourceFilterParams {
  limit: number;
  offset: number;
  tier?: number;
  isVectorized?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  metaKey?: string;
  metaValue?: string;
  metaGroupBy?: string;
}

export interface SourcesAnalyticsParams {
  limit: number;
  offset: number;
  tier?: number;
  qualityClass?: string;
  isValid?: boolean;
  agent?: string;
  category?: string;
  tag?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface ScrapeCandidatesParams {
  limit: number;
  offset: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export class DeepDiveRepository {
  private static buildOrderBy(
    sortBy: string | undefined,
    sortOrder: SortOrder | undefined,
    allowed: readonly string[],
    fallbackColumn: string,
    fallbackOrder: SortOrder = "desc",
  ): Prisma.Sql {
    const col = sortBy && allowed.includes(sortBy) ? sortBy : fallbackColumn;
    const dir = sortOrder === "asc" ? Prisma.sql`ASC` : sortOrder === "desc" ? Prisma.sql`DESC` : (fallbackOrder === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`);
    return Prisma.sql`ORDER BY ${Prisma.raw(`"${col}"`)} ${dir}`;
  }

  static async listReports(params: DeepDiveListParams) {
    const where: Prisma.reportsWhereInput = {};

    if (params.query) {
      where.OR = [
        { name: { contains: params.query, mode: "insensitive" } },
        { description: { contains: params.query, mode: "insensitive" } },
      ];
    }

    if (params.status) {
      where.report_orhestrator = { status: params.status };
    }

    if (params.useCaseId) {
      where.use_case_id = params.useCaseId;
    }

    if (params.industryId) {
      where.report_companies = {
        some: { companies: { industry_id: params.industryId } },
      };
    }

    const ALLOWED_SORT: Record<string, string> = {
      name: "name",
      created_at: "created_at",
      updated_at: "updates_at",
    };
    const sortField: string = params.sortBy && ALLOWED_SORT[params.sortBy]
      ? ALLOWED_SORT[params.sortBy]!
      : "created_at";
    const sortDir: Prisma.SortOrder = params.sortOrder === "asc" ? "asc" : "desc";

    const [items, total] = await prisma.$transaction([
      prisma.reports.findMany({
        where,
        orderBy: { [sortField]: sortDir },
        skip: params.offset,
        take: params.limit,
        include: {
          report_settings: true,
          report_orhestrator: true,
          use_cases: true,
          report_companies: {
            take: 1,
            include: { companies: { include: { industries: true } } },
          },
          _count: {
            select: {
              report_companies: true,
              report_steps: true,
            },
          },
        },
      }),
      prisma.reports.count({ where }),
    ]);

    return { items, total };
  }

  static async getDistinctUseCasesForReports() {
    return prisma.$queryRaw<Array<{ id: number; name: string }>>`
      SELECT DISTINCT uc.id, uc.name
      FROM use_cases uc
      JOIN reports r ON r.use_case_id = uc.id
      ORDER BY uc.name
    `;
  }

  static async getDistinctIndustriesForReports() {
    return prisma.$queryRaw<Array<{ id: number; name: string }>>`
      SELECT DISTINCT i.id, i.name
      FROM industries i
      JOIN companies c ON c.industry_id = i.id
      JOIN report_companies rc ON rc.company_id = c.id
      ORDER BY i.name
    `;
  }

  static async getReportById(reportId: number) {
    return prisma.reports.findUnique({
      where: { id: reportId },
      include: {
        report_settings: true,
        report_orhestrator: true,
        use_cases: true,
      },
    });
  }

  static async getReportSteps(reportId: number) {
    return prisma.report_steps.findMany({
      where: { report_id: reportId },
      orderBy: { step_order: "asc" },
      include: {
        report_generation_steps: true,
      },
    });
  }

  static async getReportQueries(reportId: number) {
    return prisma.report_data_collection_queries.findMany({
      where: { report_id: reportId },
      include: {
        data_collection_queries: true,
      },
    });
  }

  static async getReportCompanies(reportId: number) {
    return prisma.report_companies.findMany({
      where: { report_id: reportId },
      include: {
        companies: true,
      },
    });
  }

  static async getReportStepStatusSummary(reportId: number) {
    return prisma.report_step_statuses.groupBy({
      by: ["status"],
      where: { report_id: reportId },
      _count: { _all: true },
    });
  }

  static async getCompanyStepStatusSummary(
    reportId: number,
    companyIds: number[],
  ) {
    if (companyIds.length === 0) return [];

    return prisma.report_step_statuses.groupBy({
      by: ["company_id", "status"],
      where: {
        report_id: reportId,
        company_id: { in: companyIds },
      },
      _count: { _all: true },
    });
  }

  static async getCompanyStepStatusLatest(
    reportId: number,
    companyIds: number[],
  ) {
    if (companyIds.length === 0) return [];

    return prisma.report_step_statuses.groupBy({
      by: ["company_id"],
      where: {
        report_id: reportId,
        company_id: { in: companyIds },
      },
      _max: { updated_at: true },
    });
  }

  static async getReportResults(reportId: number) {
    return prisma.report_results.findMany({
      where: { report_id: reportId },
    });
  }

  static async getCompany(reportId: number, companyId: number) {
    const reportCompany = await prisma.report_companies.findUnique({
      where: {
        report_id_company_id: {
          report_id: reportId,
          company_id: companyId,
        },
      },
      include: { companies: true },
    });

    return reportCompany?.companies ?? null;
  }

  static async getCompanyStepStatuses(reportId: number, companyId: number) {
    return prisma.report_step_statuses.findMany({
      where: { report_id: reportId, company_id: companyId },
      include: { report_generation_steps: true },
    });
  }

  static async getCompanyKpiResults(reportId: number, companyId: number) {
    return prisma.report_data_point_results.findMany({
      where: { report_id: reportId, company_id: companyId },
      include: { data_points: true },
      orderBy: { updates_at: "desc" },
    });
  }

  static async getCompanyScrapCandidates(companyId: number, limit: number) {
    return prisma.scape_url_candidates.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: "desc" },
      take: limit,
    });
  }

  static async getCompanyScrapCandidatesCount(companyId: number) {
    return prisma.scape_url_candidates.count({
      where: { company_id: companyId },
    });
  }

  static async getReportQueriesCount(reportId: number) {
    return prisma.report_data_collection_queries.count({
      where: { report_id: reportId },
    });
  }

  static async getKpiCategoryScoresByCompany(reportId: number) {
    return prisma.$queryRaw<
      Array<{
        company_id: number;
        company_name: string;
        category: string;
        avg_score: number;
      }>
    >`
      SELECT
        rdpr.company_id,
        c.name AS company_name,
        dp.name AS category,
        AVG(rdpr.value::numeric)::float AS avg_score
      FROM report_data_point_results rdpr
      JOIN data_points dp ON dp.id = rdpr.data_point_id
      JOIN companies c ON c.id = rdpr.company_id
      WHERE rdpr.report_id = ${reportId}
        AND dp.type = 'kpi_category'
        AND rdpr.value IS NOT NULL
        AND rdpr.value ~ '^[0-9]+\.?[0-9]*$'
      GROUP BY rdpr.company_id, c.name, dp.name
      ORDER BY rdpr.company_id, dp.name
    `;
  }

  static async getReportSourcesCount(reportId: number) {
    const result = await prisma.$queryRaw<[{ total: number }]>`
      SELECT COUNT(*)::int AS total
      FROM report_companies rc
      JOIN sources s ON s.company_id = rc.company_id
      WHERE rc.report_id = ${reportId}
    `;
    return result[0]?.total ?? 0;
  }

  static async getReportScrapeCandidatesCount(reportId: number) {
    const result = await prisma.$queryRaw<[{ total: number }]>`
      SELECT COUNT(*)::int AS total
      FROM scape_url_candidates suc
      WHERE suc.company_id IN (
        SELECT rc.company_id FROM report_companies rc WHERE rc.report_id = ${reportId}
      )
    `;
    return result[0]?.total ?? 0;
  }

  static async getPerCompanySourcesCount(reportId: number) {
    return prisma.$queryRaw<Array<{ company_id: number; total: number; valid_count: number }>>`
      SELECT rc.company_id,
        COUNT(s.id)::int AS total,
        COUNT(CASE WHEN (s.metadata ->> 'isValid')::boolean = true THEN 1 END)::int AS valid_count
      FROM report_companies rc
      LEFT JOIN sources s ON s.company_id = rc.company_id
      WHERE rc.report_id = ${reportId}
      GROUP BY rc.company_id
    `;
  }

  static async getPerCompanyCandidatesCount(reportId: number) {
    return prisma.$queryRaw<Array<{ company_id: number; total: number }>>`
      SELECT rc.company_id, COUNT(suc.id)::int AS total
      FROM report_companies rc
      LEFT JOIN scape_url_candidates suc ON suc.company_id = rc.company_id
      WHERE rc.report_id = ${reportId}
      GROUP BY rc.company_id
    `;
  }

  static async getCompanySources(
    companyId: number,
    filters: SourceFilterParams,
  ) {
    const where: Prisma.sourcesWhereInput = {
      company_id: companyId,
    };

    if (filters.tier !== undefined) {
      where.tier = filters.tier;
    }

    if (filters.isVectorized !== undefined) {
      where.isVectorized = filters.isVectorized;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }

    if (filters.metaKey && filters.metaValue !== undefined) {
      where.metadata = {
        path: [filters.metaKey],
        equals: filters.metaValue,
      };
    }

    const [items, total, byTier, byVectorized] = await prisma.$transaction([
      prisma.sources.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: filters.offset,
        take: filters.limit,
        select: {
          id: true,
          url: true,
          title: true,
          summary: true,
          tier: true,
          date: true,
          metadata: true,
          isVectorized: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.sources.count({ where }),
      prisma.sources.groupBy({
        by: ["tier"],
        where,
        orderBy: { tier: "asc" },
        _count: { _all: true },
      }),
      prisma.sources.groupBy({
        by: ["isVectorized"],
        where,
        orderBy: { isVectorized: "asc" },
        _count: { _all: true },
      }),
    ]);

    let metadataGroups: Array<{ value: string | null; count: number }> | null =
      null;
    if (filters.metaGroupBy) {
      const conditions: Prisma.Sql[] = [
        Prisma.sql`company_id = ${companyId}`,
      ];
      if (filters.tier !== undefined) {
        conditions.push(Prisma.sql`tier = ${filters.tier}`);
      }
      if (filters.isVectorized !== undefined) {
        conditions.push(Prisma.sql`"isVectorized" = ${filters.isVectorized}`);
      }
      if (filters.dateFrom) {
        conditions.push(Prisma.sql`date >= ${filters.dateFrom}`);
      }
      if (filters.dateTo) {
        conditions.push(Prisma.sql`date <= ${filters.dateTo}`);
      }
      if (filters.metaKey && filters.metaValue !== undefined) {
        conditions.push(Prisma.sql`metadata ->> ${filters.metaKey} = ${filters.metaValue}`);
      }

      metadataGroups = await prisma.$queryRaw<
        Array<{ value: string | null; count: number }>
      >`
        SELECT metadata ->> ${filters.metaGroupBy} AS value,
               COUNT(*)::int AS count
        FROM sources
        WHERE ${Prisma.join(conditions, " AND ")}
        GROUP BY value
        ORDER BY count DESC
      `;
    }

    return {
      items,
      total,
      byTier,
      byVectorized,
      metadataGroups,
    };
  }

  private static buildSourcesWhere(
    companyId: number,
    filters: SourcesAnalyticsParams,
  ): Prisma.Sql {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`company_id = ${companyId}`,
    ];

    if (filters.tier !== undefined) {
      conditions.push(Prisma.sql`tier = ${filters.tier}`);
    }
    if (filters.qualityClass) {
      conditions.push(Prisma.sql`metadata ->> 'quality_class' = ${filters.qualityClass}`);
    }
    if (filters.isValid !== undefined) {
      conditions.push(Prisma.sql`(metadata ->> 'isValid')::boolean = ${filters.isValid}`);
    }
    if (filters.agent) {
      conditions.push(Prisma.sql`metadata -> 'agents' ? ${filters.agent}`);
    }
    if (filters.category) {
      conditions.push(Prisma.sql`metadata -> 'categories' ? ${filters.category}`);
    }
    if (filters.tag) {
      conditions.push(Prisma.sql`metadata -> 'tags' ? ${filters.tag}`);
    }
    if (filters.dateFrom) {
      conditions.push(Prisma.sql`date >= ${filters.dateFrom}`);
    }
    if (filters.dateTo) {
      conditions.push(Prisma.sql`date <= ${filters.dateTo}`);
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(Prisma.sql`(title ILIKE ${pattern} OR url ILIKE ${pattern})`);
    }

    return Prisma.join(conditions, " AND ");
  }

  static async getSourcesAnalytics(
    companyId: number,
    filters: SourcesAnalyticsParams,
  ) {
    // Use $queryRaw(Prisma.sql`...`) function-call syntax instead of tagged template.
    // Tagged template $queryRaw`...` treats Prisma.Sql objects as plain parameters
    // and serializes them as JSON strings. Function-call syntax lets Prisma.sql
    // properly compose nested Prisma.Sql fragments before sending to $queryRaw.
    const w = () => this.buildSourcesWhere(companyId, filters);

    const [
      totalUnfilteredResult,
      totalFilteredResult,
      qualityClassAgg,
      vectorizedCountResult,
      queryIdsAgg,
      agentsAgg,
      categoriesAgg,
      tagsAgg,
      isValidAgg,
      scoresAgg,
      items,
    ] = await Promise.all([
      prisma.$queryRaw<[{ count: number }]>(
        Prisma.sql`SELECT COUNT(*)::int AS count FROM sources WHERE company_id = ${companyId}`
      ),
      prisma.$queryRaw<[{ count: number }]>(
        Prisma.sql`SELECT COUNT(*)::int AS count FROM sources WHERE ${w()}`
      ),
      prisma.$queryRaw<Array<{ value: string | null; count: number }>>(
        Prisma.sql`SELECT metadata ->> 'quality_class' AS value, COUNT(*)::int AS count
        FROM sources WHERE ${w()}
        GROUP BY value ORDER BY count DESC`
      ),
      prisma.$queryRaw<[{ count: number }]>(
        Prisma.sql`SELECT COUNT(*)::int AS count FROM sources WHERE ${w()} AND "isVectorized" = true`
      ),
      prisma.$queryRaw<Array<{ query_id: string; goal: string | null; count: number }>>(
        Prisma.sql`SELECT qid AS query_id, dcq.query ->> 'goal' AS goal, COUNT(*)::int AS count
        FROM sources, jsonb_array_elements_text(metadata -> 'query_ids') AS qid
        LEFT JOIN data_collection_queries dcq ON dcq.id = qid::bigint
        WHERE ${w()}
        GROUP BY qid, dcq.query ->> 'goal' ORDER BY count DESC`
      ),
      prisma.$queryRaw<Array<{ value: string; count: number }>>(
        Prisma.sql`SELECT agent AS value, COUNT(*)::int AS count
        FROM sources, jsonb_array_elements_text(metadata -> 'agents') AS agent
        WHERE ${w()}
        GROUP BY agent ORDER BY count DESC`
      ),
      prisma.$queryRaw<Array<{ value: string; count: number }>>(
        Prisma.sql`SELECT cat AS value, COUNT(*)::int AS count
        FROM sources, jsonb_array_elements_text(metadata -> 'categories') AS cat
        WHERE ${w()}
        GROUP BY cat ORDER BY count DESC`
      ),
      prisma.$queryRaw<Array<{ value: string; count: number }>>(
        Prisma.sql`SELECT tag AS value, COUNT(*)::int AS count
        FROM sources, jsonb_array_elements_text(metadata -> 'tags') AS tag
        WHERE ${w()}
        GROUP BY tag ORDER BY count DESC`
      ),
      prisma.$queryRaw<Array<{ value: boolean; count: number }>>(
        Prisma.sql`SELECT (metadata ->> 'isValid')::boolean AS value, COUNT(*)::int AS count
        FROM sources WHERE ${w()}
        GROUP BY value ORDER BY value DESC`
      ),
      prisma.$queryRaw<[{
        relevance: number; authority: number; freshness: number;
        originality: number; security: number; extractability: number;
      }]>(
        Prisma.sql`SELECT
          COALESCE(AVG((metadata -> 'scores' ->> 'relevance')::numeric), 0)::float AS relevance,
          COALESCE(AVG((metadata -> 'scores' ->> 'authority')::numeric), 0)::float AS authority,
          COALESCE(AVG((metadata -> 'scores' ->> 'freshness')::numeric), 0)::float AS freshness,
          COALESCE(AVG((metadata -> 'scores' ->> 'originality')::numeric), 0)::float AS originality,
          COALESCE(AVG((metadata -> 'scores' ->> 'security')::numeric), 0)::float AS security,
          COALESCE(AVG((metadata -> 'scores' ->> 'extractability')::numeric), 0)::float AS extractability
        FROM sources WHERE ${w()} AND metadata -> 'scores' IS NOT NULL`
      ),
      prisma.$queryRaw<Array<{
        id: number; url: string; title: string | null; tier: number | null;
        date: Date | null; is_vectorized: boolean | null; metadata: unknown;
        created_at: Date | null;
      }>>(
        Prisma.sql`SELECT id, url, title, tier, date, "isVectorized" AS is_vectorized, metadata, created_at
        FROM sources WHERE ${w()}
        ${this.buildOrderBy(filters.sortBy, filters.sortOrder, ["title", "tier", "created_at"], "created_at")}
        LIMIT ${filters.limit} OFFSET ${filters.offset}`
      ),
    ]);

    return {
      totalUnfiltered: totalUnfilteredResult[0]?.count ?? 0,
      totalFiltered: totalFilteredResult[0]?.count ?? 0,
      vectorizedCount: vectorizedCountResult[0]?.count ?? 0,
      aggregations: {
        qualityClass: qualityClassAgg,
        queryIds: queryIdsAgg,
        agents: agentsAgg,
        categories: categoriesAgg,
        tags: tagsAgg,
        isValid: isValidAgg,
        scores: scoresAgg[0] ?? {
          relevance: 0, authority: 0, freshness: 0,
          originality: 0, security: 0, extractability: 0,
        },
      },
      items,
    };
  }

  private static buildCandidatesWhere(
    companyId: number,
    filters: ScrapeCandidatesParams,
  ): Prisma.Sql {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`company_id = ${companyId}`,
    ];

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        Prisma.sql`(url ILIKE ${pattern} OR title ILIKE ${pattern} OR description ILIKE ${pattern})`,
      );
    }

    return Prisma.join(conditions, " AND ");
  }

  static async getReportQueriesWithStats(
    reportId: number,
    sortBy?: string,
    sortOrder?: SortOrder,
  ) {
    return prisma.$queryRaw<
      Array<{
        id: bigint;
        goal: string | null;
        search_queries: string[] | null;
        sources_count: number;
        candidates_count: number;
        completed_companies: number;
        total_companies: number;
        data_points: Array<{ id: string; name: string | null; type: string | null }> | null;
      }>
    >(
      Prisma.sql`
        WITH rc AS (
          SELECT company_id
          FROM report_companies
          WHERE report_id = ${reportId}
        ),
        src AS (
          SELECT
            (qid.value)::bigint AS query_id,
            COUNT(DISTINCT s.id)::int AS cnt
          FROM sources s
          JOIN rc ON rc.company_id = s.company_id
          CROSS JOIN LATERAL jsonb_array_elements_text(s.metadata -> 'query_ids') AS qid(value)
          GROUP BY (qid.value)::bigint
        ),
        cand AS (
          SELECT
            (qid.value)::bigint AS query_id,
            COUNT(DISTINCT suc.id)::int AS cnt
          FROM scape_url_candidates suc
          JOIN rc ON rc.company_id = suc.company_id
          CROSS JOIN LATERAL jsonb_array_elements_text(suc.metadata -> 'query_ids') AS qid(value)
          GROUP BY (qid.value)::bigint
        ),
        comp AS (
          SELECT
            data_collection_query_id AS query_id,
            COUNT(*)::int AS done
          FROM report_data_collection_query_completions
          WHERE report_id = ${reportId} AND status = true
          GROUP BY data_collection_query_id
        ),
        tc AS (
          SELECT COUNT(*)::int AS total
          FROM rc
        ),
        dp_agg AS (
          SELECT
            dqp.data_collection_query_id AS query_id,
            jsonb_agg(jsonb_build_object('id', dp.id, 'name', dp.name, 'type', dp.type)) AS data_points
          FROM data_collection_query_data_point dqp
          JOIN data_points dp ON dp.id = dqp.data_point_id
          GROUP BY dqp.data_collection_query_id
        )
        SELECT
          dcq.id,
          dcq.query ->> 'goal' AS goal,
          COALESCE(
            (SELECT jsonb_agg(sq)
             FROM jsonb_array_elements_text(dcq.query -> 'search_queries') AS sq),
            '[]'::jsonb
          )::jsonb AS search_queries,
          COALESCE(src.cnt, 0)::int AS sources_count,
          COALESCE(cand.cnt, 0)::int AS candidates_count,
          COALESCE(comp.done, 0)::int AS completed_companies,
          tc.total AS total_companies,
          dp_agg.data_points
        FROM report_data_collection_queries rdcq
        JOIN data_collection_queries dcq ON dcq.id = rdcq.data_collection_query_id
        LEFT JOIN src ON src.query_id = dcq.id
        LEFT JOIN cand ON cand.query_id = dcq.id
        LEFT JOIN comp ON comp.query_id = dcq.id
        CROSS JOIN tc
        LEFT JOIN dp_agg ON dp_agg.query_id = dcq.id
        WHERE rdcq.report_id = ${reportId}
        ${this.buildOrderBy(sortBy, sortOrder, ["goal", "sources_count", "candidates_count"], "id", "asc")}
      `
    );
  }

  static async updateQueryContent(
    queryId: bigint,
    payload: { goal: string; search_queries: string[] },
  ) {
    return prisma.data_collection_queries.update({
      where: { id: queryId },
      data: {
        query: payload,
      },
    });
  }

  static async verifyQueryBelongsToReport(reportId: number, queryId: bigint) {
    return prisma.report_data_collection_queries.findFirst({
      where: {
        report_id: reportId,
        data_collection_query_id: queryId,
      },
    });
  }

  static async getScrapeCandidatesList(
    companyId: number,
    filters: ScrapeCandidatesParams,
  ) {
    const w = () => this.buildCandidatesWhere(companyId, filters);

    const [totalResult, totalFilteredResult, agentsAgg, queryIdsAgg, items] = await Promise.all([
      prisma.$queryRaw<[{ count: number }]>(
        Prisma.sql`SELECT COUNT(*)::int AS count FROM scape_url_candidates WHERE company_id = ${companyId}`
      ),
      prisma.$queryRaw<[{ count: number }]>(
        Prisma.sql`SELECT COUNT(*)::int AS count FROM scape_url_candidates WHERE ${w()}`
      ),
      prisma.$queryRaw<Array<{ value: string; count: number }>>(
        Prisma.sql`SELECT agent AS value, COUNT(*)::int AS count
        FROM scape_url_candidates, jsonb_array_elements_text(metadata -> 'agents') AS agent
        WHERE ${w()}
        GROUP BY agent ORDER BY count DESC`
      ),
      prisma.$queryRaw<Array<{ query_id: string; goal: string | null; count: number }>>(
        Prisma.sql`SELECT qid AS query_id, dcq.query ->> 'goal' AS goal, COUNT(*)::int AS count
        FROM scape_url_candidates, jsonb_array_elements_text(metadata -> 'query_ids') AS qid
        LEFT JOIN data_collection_queries dcq ON dcq.id = qid::bigint
        WHERE ${w()}
        GROUP BY qid, dcq.query ->> 'goal' ORDER BY count DESC`
      ),
      prisma.$queryRaw<Array<{
        id: number; url: string; title: string | null; description: string | null;
        status: string; metadata: unknown; created_at: Date;
      }>>(
        Prisma.sql`SELECT id, url, title, description, status, metadata, created_at
        FROM scape_url_candidates WHERE ${w()}
        ${this.buildOrderBy(filters.sortBy, filters.sortOrder, ["url", "status", "created_at"], "created_at")}
        LIMIT ${filters.limit} OFFSET ${filters.offset}`
      ),
    ]);

    return {
      total: totalResult[0]?.count ?? 0,
      totalFiltered: totalFilteredResult[0]?.count ?? 0,
      aggregations: {
        agents: agentsAgg,
        queryIds: queryIdsAgg,
      },
      items,
    };
  }
}
