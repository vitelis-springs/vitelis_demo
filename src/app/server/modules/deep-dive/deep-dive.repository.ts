import { Prisma, report_status_enum } from "../../../../generated/prisma";
import prisma from "../../../../lib/prisma";

export interface DeepDiveListParams {
  limit: number;
  offset: number;
  query?: string;
  status?: report_status_enum;
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

export class DeepDiveRepository {
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

    const [items, total] = await prisma.$transaction([
      prisma.reports.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: params.offset,
        take: params.limit,
        include: {
          report_settings: true,
          report_orhestrator: true,
          use_cases: true,
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
      SELECT COALESCE(SUM(csc.sources_count), 0)::int AS total
      FROM company_sources_count csc
      WHERE csc.company_id IN (
        SELECT rc.company_id FROM report_companies rc WHERE rc.report_id = ${reportId}
      )
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

  static async getCompanySources(
    reportId: number,
    companyId: number,
    filters: SourceFilterParams,
  ) {
    const where: Prisma.sourcesWhereInput = {
      company_id: companyId,
      report_id: reportId,
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
      metadataGroups = await prisma.$queryRaw<
        Array<{ value: string | null; count: number }>
      >`
        SELECT metadata ->> ${filters.metaGroupBy} AS value,
               COUNT(*)::int AS count
        FROM sources
        WHERE company_id = ${companyId}
          AND report_id = ${reportId}
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
}
