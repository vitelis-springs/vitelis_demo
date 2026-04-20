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
  reportType?: string;
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

export interface SourceCountingContext {
  useNewModel: boolean;
  sourceValidationSettingsId: number | null;
}

export interface ReportSettingsProfile {
  id: number;
  name: string;
  masterFileId: string;
  prefix: number | null;
  settings: unknown;
}

export interface ValidatorSettingsProfile {
  id: number;
  name: string;
  settings: unknown;
}

export interface DeepDiveSettingsSnapshot {
  reportId: number;
  reportName: string | null;
  reportSettingsId: number | null;
  sourceValidationSettingsId: number | null;
  reportSettings: ReportSettingsProfile | null;
  validatorSettings: ValidatorSettingsProfile | null;
}

export interface CompanyDataPointResultUpdateData {
  value?: string | null;
  manualValue?: string | null;
  data?: Prisma.InputJsonValue;
  status?: boolean;
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

  static async createReport(data: {
    name: string;
    description?: string;
    useCaseId?: number;
    reportType: string;
    reportSettings: { name: string; masterFileId: string; prefix: number | null; settings: unknown };
    sourceValidationSettings: { name: string; settings: unknown };
  }) {
    return prisma.$transaction(async (tx) => {
      // Compute next IDs for all three tables before any insert
      const [{ _max: rsMax }, { _max: svsMax }, { _max: rMax }] = await Promise.all([
        tx.report_settings.aggregate({ _max: { id: true } }),
        tx.source_validation_settings.aggregate({ _max: { id: true } }),
        tx.reports.aggregate({ _max: { id: true } }),
      ]);
      const rsId = (rsMax.id ?? 0) + 1;
      const svsId = (svsMax.id ?? 0) + 1;
      const reportId = (rMax.id ?? 0) + 1;

      const [rs, svs] = await Promise.all([
        tx.report_settings.create({
          data: {
            id: rsId,
            name: data.reportSettings.name,
            master_file_id: data.reportSettings.masterFileId,
            prefix: data.reportSettings.prefix,
            settings: data.reportSettings.settings as Prisma.InputJsonValue,
          },
        }),
        tx.source_validation_settings.create({
          data: {
            id: svsId,
            name: data.sourceValidationSettings.name,
            settings: data.sourceValidationSettings.settings as Prisma.InputJsonValue,
          },
        }),
      ]);

      const [report] = await Promise.all([
        tx.reports.create({
          data: {
            id: reportId,
            name: data.name,
            description: data.description ?? null,
            use_case_id: data.useCaseId ?? null,
            report_type: data.reportType,
            report_settings_id: rs.id,
            source_validation_settings_id: svs.id,
          },
        }),
        tx.report_orhestrator.create({
          data: {
            report_id: reportId,
            status: report_status_enum.PENDING,
            metadata: { parralel_limit: 1 },
          },
        }),
      ]);

      return report;
    });
  }

  static async cloneReportRelatedData(
    donorId: number,
    newReportId: number,
    options: { orchestrator: boolean; kpiModel: boolean; companies: boolean }
  ) {
    return prisma.$transaction(async (tx) => {
      // Read all donor data first (reads are cheap inside tx)
      const [donorOrchestrator, donorSteps, donorDataPoints, donorCompanies] = await Promise.all([
        options.orchestrator ? tx.report_orhestrator.findUnique({ where: { report_id: donorId } }) : null,
        options.orchestrator ? tx.report_steps.findMany({ where: { report_id: donorId } }) : [],
        options.kpiModel ? tx.report_data_points.findMany({ where: { report_id: donorId } }) : [],
        options.companies ? tx.report_companies.findMany({ where: { report_id: donorId } }) : [],
      ]);

      const writes: Promise<unknown>[] = [];

      if (options.orchestrator) {
        writes.push(
          tx.report_orhestrator.update({
            where: { report_id: newReportId },
            data: { metadata: donorOrchestrator?.metadata ?? { parralel_limit: 1 } },
          })
        );
        if (donorSteps.length > 0) {
          writes.push(
            tx.report_steps.createMany({
              data: donorSteps.map((s) => ({
                report_id: newReportId,
                step_id: s.step_id,
                step_order: s.step_order,
              })),
            })
          );
        }
      }

      if (options.kpiModel && donorDataPoints.length > 0) {
        writes.push(
          tx.report_data_points.createMany({
            data: donorDataPoints.map((dp) => ({
              report_id: newReportId,
              data_point_id: dp.data_point_id,
              include_to_report: dp.include_to_report,
            })),
            skipDuplicates: true,
          })
        );
      }

      if (options.companies && donorCompanies.length > 0) {
        writes.push(
          tx.report_companies.createMany({
            data: donorCompanies.map((rc) => ({
              report_id: newReportId,
              company_id: rc.company_id,
            })),
            skipDuplicates: true,
          })
        );
      }

      if (writes.length > 0) await Promise.all(writes);
    });
  }

  static async listReports(params: DeepDiveListParams) {
    const where: Prisma.reportsWhereInput = {
      report_type: { not: null },
    };

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

    if (params.reportType) {
      where.report_type = params.reportType;
    }

    const ALLOWED_SORT: Record<string, string> = {
      id: "id",
      name: "name",
      created_at: "created_at",
      updated_at: "updates_at",
    };
    const sortField: string = params.sortBy && ALLOWED_SORT[params.sortBy]
      ? ALLOWED_SORT[params.sortBy]!
      : "id";
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

  static async getReportSettingsSnapshot(
    reportId: number
  ): Promise<DeepDiveSettingsSnapshot | null> {
    const row = await prisma.reports.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        name: true,
        report_settings_id: true,
        source_validation_settings_id: true,
        report_settings: true,
        source_validation_settings: true,
      },
    });
    if (!row) return null;

    return {
      reportId: row.id,
      reportName: row.name,
      reportSettingsId: row.report_settings_id,
      sourceValidationSettingsId: row.source_validation_settings_id,
      reportSettings: row.report_settings
        ? {
            id: row.report_settings.id,
            name: row.report_settings.name,
            masterFileId: row.report_settings.master_file_id,
            prefix: row.report_settings.prefix,
            settings: row.report_settings.settings,
          }
        : null,
      validatorSettings: row.source_validation_settings
        ? {
            id: row.source_validation_settings.id,
            name: row.source_validation_settings.name,
            settings: row.source_validation_settings.settings,
          }
        : null,
    };
  }

  static async listReportSettings(): Promise<ReportSettingsProfile[]> {
    const rows = await prisma.report_settings.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      masterFileId: row.master_file_id,
      prefix: row.prefix,
      settings: row.settings,
    }));
  }

  static async listValidatorSettings(): Promise<ValidatorSettingsProfile[]> {
    const rows = await prisma.source_validation_settings.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      settings: row.settings,
    }));
  }

  static async getReportSettingsById(
    id: number
  ): Promise<ReportSettingsProfile | null> {
    const row = await prisma.report_settings.findUnique({ where: { id } });
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      masterFileId: row.master_file_id,
      prefix: row.prefix,
      settings: row.settings,
    };
  }

  static async getValidatorSettingsById(
    id: number
  ): Promise<ValidatorSettingsProfile | null> {
    const row = await prisma.source_validation_settings.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      settings: row.settings,
    };
  }

  static async createReportSettings(data: {
    name: string;
    masterFileId: string;
    prefix: number | null;
    settings: unknown;
  }): Promise<ReportSettingsProfile> {
    const { _max } = await prisma.report_settings.aggregate({ _max: { id: true } });
    const nextId = (_max.id ?? 0) + 1;

    const created = await prisma.report_settings.create({
      data: {
        id: nextId,
        name: data.name,
        master_file_id: data.masterFileId,
        prefix: data.prefix,
        settings: data.settings as Prisma.InputJsonValue,
      },
    });

    return {
      id: created.id,
      name: created.name,
      masterFileId: created.master_file_id,
      prefix: created.prefix,
      settings: created.settings,
    };
  }

  static async createValidatorSettings(data: {
    name: string;
    settings: unknown;
  }): Promise<ValidatorSettingsProfile> {
    const { _max } = await prisma.source_validation_settings.aggregate({ _max: { id: true } });
    const nextId = (_max.id ?? 0) + 1;

    const created = await prisma.source_validation_settings.create({
      data: {
        id: nextId,
        name: data.name,
        settings: data.settings as Prisma.InputJsonValue,
      },
    });
    return {
      id: created.id,
      name: created.name,
      settings: created.settings,
    };
  }

  static async updateReportSettingsReferences(
    reportId: number,
    reportSettingsId: number | null,
    sourceValidationSettingsId: number | null
  ): Promise<boolean> {
    const result = await prisma.reports.updateMany({
      where: { id: reportId },
      data: {
        report_settings_id: reportSettingsId,
        source_validation_settings_id: sourceValidationSettingsId,
      },
    });
    return result.count > 0;
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

  static async getReportStepsCount(reportId: number) {
    return prisma.report_steps.count({
      where: { report_id: reportId },
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

  static async createCompanyAndLink(
    reportId: number,
    data: {
      name: string;
      url?: string | null;
      countryCode?: string | null;
      industryId?: number | null;
      investPortal?: string | null;
      careerPortal?: string | null;
      slug?: string | null;
      reportRole?: string | null;
      additionalData?: unknown;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const company = await tx.companies.create({
        data: {
          name: data.name,
          url: data.url ?? null,
          country_code: data.countryCode ?? null,
          ...(data.industryId != null
            ? { industries: { connect: { id: data.industryId } } }
            : {}),
          invest_portal: data.investPortal ?? null,
          career_portal: data.careerPortal ?? null,
          slug: data.slug ?? null,
          report_role: data.reportRole ?? null,
          ...(data.additionalData != null
            ? { additional_data: data.additionalData as Parameters<typeof tx.companies.create>[0]["data"]["additional_data"] }
            : {}),
        },
      });

      await tx.report_companies.create({
        data: { report_id: reportId, company_id: company.id },
      });

      return company;
    });
  }

  static async linkCompanyToReport(reportId: number, companyId: number) {
    return prisma.report_companies.create({
      data: { report_id: reportId, company_id: companyId },
    });
  }

  static async updateCompany(
    companyId: number,
    data: {
      name?: string;
      url?: string | null;
      countryCode?: string | null;
      industryId?: number | null;
      investPortal?: string | null;
      careerPortal?: string | null;
      slug?: string | null;
      reportRole?: string | null;
      additionalData?: unknown;
    }
  ) {
    return prisma.companies.update({
      where: { id: companyId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.url !== undefined ? { url: data.url } : {}),
        ...(data.countryCode !== undefined ? { country_code: data.countryCode } : {}),
        ...(data.industryId !== undefined
          ? data.industryId != null
            ? { industries: { connect: { id: data.industryId } } }
            : { industries: { disconnect: true } }
          : {}),
        ...(data.investPortal !== undefined ? { invest_portal: data.investPortal } : {}),
        ...(data.careerPortal !== undefined ? { career_portal: data.careerPortal } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.reportRole !== undefined ? { report_role: data.reportRole } : {}),
        ...(data.additionalData !== undefined
          ? { additional_data: data.additionalData as Parameters<typeof prisma.companies.update>[0]["data"]["additional_data"] }
          : {}),
      },
    });
  }

  static async searchCompaniesByName(query: string, limit = 20) {
    return prisma.companies.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      select: { id: true, name: true, country_code: true, url: true },
      orderBy: { name: "asc" },
      take: limit,
    });
  }

  static async getReportCompaniesCount(reportId: number) {
    return prisma.report_companies.count({
      where: { report_id: reportId },
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

  static async getCompanyDataPointResultById(
    reportId: number,
    companyId: number,
    resultId: number,
  ) {
    return prisma.report_data_point_results.findFirst({
      where: {
        id: resultId,
        report_id: reportId,
        company_id: companyId,
      },
      include: { data_points: true },
    });
  }

  static async updateCompanyDataPointResult(
    resultId: number,
    data: CompanyDataPointResultUpdateData,
  ) {
    return prisma.report_data_point_results.update({
      where: { id: resultId },
      data,
      include: { data_points: true },
    });
  }

  static async getCompanyScrapCandidates(
    reportId: number,
    companyId: number,
    limit: number,
    context?: SourceCountingContext,
  ) {
    const sourceContext = context ?? await this.getSourceCountingContext(reportId);

    if (sourceContext.useNewModel && sourceContext.sourceValidationSettingsId !== null) {
      return prisma.$queryRaw<Array<{
        id: number;
        title: string | null;
        description: string | null;
        url: string;
        status: string;
        metadata: unknown;
        created_at: Date | null;
        updated_at: Date | null;
      }>>(
        Prisma.sql`
          WITH dedup AS (
            SELECT
              MIN(ruc.id)::int AS id,
              (ARRAY_AGG(ruc.url ORDER BY ruc.id DESC))[1] AS url,
              BOOL_AND(COALESCE(ruc.proccesed, false)) AS all_processed,
              ARRAY_REMOVE(ARRAY_AGG(DISTINCT ruc.query_id::text), NULL) AS query_ids,
              ARRAY_REMOVE(ARRAY_AGG(DISTINCT ruc.agent), NULL) AS agents,
              COUNT(*)::int AS duplicates_count,
              MAX(ruc.id) AS sort_id
            FROM report_url_candidates ruc
            WHERE ruc.report_id = ${reportId}
              AND ruc.company_id = ${companyId}
            GROUP BY regexp_replace(lower(trim(ruc.url)), '/+$', '')
          )
          SELECT
            id,
            NULL::text AS title,
            NULL::text AS description,
            url,
            CASE WHEN all_processed THEN 'processed' ELSE 'pending' END AS status,
            jsonb_build_object(
              'query_ids', query_ids,
              'agents', agents,
              'duplicates_count', duplicates_count
            ) AS metadata,
            NULL::timestamp AS created_at,
            NULL::timestamp AS updated_at
          FROM dedup
          ORDER BY sort_id DESC
          LIMIT ${limit}
        `
      );
    }

    return prisma.scape_url_candidates.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: "desc" },
      take: limit,
    });
  }

  static async getCompanyScrapCandidatesCount(
    reportId: number,
    companyId: number,
    context?: SourceCountingContext,
  ) {
    const sourceContext = context ?? await this.getSourceCountingContext(reportId);

    if (sourceContext.useNewModel && sourceContext.sourceValidationSettingsId !== null) {
      const result = await prisma.$queryRaw<[{ count: number }]>(
        Prisma.sql`
          SELECT COUNT(*)::int AS count
          FROM (
            SELECT regexp_replace(lower(trim(ruc.url)), '/+$', '') AS normalized_url
            FROM report_url_candidates ruc
            WHERE ruc.report_id = ${reportId}
              AND ruc.company_id = ${companyId}
            GROUP BY normalized_url
          ) dedup
        `
      );
      return result[0]?.count ?? 0;
    }

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
        AVG((regexp_match(rdpr.value, '^\s*([0-9]+(?:\.[0-9]+)?)'))[1]::numeric)::float AS avg_score
      FROM report_data_point_results rdpr
      JOIN data_points dp ON dp.id = rdpr.data_point_id
      JOIN companies c ON c.id = rdpr.company_id
      WHERE rdpr.report_id = ${reportId}
        AND dp.type = 'kpi_category'
        AND rdpr.value IS NOT NULL
        AND rdpr.value ~ '^\s*[0-9]+(\.[0-9]+)?(\s+.+)?$'
      GROUP BY rdpr.company_id, c.name, dp.name
      ORDER BY rdpr.company_id, dp.name
    `;
  }

  static async getSourceCountingContext(reportId: number): Promise<SourceCountingContext> {
    const result = await prisma.$queryRaw<Array<{
      source_validation_settings_id: number | null;
      use_new_model: boolean;
    }>>`
      SELECT
        r.source_validation_settings_id,
        CASE
          WHEN r.source_validation_settings_id IS NULL THEN false
          WHEN EXISTS (
            SELECT 1
            FROM report_companies rc
            JOIN source_metadata sm ON sm.company_id = rc.company_id
            WHERE rc.report_id = r.id
              AND sm.source_validation_settings_id = r.source_validation_settings_id
          ) THEN true
          ELSE false
        END AS use_new_model
      FROM reports r
      WHERE r.id = ${reportId}
      LIMIT 1
    `;

    const row = Array.isArray(result) ? result[0] : undefined;
    if (!row) {
      return { useNewModel: false, sourceValidationSettingsId: null };
    }

    return {
      useNewModel: row.use_new_model,
      sourceValidationSettingsId: row.source_validation_settings_id,
    };
  }

  static async getReportSourcesCount(
    reportId: number,
    context?: SourceCountingContext,
  ) {
    const sourceContext = context ?? await this.getSourceCountingContext(reportId);

    if (sourceContext.useNewModel && sourceContext.sourceValidationSettingsId !== null) {
      const result = await prisma.$queryRaw<[{ total: number }]>`
        SELECT COUNT(DISTINCT sm.source_id)::int AS total
        FROM report_companies rc
        JOIN source_metadata sm ON sm.company_id = rc.company_id
        WHERE rc.report_id = ${reportId}
          AND sm.source_validation_settings_id = ${sourceContext.sourceValidationSettingsId}
      `;
      return result?.[0]?.total ?? 0;
    }

    const legacy = await prisma.$queryRaw<[{ total: number }]>`
      SELECT COUNT(*)::int AS total
      FROM report_companies rc
      JOIN sources s ON s.company_id = rc.company_id
      WHERE rc.report_id = ${reportId}
    `;
    return legacy?.[0]?.total ?? 0;
  }

  static async getReportUsedSourcesCount(
    reportId: number,
    context?: SourceCountingContext,
  ) {
    const sourceContext = context ?? await this.getSourceCountingContext(reportId);

    if (sourceContext.useNewModel && sourceContext.sourceValidationSettingsId !== null) {
      const result = await prisma.$queryRaw<[{ total: number }]>`
        WITH extracted AS (
          SELECT
            rdpr.company_id,
            regexp_replace(lower(trim((m.match_arr)[1])), '/+$', '') AS normalized_url
          FROM report_data_point_results rdpr
          CROSS JOIN LATERAL regexp_matches(
            COALESCE(rdpr.data ->> 'Sources', ''),
            '(https?://[^\\s\\n]+)',
            'g'
          ) AS m(match_arr)
          WHERE rdpr.report_id = ${reportId}
        )
        SELECT COUNT(DISTINCT sm.source_id)::int AS total
        FROM extracted e
        JOIN sources_new sn
          ON regexp_replace(lower(trim(sn.url)), '/+$', '') = e.normalized_url
        JOIN source_metadata sm
          ON sm.source_id = sn.id
         AND sm.company_id = e.company_id
        WHERE sm.source_validation_settings_id = ${sourceContext.sourceValidationSettingsId}
          AND COALESCE((sm.metadata ->> 'isValid')::boolean, false) = true
      `;
      return result?.[0]?.total ?? 0;
    }

    const legacy = await prisma.$queryRaw<[{ total: number }]>`
      WITH extracted AS (
        SELECT
          rdpr.company_id,
          regexp_replace(lower(trim((m.match_arr)[1])), '/+$', '') AS normalized_url
        FROM report_data_point_results rdpr
        CROSS JOIN LATERAL regexp_matches(
          COALESCE(rdpr.data ->> 'Sources', ''),
          '(https?://[^\\s\\n]+)',
          'g'
        ) AS m(match_arr)
        WHERE rdpr.report_id = ${reportId}
      )
      SELECT COUNT(DISTINCT s.id)::int AS total
      FROM extracted e
      JOIN sources s
        ON s.company_id = e.company_id
       AND regexp_replace(lower(trim(s.url)), '/+$', '') = e.normalized_url
    `;
    return legacy?.[0]?.total ?? 0;
  }

  static async getReportScrapeCandidatesCount(
    reportId: number,
    context?: SourceCountingContext,
  ) {
    const sourceContext = context ?? await this.getSourceCountingContext(reportId);

    if (sourceContext.useNewModel && sourceContext.sourceValidationSettingsId !== null) {
      const result = await prisma.$queryRaw<[{ total: number }]>`
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT
            company_id,
            regexp_replace(lower(trim(url)), '/+$', '') AS normalized_url
          FROM report_url_candidates
          WHERE report_id = ${reportId}
          GROUP BY company_id, normalized_url
        ) dedup
      `;
      return result?.[0]?.total ?? 0;
    }

    const legacy = await prisma.$queryRaw<[{ total: number }]>`
      SELECT COUNT(*)::int AS total
      FROM scape_url_candidates suc
      WHERE suc.company_id IN (
        SELECT rc.company_id FROM report_companies rc WHERE rc.report_id = ${reportId}
      )
    `;
    return legacy?.[0]?.total ?? 0;
  }

  static async getPerCompanySourcesCount(
    reportId: number,
    context?: SourceCountingContext,
  ) {
    const sourceContext = context ?? await this.getSourceCountingContext(reportId);

    if (sourceContext.useNewModel && sourceContext.sourceValidationSettingsId !== null) {
      const rows = await prisma.$queryRaw<Array<{ company_id: number; total: number; valid_count: number }>>`
        SELECT
          rc.company_id,
          COUNT(DISTINCT sm.source_id)::int AS total,
          COUNT(DISTINCT sm.source_id)
            FILTER (WHERE COALESCE((sm.metadata ->> 'isValid')::boolean, false) = true)::int AS valid_count
        FROM report_companies rc
        LEFT JOIN source_metadata sm
          ON sm.company_id = rc.company_id
         AND sm.source_validation_settings_id = ${sourceContext.sourceValidationSettingsId}
        WHERE rc.report_id = ${reportId}
        GROUP BY rc.company_id
      `;
      return rows ?? [];
    }

    const legacyRows = await prisma.$queryRaw<Array<{ company_id: number; total: number; valid_count: number }>>`
      SELECT rc.company_id,
        COUNT(s.id)::int AS total,
        COUNT(CASE WHEN (s.metadata ->> 'isValid')::boolean = true THEN 1 END)::int AS valid_count
      FROM report_companies rc
      LEFT JOIN sources s ON s.company_id = rc.company_id
      WHERE rc.report_id = ${reportId}
      GROUP BY rc.company_id
    `;
    return legacyRows ?? [];
  }

  static async getPerCompanyUsedSourcesCount(
    reportId: number,
    context?: SourceCountingContext,
  ) {
    const sourceContext = context ?? await this.getSourceCountingContext(reportId);

    if (sourceContext.useNewModel && sourceContext.sourceValidationSettingsId !== null) {
      const rows = await prisma.$queryRaw<Array<{ company_id: number; total: number }>>`
        WITH extracted AS (
          SELECT
            rdpr.company_id,
            regexp_replace(lower(trim((m.match_arr)[1])), '/+$', '') AS normalized_url
          FROM report_data_point_results rdpr
          CROSS JOIN LATERAL regexp_matches(
            COALESCE(rdpr.data ->> 'Sources', ''),
            '(https?://[^\\s\\n]+)',
            'g'
          ) AS m(match_arr)
          WHERE rdpr.report_id = ${reportId}
        ),
        mapped AS (
          SELECT
            e.company_id,
            sm.source_id
          FROM extracted e
          JOIN sources_new sn
            ON regexp_replace(lower(trim(sn.url)), '/+$', '') = e.normalized_url
          JOIN source_metadata sm
            ON sm.source_id = sn.id
           AND sm.company_id = e.company_id
          WHERE sm.source_validation_settings_id = ${sourceContext.sourceValidationSettingsId}
            AND COALESCE((sm.metadata ->> 'isValid')::boolean, false) = true
        )
        SELECT
          rc.company_id,
          COALESCE(COUNT(DISTINCT mapped.source_id), 0)::int AS total
        FROM report_companies rc
        LEFT JOIN mapped ON mapped.company_id = rc.company_id
        WHERE rc.report_id = ${reportId}
        GROUP BY rc.company_id
      `;
      return rows ?? [];
    }

    const legacyRows = await prisma.$queryRaw<Array<{ company_id: number; total: number }>>`
      WITH extracted AS (
        SELECT
          rdpr.company_id,
          regexp_replace(lower(trim((m.match_arr)[1])), '/+$', '') AS normalized_url
        FROM report_data_point_results rdpr
        CROSS JOIN LATERAL regexp_matches(
          COALESCE(rdpr.data ->> 'Sources', ''),
          '(https?://[^\\s\\n]+)',
          'g'
        ) AS m(match_arr)
        WHERE rdpr.report_id = ${reportId}
      ),
      mapped AS (
        SELECT
          e.company_id,
          s.id AS source_id
        FROM extracted e
        JOIN sources s
          ON s.company_id = e.company_id
         AND regexp_replace(lower(trim(s.url)), '/+$', '') = e.normalized_url
      )
      SELECT
        rc.company_id,
        COALESCE(COUNT(DISTINCT mapped.source_id), 0)::int AS total
      FROM report_companies rc
      LEFT JOIN mapped ON mapped.company_id = rc.company_id
      WHERE rc.report_id = ${reportId}
      GROUP BY rc.company_id
    `;
    return legacyRows ?? [];
  }

  static async getPerCompanyCandidatesCount(
    reportId: number,
    context?: SourceCountingContext,
  ) {
    const sourceContext = context ?? await this.getSourceCountingContext(reportId);

    if (sourceContext.useNewModel && sourceContext.sourceValidationSettingsId !== null) {
      const rows = await prisma.$queryRaw<Array<{ company_id: number; total: number }>>`
        WITH dedup AS (
          SELECT
            company_id,
            regexp_replace(lower(trim(url)), '/+$', '') AS normalized_url
          FROM report_url_candidates
          WHERE report_id = ${reportId}
          GROUP BY company_id, normalized_url
        )
        SELECT
          rc.company_id,
          COALESCE(COUNT(dedup.normalized_url), 0)::int AS total
        FROM report_companies rc
        LEFT JOIN dedup
          ON dedup.company_id = rc.company_id
        WHERE rc.report_id = ${reportId}
        GROUP BY rc.company_id
      `;
      return rows ?? [];
    }

    const legacyRows = await prisma.$queryRaw<Array<{ company_id: number; total: number }>>`
      SELECT rc.company_id, COUNT(suc.id)::int AS total
      FROM report_companies rc
      LEFT JOIN scape_url_candidates suc ON suc.company_id = rc.company_id
      WHERE rc.report_id = ${reportId}
      GROUP BY rc.company_id
    `;
    return legacyRows ?? [];
  }

  static async getCompanySources(
    reportId: number,
    companyId: number,
    filters: SourceFilterParams,
    context?: SourceCountingContext,
  ) {
    const sourceContext = context ?? await this.getSourceCountingContext(reportId);

    if (sourceContext.useNewModel && sourceContext.sourceValidationSettingsId !== null) {
      const w = () => {
        const conditions: Prisma.Sql[] = [
          Prisma.sql`sm.company_id = ${companyId}`,
          Prisma.sql`sm.source_validation_settings_id = ${sourceContext.sourceValidationSettingsId}`,
        ];

        if (filters.tier !== undefined) {
          conditions.push(Prisma.sql`sm.tier = ${filters.tier}`);
        }
        if (filters.isVectorized !== undefined) {
          conditions.push(Prisma.sql`sn."isVectorized" = ${filters.isVectorized}`);
        }
        if (filters.dateFrom) {
          conditions.push(Prisma.sql`COALESCE(sn.scrapped_at, sn.created_at) >= ${filters.dateFrom}`);
        }
        if (filters.dateTo) {
          conditions.push(Prisma.sql`COALESCE(sn.scrapped_at, sn.created_at) <= ${filters.dateTo}`);
        }
        if (filters.metaKey && filters.metaValue !== undefined) {
          conditions.push(Prisma.sql`sm.metadata ->> ${filters.metaKey} = ${filters.metaValue}`);
        }

        return Prisma.join(conditions, " AND ");
      };

      const [items, totalResult, byTierRows, byVectorizedRows, metadataGroups] = await Promise.all([
        prisma.$queryRaw<Array<{
          id: number;
          url: string;
          title: string | null;
          summary: string | null;
          tier: number | null;
          date: Date | null;
          metadata: unknown;
          isVectorized: boolean | null;
          created_at: Date | null;
          updated_at: Date | null;
        }>>(
          Prisma.sql`
            SELECT
              sm.source_id::int AS id,
              sn.url,
              sn.title,
              NULL::text AS summary,
              sm.tier,
              COALESCE(sn.scrapped_at, sn.created_at)::date AS date,
              COALESCE(sm.metadata, '{}'::jsonb) || jsonb_build_object(
                'query_ids', COALESCE(ruc_meta.query_ids, '[]'::jsonb),
                'agents', COALESCE(ruc_meta.agents, '[]'::jsonb)
              ) AS metadata,
              sn."isVectorized",
              sn.created_at,
              sn.updated_at
            FROM source_metadata sm
            JOIN sources_new sn ON sn.id = sm.source_id
            LEFT JOIN LATERAL (
              SELECT
                to_jsonb(COALESCE(array_remove(array_agg(DISTINCT ruc.query_id::text), NULL), ARRAY[]::text[])) AS query_ids,
                to_jsonb(COALESCE(array_remove(array_agg(DISTINCT ruc.agent), NULL), ARRAY[]::text[])) AS agents
              FROM report_url_candidates ruc
              WHERE ruc.report_id = ${reportId}
                AND ruc.company_id = sm.company_id
                AND regexp_replace(lower(trim(ruc.url)), '/+$', '') =
                    regexp_replace(lower(trim(sn.url)), '/+$', '')
            ) ruc_meta ON true
            WHERE ${w()}
            ORDER BY sn.created_at DESC NULLS LAST, sm.source_id DESC
            LIMIT ${filters.limit} OFFSET ${filters.offset}
          `
        ),
        prisma.$queryRaw<[{ count: number }]>(
          Prisma.sql`
            SELECT COUNT(DISTINCT sm.source_id)::int AS count
            FROM source_metadata sm
            JOIN sources_new sn ON sn.id = sm.source_id
            WHERE ${w()}
          `
        ),
        prisma.$queryRaw<Array<{ tier: number | null; count: number }>>(
          Prisma.sql`
            SELECT sm.tier, COUNT(DISTINCT sm.source_id)::int AS count
            FROM source_metadata sm
            JOIN sources_new sn ON sn.id = sm.source_id
            WHERE ${w()}
            GROUP BY sm.tier
            ORDER BY sm.tier ASC
          `
        ),
        prisma.$queryRaw<Array<{ isVectorized: boolean | null; count: number }>>(
          Prisma.sql`
            SELECT sn."isVectorized" AS "isVectorized", COUNT(DISTINCT sm.source_id)::int AS count
            FROM source_metadata sm
            JOIN sources_new sn ON sn.id = sm.source_id
            WHERE ${w()}
            GROUP BY sn."isVectorized"
            ORDER BY sn."isVectorized" ASC
          `
        ),
        filters.metaGroupBy
          ? prisma.$queryRaw<Array<{ value: string | null; count: number }>>(
              Prisma.sql`
                SELECT sm.metadata ->> ${filters.metaGroupBy} AS value,
                       COUNT(DISTINCT sm.source_id)::int AS count
                FROM source_metadata sm
                JOIN sources_new sn ON sn.id = sm.source_id
                WHERE ${w()}
                GROUP BY value
                ORDER BY count DESC
              `
            )
          : Promise.resolve(null),
      ]);

      return {
        items,
        total: totalResult[0]?.count ?? 0,
        byTier: byTierRows.map((row) => ({
          tier: row.tier,
          _count: { _all: row.count },
        })),
        byVectorized: byVectorizedRows.map((row) => ({
          isVectorized: row.isVectorized,
          _count: { _all: row.count },
        })),
        metadataGroups,
      };
    }

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

  private static buildLegacySourcesWhere(
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

  private static buildNewSourcesWhere(
    reportId: number,
    companyId: number,
    sourceValidationSettingsId: number,
    filters: SourcesAnalyticsParams,
  ): Prisma.Sql {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`sm.company_id = ${companyId}`,
      Prisma.sql`sm.source_validation_settings_id = ${sourceValidationSettingsId}`,
    ];

    if (filters.tier !== undefined) {
      conditions.push(Prisma.sql`sm.tier = ${filters.tier}`);
    }
    if (filters.qualityClass) {
      conditions.push(Prisma.sql`sm.metadata ->> 'quality_class' = ${filters.qualityClass}`);
    }
    if (filters.isValid !== undefined) {
      conditions.push(Prisma.sql`(sm.metadata ->> 'isValid')::boolean = ${filters.isValid}`);
    }
    if (filters.agent) {
      conditions.push(
        Prisma.sql`EXISTS (
          SELECT 1
          FROM report_url_candidates ruc
          WHERE ruc.report_id = ${reportId}
            AND ruc.company_id = sm.company_id
            AND regexp_replace(lower(trim(ruc.url)), '/+$', '') =
                regexp_replace(lower(trim(sn.url)), '/+$', '')
            AND ruc.agent = ${filters.agent}
        )`,
      );
    }
    if (filters.category) {
      conditions.push(Prisma.sql`sm.metadata -> 'categories' ? ${filters.category}`);
    }
    if (filters.tag) {
      conditions.push(Prisma.sql`sm.metadata -> 'tags' ? ${filters.tag}`);
    }
    if (filters.dateFrom) {
      conditions.push(Prisma.sql`COALESCE(sn.scrapped_at, sn.created_at) >= ${filters.dateFrom}`);
    }
    if (filters.dateTo) {
      conditions.push(Prisma.sql`COALESCE(sn.scrapped_at, sn.created_at) <= ${filters.dateTo}`);
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(Prisma.sql`(sn.title ILIKE ${pattern} OR sn.url ILIKE ${pattern})`);
    }

    return Prisma.join(conditions, " AND ");
  }

  static async getSourcesAnalytics(
    reportId: number,
    companyId: number,
    filters: SourcesAnalyticsParams,
    context?: SourceCountingContext,
  ) {
    const sourceContext = context ?? await this.getSourceCountingContext(reportId);

    if (sourceContext.useNewModel && sourceContext.sourceValidationSettingsId !== null) {
      const sourceValidationSettingsId = sourceContext.sourceValidationSettingsId;
      const baseFilters: SourcesAnalyticsParams = { limit: filters.limit, offset: filters.offset };
      const w = () => this.buildNewSourcesWhere(
        reportId,
        companyId,
        sourceValidationSettingsId,
        filters,
      );
      const wb = () => this.buildNewSourcesWhere(
        reportId,
        companyId,
        sourceValidationSettingsId,
        baseFilters,
      );

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
          Prisma.sql`SELECT COUNT(DISTINCT sm.source_id)::int AS count
          FROM source_metadata sm
          JOIN sources_new sn ON sn.id = sm.source_id
          WHERE ${wb()}`
        ),
        prisma.$queryRaw<[{ count: number }]>(
          Prisma.sql`SELECT COUNT(DISTINCT sm.source_id)::int AS count
          FROM source_metadata sm
          JOIN sources_new sn ON sn.id = sm.source_id
          WHERE ${w()}`
        ),
        prisma.$queryRaw<Array<{ value: string | null; count: number }>>(
          Prisma.sql`SELECT sm.metadata ->> 'quality_class' AS value, COUNT(DISTINCT sm.source_id)::int AS count
          FROM source_metadata sm
          JOIN sources_new sn ON sn.id = sm.source_id
          WHERE ${w()}
          GROUP BY value ORDER BY count DESC`
        ),
        prisma.$queryRaw<[{ count: number }]>(
          Prisma.sql`SELECT COUNT(DISTINCT sm.source_id)::int AS count
          FROM source_metadata sm
          JOIN sources_new sn ON sn.id = sm.source_id
          WHERE ${w()} AND sn."isVectorized" = true`
        ),
        prisma.$queryRaw<Array<{ query_id: string; goal: string | null; count: number }>>(
          Prisma.sql`
            WITH filtered_sources AS (
              SELECT DISTINCT
                sm.source_id,
                sm.company_id,
                regexp_replace(lower(trim(sn.url)), '/+$', '') AS normalized_url
              FROM source_metadata sm
              JOIN sources_new sn ON sn.id = sm.source_id
              WHERE ${w()}
            ),
            query_map AS (
              SELECT DISTINCT
                fs.source_id,
                ruc.query_id::text AS query_id
              FROM filtered_sources fs
              JOIN report_url_candidates ruc
                ON ruc.report_id = ${reportId}
               AND ruc.company_id = fs.company_id
               AND regexp_replace(lower(trim(ruc.url)), '/+$', '') = fs.normalized_url
              WHERE ruc.query_id IS NOT NULL
            )
            SELECT
              qm.query_id,
              dcq.query ->> 'goal' AS goal,
              COUNT(*)::int AS count
            FROM query_map qm
            LEFT JOIN data_collection_queries dcq ON dcq.id = qm.query_id::bigint
            GROUP BY qm.query_id, dcq.query ->> 'goal'
            ORDER BY count DESC
          `
        ),
        prisma.$queryRaw<Array<{ value: string; count: number }>>(
          Prisma.sql`
            WITH filtered_sources AS (
              SELECT DISTINCT
                sm.source_id,
                sm.company_id,
                regexp_replace(lower(trim(sn.url)), '/+$', '') AS normalized_url
              FROM source_metadata sm
              JOIN sources_new sn ON sn.id = sm.source_id
              WHERE ${w()}
            ),
            agent_map AS (
              SELECT DISTINCT
                fs.source_id,
                ruc.agent
              FROM filtered_sources fs
              JOIN report_url_candidates ruc
                ON ruc.report_id = ${reportId}
               AND ruc.company_id = fs.company_id
               AND regexp_replace(lower(trim(ruc.url)), '/+$', '') = fs.normalized_url
              WHERE ruc.agent IS NOT NULL
            )
            SELECT agent AS value, COUNT(*)::int AS count
            FROM agent_map
            GROUP BY agent
            ORDER BY count DESC
          `
        ),
        prisma.$queryRaw<Array<{ value: string; count: number }>>(
          Prisma.sql`SELECT cat AS value, COUNT(DISTINCT sm.source_id)::int AS count
          FROM source_metadata sm
          JOIN sources_new sn ON sn.id = sm.source_id
          CROSS JOIN LATERAL jsonb_array_elements_text(sm.metadata -> 'categories') AS cat
          WHERE ${w()}
          GROUP BY cat ORDER BY count DESC`
        ),
        prisma.$queryRaw<Array<{ value: string; count: number }>>(
          Prisma.sql`SELECT tag AS value, COUNT(DISTINCT sm.source_id)::int AS count
          FROM source_metadata sm
          JOIN sources_new sn ON sn.id = sm.source_id
          CROSS JOIN LATERAL jsonb_array_elements_text(sm.metadata -> 'tags') AS tag
          WHERE ${w()}
          GROUP BY tag ORDER BY count DESC`
        ),
        prisma.$queryRaw<Array<{ value: boolean; count: number }>>(
          Prisma.sql`SELECT (sm.metadata ->> 'isValid')::boolean AS value, COUNT(DISTINCT sm.source_id)::int AS count
          FROM source_metadata sm
          JOIN sources_new sn ON sn.id = sm.source_id
          WHERE ${w()}
          GROUP BY value ORDER BY value DESC`
        ),
        prisma.$queryRaw<[{
          relevance: number; authority: number; freshness: number;
          originality: number; security: number; extractability: number;
        }]>(
          Prisma.sql`SELECT
            COALESCE(AVG((sm.metadata -> 'scores' ->> 'relevance')::numeric), 0)::float AS relevance,
            COALESCE(AVG((sm.metadata -> 'scores' ->> 'authority')::numeric), 0)::float AS authority,
            COALESCE(AVG((sm.metadata -> 'scores' ->> 'freshness')::numeric), 0)::float AS freshness,
            COALESCE(AVG((sm.metadata -> 'scores' ->> 'originality')::numeric), 0)::float AS originality,
            COALESCE(AVG((sm.metadata -> 'scores' ->> 'security')::numeric), 0)::float AS security,
            COALESCE(AVG((sm.metadata -> 'scores' ->> 'extractability')::numeric), 0)::float AS extractability
          FROM source_metadata sm
          JOIN sources_new sn ON sn.id = sm.source_id
          WHERE ${w()} AND sm.metadata -> 'scores' IS NOT NULL`
        ),
        prisma.$queryRaw<Array<{
          id: number; url: string; title: string | null; tier: number | null;
          date: Date | null; is_vectorized: boolean | null; metadata: unknown;
          created_at: Date | null;
        }>>(
          Prisma.sql`SELECT
            sm.source_id::int AS id,
            sn.url,
            sn.title,
            sm.tier,
            COALESCE(sn.scrapped_at, sn.created_at)::date AS date,
            sn."isVectorized" AS is_vectorized,
            COALESCE(sm.metadata, '{}'::jsonb) || jsonb_build_object(
              'query_ids', COALESCE(ruc_meta.query_ids, '[]'::jsonb),
              'agents', COALESCE(ruc_meta.agents, '[]'::jsonb)
            ) AS metadata,
            sn.created_at
          FROM source_metadata sm
          JOIN sources_new sn ON sn.id = sm.source_id
          LEFT JOIN LATERAL (
            SELECT
              to_jsonb(COALESCE(array_remove(array_agg(DISTINCT ruc.query_id::text), NULL), ARRAY[]::text[])) AS query_ids,
              to_jsonb(COALESCE(array_remove(array_agg(DISTINCT ruc.agent), NULL), ARRAY[]::text[])) AS agents
            FROM report_url_candidates ruc
            WHERE ruc.report_id = ${reportId}
              AND ruc.company_id = sm.company_id
              AND regexp_replace(lower(trim(ruc.url)), '/+$', '') =
                  regexp_replace(lower(trim(sn.url)), '/+$', '')
          ) ruc_meta ON true
          WHERE ${w()}
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

    // Use $queryRaw(Prisma.sql`...`) function-call syntax instead of tagged template.
    // Tagged template $queryRaw`...` treats Prisma.Sql objects as plain parameters
    // and serializes them as JSON strings. Function-call syntax lets Prisma.sql
    // properly compose nested Prisma.Sql fragments before sending to $queryRaw.
    const w = () => this.buildLegacySourcesWhere(companyId, filters);

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

  private static buildLegacyCandidatesWhere(
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

  private static buildNewCandidatesWhere(
    reportId: number,
    companyId: number,
    filters: ScrapeCandidatesParams,
    includeSearch: boolean,
  ): Prisma.Sql {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`ruc.report_id = ${reportId}`,
      Prisma.sql`ruc.company_id = ${companyId}`,
    ];

    if (includeSearch && filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(Prisma.sql`ruc.url ILIKE ${pattern}`);
    }

    return Prisma.join(conditions, " AND ");
  }

  static async getReportQueriesWithStats(
    reportId: number,
    sortBy?: string,
    sortOrder?: SortOrder,
    context?: SourceCountingContext,
  ) {
    const sourceContext = context ?? await this.getSourceCountingContext(reportId);

    if (sourceContext.useNewModel && sourceContext.sourceValidationSettingsId !== null) {
      const rows = await prisma.$queryRaw<
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
              ruc.query_id::bigint AS query_id,
              COUNT(DISTINCT sm.source_id)::int AS cnt
            FROM report_url_candidates ruc
            JOIN sources_new sn
              ON regexp_replace(lower(trim(sn.url)), '/+$', '') =
                 regexp_replace(lower(trim(ruc.url)), '/+$', '')
            JOIN source_metadata sm
              ON sm.source_id = sn.id
             AND sm.company_id = ruc.company_id
            WHERE ruc.report_id = ${reportId}
              AND ruc.query_id IS NOT NULL
              AND sm.source_validation_settings_id = ${sourceContext.sourceValidationSettingsId}
              AND COALESCE((sm.metadata ->> 'isValid')::boolean, false) = true
            GROUP BY ruc.query_id::bigint
          ),
          cand AS (
            SELECT
              dedup.query_id,
              COUNT(*)::int AS cnt
            FROM (
              SELECT DISTINCT
                ruc.company_id,
                ruc.query_id::bigint AS query_id,
                regexp_replace(lower(trim(ruc.url)), '/+$', '') AS normalized_url
              FROM report_url_candidates ruc
              WHERE ruc.report_id = ${reportId}
                AND ruc.query_id IS NOT NULL
            ) dedup
            GROUP BY dedup.query_id
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
      return rows ?? [];
    }

    const legacyRows = await prisma.$queryRaw<
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
    return legacyRows ?? [];
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
    reportId: number,
    companyId: number,
    filters: ScrapeCandidatesParams,
    context?: SourceCountingContext,
  ) {
    const sourceContext = context ?? await this.getSourceCountingContext(reportId);

    if (sourceContext.useNewModel && sourceContext.sourceValidationSettingsId !== null) {
      const wBase = () => this.buildNewCandidatesWhere(reportId, companyId, filters, false);
      const wFiltered = () => this.buildNewCandidatesWhere(reportId, companyId, filters, true);
      const mappedSortBy = filters.sortBy === "created_at" ? "id" : filters.sortBy;

      const [totalResult, totalFilteredResult, agentsAgg, queryIdsAgg, items] = await Promise.all([
        prisma.$queryRaw<[{ count: number }]>(
          Prisma.sql`
            SELECT COUNT(*)::int AS count
            FROM (
              SELECT regexp_replace(lower(trim(ruc.url)), '/+$', '') AS normalized_url
              FROM report_url_candidates ruc
              WHERE ${wBase()}
              GROUP BY normalized_url
            ) dedup
          `
        ),
        prisma.$queryRaw<[{ count: number }]>(
          Prisma.sql`
            SELECT COUNT(*)::int AS count
            FROM (
              SELECT regexp_replace(lower(trim(ruc.url)), '/+$', '') AS normalized_url
              FROM report_url_candidates ruc
              WHERE ${wFiltered()}
              GROUP BY normalized_url
            ) dedup
          `
        ),
        prisma.$queryRaw<Array<{ value: string; count: number }>>(
          Prisma.sql`
            WITH dedup AS (
              SELECT
                ARRAY_REMOVE(ARRAY_AGG(DISTINCT ruc.agent), NULL) AS agents
              FROM report_url_candidates ruc
              WHERE ${wFiltered()}
              GROUP BY regexp_replace(lower(trim(ruc.url)), '/+$', '')
            )
            SELECT agent AS value, COUNT(*)::int AS count
            FROM dedup, UNNEST(agents) AS agent
            GROUP BY agent
            ORDER BY count DESC
          `
        ),
        prisma.$queryRaw<Array<{ query_id: string; goal: string | null; count: number }>>(
          Prisma.sql`
            WITH dedup AS (
              SELECT
                ARRAY_REMOVE(ARRAY_AGG(DISTINCT ruc.query_id::text), NULL) AS query_ids
              FROM report_url_candidates ruc
              WHERE ${wFiltered()}
              GROUP BY regexp_replace(lower(trim(ruc.url)), '/+$', '')
            )
            SELECT
              qid AS query_id,
              dcq.query ->> 'goal' AS goal,
              COUNT(*)::int AS count
            FROM dedup, UNNEST(query_ids) AS qid
            LEFT JOIN data_collection_queries dcq ON dcq.id = qid::bigint
            GROUP BY qid, dcq.query ->> 'goal'
            ORDER BY count DESC
          `
        ),
        prisma.$queryRaw<Array<{
          id: number; url: string; title: string | null; description: string | null;
          status: string; metadata: unknown; created_at: Date | null;
        }>>(
          Prisma.sql`
            WITH dedup AS (
              SELECT
                MIN(ruc.id)::int AS id,
                (ARRAY_AGG(ruc.url ORDER BY ruc.id DESC))[1] AS url,
                BOOL_AND(COALESCE(ruc.proccesed, false)) AS all_processed,
                ARRAY_REMOVE(ARRAY_AGG(DISTINCT ruc.query_id::text), NULL) AS query_ids,
                ARRAY_REMOVE(ARRAY_AGG(DISTINCT ruc.agent), NULL) AS agents,
                COUNT(*)::int AS duplicates_count
              FROM report_url_candidates ruc
              WHERE ${wFiltered()}
              GROUP BY regexp_replace(lower(trim(ruc.url)), '/+$', '')
            )
            SELECT
              id,
              url,
              NULL::text AS title,
              NULL::text AS description,
              CASE WHEN all_processed THEN 'processed' ELSE 'pending' END AS status,
              jsonb_build_object(
                'query_ids', query_ids,
                'agents', agents,
                'duplicates_count', duplicates_count
              ) AS metadata,
              NULL::timestamp AS created_at
            FROM dedup
            ${this.buildOrderBy(mappedSortBy, filters.sortOrder, ["url", "status", "id"], "id")}
            LIMIT ${filters.limit} OFFSET ${filters.offset}
          `
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

    const w = () => this.buildLegacyCandidatesWhere(companyId, filters);

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

  // ─────────────── Sales Miner ───────────────

  static async getSalesMinerStepResults(reportId: number, companyId: number) {
    return prisma.$queryRaw<Array<{ step_key: string; payload: unknown }>>`
      SELECT step_key, payload
      FROM sales_report_step_intermediate_results
      WHERE report_id = ${reportId} AND company_id = ${companyId}
    `;
  }

  static async getAccountTopOpportunities(relatedReportId: number, accountId: number, limit = 10) {
    return prisma.$queryRaw<Array<{
      id: bigint;
      company_id: number;
      entity_name: string;
      title: string | null;
      score: string | null;
      portfolio_priority_score: string | null;
      portfolio_priority_reason: string | null;
      org_unit: string | null;
      horizon: string | null;
      deal_size_general: string | null;
      why_now: string | null;
      primary_business_problem: string | null;
      primary_value_proposition: string | null;
    }>>`
      SELECT
        oc.id,
        oc.company_id,
        c.name AS entity_name,
        oc.title,
        oc.score::text,
        oc.portfolio_priority_score::text,
        oc.portfolio_priority_reason,
        oc.org_unit,
        oc.horizon,
        oc.deal_size_general,
        oc.why_now,
        oc.primary_business_problem,
        oc.primary_value_proposition
      FROM opportunity_candidates oc
      JOIN research_runs rr ON rr.id = oc.research_run_id
      JOIN companies c ON c.id = oc.company_id
      WHERE rr.report_id = ${relatedReportId}
        AND (
          c.parent_company = ${accountId}
          OR c.id = ${accountId}
        )
      ORDER BY oc.portfolio_priority_score DESC NULLS LAST
      LIMIT ${limit}
    `;
  }

  static async getEntitySignals(companyId: number, reportId: number) {
    return prisma.$queryRaw<Array<{
      id: bigint;
      theme_code: string | null;
      strength_score: string | null;
      confidence_score: string | null;
      freshness_score: string | null;
      summary_text: string | null;
      signal_name: string | null;
      signal_description: string | null;
    }>>`
      SELECT
        cssi.id,
        cssi.theme_code,
        cssi.strength_score::text,
        cssi.confidence_score::text,
        cssi.freshness_score::text,
        cssi.summary_text,
        sd.name AS signal_name,
        sd.description AS signal_description
      FROM company_signal_summary_items cssi
      JOIN company_signal_summaries css ON css.id = cssi.company_signal_summary_id
      JOIN research_runs rr ON rr.id = css.research_run_id
      JOIN signal_definitions sd ON sd.id::text = cssi.signal_definition_id::text
      WHERE rr.company_id = ${companyId}
        AND rr.report_id = ${reportId}
        and css.summary_version in ('v1', 'account_rollup_v1')
      ORDER BY cssi.strength_score DESC NULLS LAST
    `;
  }

  static async getEntityOpportunities(companyId: number, reportId: number) {
    return prisma.$queryRaw<Array<{
      id: bigint;
      title: string | null;
      score: string | null;
      portfolio_priority_score: string | null;
      rank_position: number | null;
      is_top_10: boolean | null;
      org_unit: string | null;
      horizon: string | null;
      deal_size_general: string | null;
      why_now: string | null;
      primary_business_problem: string | null;
      primary_value_proposition: string | null;
      solution_center: string | null;
    }>>`
      SELECT
        oc.id,
        oc.title,
        oc.score::text,
        oc.portfolio_priority_score::text,
        oc.rank_position,
        oc.is_top_10,
        oc.org_unit,
        oc.horizon,
        oc.deal_size_general,
        oc.why_now,
        oc.primary_business_problem,
        oc.primary_value_proposition,
        oc.solution_center
      FROM opportunity_candidates oc
      JOIN research_runs rr ON rr.id = oc.research_run_id
      WHERE rr.company_id = ${companyId}
        AND rr.report_id = ${reportId}
      ORDER BY oc.portfolio_priority_score DESC NULLS LAST, oc.score DESC NULLS LAST
    `;
  }

  static async getEntityStakeholders(companyId: number, reportId: number) {
    return prisma.$queryRaw<Array<{
      id: bigint;
      gate_role: string | null;
      gate_role_type: string | null;
      role_title: string | null;
      entity_name: string | null;
      entity_level: string | null;
      rationale: string | null;
      full_name: string | null;
      linkedin_url: string | null;
      opportunity_id: bigint | null;
    }>>`
      SELECT
        sv.id,
        sv.gate_role,
        sv.gate_role_type,
        sv.role_title,
        sv.entity_name,
        sv.entity_level,
        sv.rationale,
        p.full_name,
        p.linkedin_url,
        sv.opportunity_id
      FROM stakeholders_v2 sv
      LEFT JOIN persons p ON p.id = sv.person_id
      WHERE sv.company_id = ${companyId}
        AND sv.opportunity_id IN (
          SELECT oc.id
          FROM opportunity_candidates oc
          JOIN research_runs rr ON rr.id = oc.research_run_id
          WHERE rr.company_id = ${companyId}
            AND rr.report_id = ${reportId}
        )
      ORDER BY sv.id
    `;
  }

  static async getSalesMinerReportSignalSummary(reportId: number) {
    return prisma.$queryRaw<Array<{
      theme_code: string;
      signal_count: bigint;
      avg_strength: number | null;
      companies_count: bigint;
    }>>`
      SELECT
        cssi.theme_code,
        count(DISTINCT cssi.id) AS signal_count,
        round(avg(cssi.strength_score)::numeric, 2) AS avg_strength,
        count(DISTINCT css.company_id) AS companies_count
      FROM company_signal_summary_items cssi
      JOIN company_signal_summaries css ON css.id = cssi.company_signal_summary_id
      JOIN research_runs rr ON rr.id = css.research_run_id
      JOIN report_companies rc ON rc.company_id = rr.company_id AND rc.report_id = ${reportId}
      WHERE rr.report_id = ${reportId}
      GROUP BY cssi.theme_code
      ORDER BY signal_count DESC
    `;
  }

  static async getSalesMinerSignalStats(reportId: number) {
    return prisma.$queryRaw<Array<{
      signal_definition_id: bigint;
      signal_type_name: string;
      signal_definition_name: string;
      researched_context_count: bigint;
      decision_context_count: bigint;
      researched_but_not_selected_context_count: bigint;
      used_seed_count: bigint;
      final_opportunity_count: bigint;
      top10_opportunity_count: bigint;
      deep_dive_opportunity_count: bigint;
      used_effective_signal_score: number;
      top10_effective_signal_score: number;
      avg_effective_signal_score: number;
      total_confirmation_count: number | null;
      avg_evidence_strength_score: number;
      avg_evidence_confidence_score: number;
      avg_evidence_freshness_score: number;
      latest_effective_date: Date | null;
      selected_opportunity_spaces: string[] | null;
      signal_effectiveness_class: string;
    }>>`
      WITH run_scope AS (
        SELECT rr.id AS research_run_id, rr.company_id
        FROM public.research_runs rr
        WHERE rr.report_id = ${reportId}
      ),
      researched_signals AS (
        SELECT DISTINCT
          sst.research_run_id,
          COALESCE(sst.company_id, rs.company_id) AS company_id,
          sst.signal_definition_id,
          sst.status,
          sst.requires_company_binding,
          sst.attempt_count,
          sst.started_at,
          sst.finished_at,
          sst.created_at,
          sst.updated_at
        FROM public.signal_search_tasks sst
        INNER JOIN run_scope rs ON rs.research_run_id = sst.research_run_id
      ),
      universe_metrics AS (
        SELECT
          rs.signal_definition_id,
          COUNT(DISTINCT (rs.research_run_id::text || ':' || rs.company_id::text)) AS researched_context_count,
          COUNT(DISTINCT rs.research_run_id) AS researched_run_count,
          COUNT(DISTINCT rs.company_id) AS researched_company_count,
          COUNT(DISTINCT (rs.research_run_id::text || ':' || rs.company_id::text))
            FILTER (WHERE rs.started_at IS NOT NULL) AS started_context_count,
          COUNT(DISTINCT (rs.research_run_id::text || ':' || rs.company_id::text))
            FILTER (WHERE rs.finished_at IS NOT NULL) AS finished_context_count,
          COUNT(DISTINCT (rs.research_run_id::text || ':' || rs.company_id::text))
            FILTER (WHERE rs.requires_company_binding = true) AS company_bound_context_count,
          ROUND(AVG(rs.attempt_count)::numeric, 4) AS avg_attempt_count,
          MAX(rs.attempt_count) AS max_attempt_count
        FROM researched_signals rs
        GROUP BY rs.signal_definition_id
      ),
      latest_seed_logs AS (
        SELECT DISTINCT ON (l.research_run_id, l.company_id, l.seed_id)
          l.*
        FROM public.opportunity_seed_validation_logs l
        INNER JOIN run_scope rs ON rs.research_run_id = l.research_run_id
        ORDER BY l.research_run_id, l.company_id, l.seed_id, l.id DESC
      ),
      signal_rows AS (
        SELECT
          l.id AS seed_log_id, l.research_run_id, l.company_id, l.seed_id, l.seed_type,
          l.include_in_bundle_assembly, l.viability_label, l.priority_hint, l.seed_confidence,
          l.scope_type, l.selected_opportunity_space, l.candidate_lead_product_id,
          l.candidate_lead_product_scoring_result_id,
          COALESCE(l.analysis_warnings, '[]'::jsonb) AS analysis_warnings,
          j.value AS signal_json
        FROM latest_seed_logs l
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(l.signal_decisions, '[]'::jsonb)) AS j(value)
      ),
      normalized_signals AS (
        SELECT
          sr.*,
          NULLIF(sr.signal_json->>'signal_definition_id', '')::bigint AS signal_definition_id,
          NULLIF(sr.signal_json->>'decision_role', '') AS decision_role,
          NULLIF(sr.signal_json->>'decision_status', '') AS decision_status,
          NULLIF(sr.signal_json->>'product_specificity', '') AS product_specificity,
          COALESCE(NULLIF(sr.signal_json->>'influence_score', '')::numeric, 0) AS influence_score,
          COALESCE(NULLIF(sr.signal_json->>'reason', ''), '') AS decision_reason,
          COALESCE(sr.signal_json->'source_layers', '[]'::jsonb) AS source_layers
        FROM signal_rows sr
        WHERE NULLIF(sr.signal_json->>'signal_definition_id', '') IS NOT NULL
      ),
      signal_scored AS (
        SELECT
          ns.*,
          CASE ns.decision_role
            WHEN 'primary_driver'    THEN 1.00
            WHEN 'supporting_driver' THEN 0.75
            WHEN 'scope_driver'      THEN 0.60
            WHEN 'modifier'          THEN 0.35
            WHEN 'context_only'      THEN 0.10
            WHEN 'ignored'           THEN 0.00
            ELSE 0.10
          END AS role_weight,
          CASE ns.decision_status
            WHEN 'used'       THEN 1.00
            WHEN 'downgraded' THEN 0.55
            WHEN 'ignored'    THEN 0.00
            ELSE 0.50
          END AS status_weight,
          CASE ns.product_specificity
            WHEN 'high'   THEN 1.15
            WHEN 'medium' THEN 1.00
            WHEN 'low'    THEN 0.80
            ELSE 1.00
          END AS specificity_weight
        FROM normalized_signals ns
      ),
      scored_signals AS (
        SELECT
          ss.*,
          ROUND(ss.influence_score * ss.role_weight * ss.status_weight * ss.specificity_weight, 4) AS effective_signal_score,
          (ss.source_layers @> '["product_score"]'::jsonb)             AS has_product_score_layer,
          (ss.source_layers @> '["summary_signal"]'::jsonb)            AS has_summary_signal_layer,
          (ss.source_layers @> '["opportunity_space_summary"]'::jsonb) AS has_space_layer,
          (ss.source_layers @> '["repeated_local_pattern"]'::jsonb)    AS has_repeated_pattern_layer,
          (ss.source_layers @> '["material_entity_signal"]'::jsonb)    AS has_material_entity_layer
        FROM signal_scored ss
      ),
      final_opportunities AS (
        SELECT
          oc.id AS opportunity_id, oc.research_run_id, oc.company_id,
          COALESCE(oc.meta->>'seed_id', oc.meta->>'seedId') AS seed_id,
          oc.title AS opportunity_title, oc.rank_position,
          COALESCE(oc.is_top_10, false) AS is_top_10,
          COALESCE(oc.is_selected_for_deep_dive, false) AS is_selected_for_deep_dive,
          oc.portfolio_priority_score, oc.score AS opportunity_score,
          oc.confidence_score AS opportunity_confidence_score,
          oc.scope_type AS final_scope_type
        FROM public.opportunity_candidates oc
        INNER JOIN run_scope rs ON rs.research_run_id = oc.research_run_id
        WHERE COALESCE(oc.meta->>'seed_id', oc.meta->>'seedId') IS NOT NULL
      ),
      decision_joined AS (
        SELECT
          s.research_run_id, s.company_id, s.seed_id, s.seed_type,
          s.include_in_bundle_assembly, s.viability_label, s.priority_hint, s.seed_confidence,
          s.scope_type, s.selected_opportunity_space, s.signal_definition_id,
          s.decision_role, s.decision_status, s.product_specificity,
          s.influence_score, s.effective_signal_score, s.decision_reason, s.source_layers,
          s.has_product_score_layer, s.has_summary_signal_layer, s.has_space_layer,
          s.has_repeated_pattern_layer, s.has_material_entity_layer,
          fo.opportunity_id, fo.opportunity_title, fo.rank_position,
          fo.is_top_10, fo.is_selected_for_deep_dive, fo.portfolio_priority_score,
          fo.opportunity_score, fo.opportunity_confidence_score, fo.final_scope_type,
          jsonb_array_length(COALESCE(s.analysis_warnings, '[]'::jsonb)) AS analysis_warning_count
        FROM scored_signals s
        LEFT JOIN final_opportunities fo
          ON fo.research_run_id = s.research_run_id
         AND fo.company_id = s.company_id
         AND fo.seed_id = s.seed_id
      ),
      decision_metrics AS (
        SELECT
          j.signal_definition_id,
          COUNT(DISTINCT (j.research_run_id::text || ':' || j.company_id::text)) AS decision_context_count,
          COUNT(DISTINCT j.seed_id) AS seed_count,
          COUNT(DISTINCT j.seed_id) FILTER (WHERE j.decision_status = 'used') AS used_seed_count,
          COUNT(DISTINCT j.seed_id) FILTER (WHERE j.decision_status = 'downgraded') AS downgraded_seed_count,
          COUNT(DISTINCT j.seed_id) FILTER (WHERE j.decision_status = 'ignored') AS ignored_seed_count,
          COUNT(DISTINCT j.seed_id) FILTER (WHERE j.include_in_bundle_assembly) AS bundle_included_seed_count,
          COUNT(DISTINCT j.opportunity_id) AS final_opportunity_count,
          COUNT(DISTINCT j.opportunity_id) FILTER (WHERE j.is_top_10) AS top10_opportunity_count,
          COUNT(DISTINCT j.opportunity_id) FILTER (WHERE j.is_selected_for_deep_dive) AS deep_dive_opportunity_count,
          ROUND(AVG(j.influence_score)::numeric, 4) AS avg_llm_influence_score,
          ROUND(AVG(j.effective_signal_score)::numeric, 4) AS avg_effective_signal_score,
          ROUND(SUM(j.effective_signal_score)::numeric, 4) AS total_effective_signal_score,
          ROUND(SUM(j.effective_signal_score) FILTER (WHERE j.decision_status = 'used')::numeric, 4) AS used_effective_signal_score,
          ROUND(SUM(j.effective_signal_score) FILTER (WHERE j.is_top_10)::numeric, 4) AS top10_effective_signal_score,
          ROUND(SUM(j.effective_signal_score) FILTER (WHERE j.is_selected_for_deep_dive)::numeric, 4) AS deep_dive_effective_signal_score,
          ROUND(AVG(j.seed_confidence)::numeric, 4) AS avg_seed_confidence,
          ROUND(AVG(j.portfolio_priority_score)::numeric, 4) AS avg_portfolio_priority_score,
          ROUND(AVG(j.rank_position)::numeric, 4) AS avg_rank_position_when_converted,
          COUNT(DISTINCT j.seed_id) FILTER (WHERE j.has_product_score_layer) AS product_score_backed_seed_count,
          COUNT(DISTINCT j.seed_id) FILTER (WHERE j.has_summary_signal_layer) AS summary_backed_seed_count,
          COUNT(DISTINCT j.seed_id) FILTER (WHERE j.has_space_layer) AS opportunity_space_backed_seed_count,
          COUNT(DISTINCT j.seed_id) FILTER (WHERE j.has_repeated_pattern_layer) AS repeated_pattern_backed_seed_count,
          COUNT(DISTINCT j.seed_id) FILTER (WHERE j.has_material_entity_layer) AS material_entity_backed_seed_count,
          ARRAY_AGG(DISTINCT j.selected_opportunity_space)
            FILTER (WHERE j.selected_opportunity_space IS NOT NULL) AS selected_opportunity_spaces
        FROM decision_joined j
        GROUP BY j.signal_definition_id
      ),
      base_signals AS (
        SELECT
          css.research_run_id, css.company_id,
          (sig->>'signal_definition_id')::bigint AS signal_definition_id,
          NULLIF(sig->>'confirmation_count', '')::int AS confirmation_count,
          NULLIF(sig->>'unique_sources_count', '')::int AS unique_sources_count,
          NULLIF(sig->>'latest_effective_date', '')::timestamptz AS latest_effective_date,
          NULLIF(sig->>'average_confidence', '')::numeric AS base_average_confidence,
          NULLIF(sig->>'strength_score', '')::numeric AS base_strength_score
        FROM public.company_signal_summaries css
        INNER JOIN run_scope rs ON rs.research_run_id = css.research_run_id
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(css.summary_json::jsonb->'signals', '[]'::jsonb)) AS sig
        WHERE css.summary_version = 'account_base_v1'
      ),
      base_metrics AS (
        SELECT
          u.signal_definition_id,
          COUNT(DISTINCT (u.research_run_id::text || ':' || u.company_id::text))
            FILTER (WHERE bs.signal_definition_id IS NOT NULL) AS base_summary_context_count,
          MAX(bs.confirmation_count) AS max_confirmation_count,
          ROUND(AVG(bs.confirmation_count)::numeric, 4) AS avg_confirmation_count,
          SUM(bs.confirmation_count) AS total_confirmation_count,
          MAX(bs.unique_sources_count) AS max_unique_sources_count,
          ROUND(AVG(bs.unique_sources_count)::numeric, 4) AS avg_unique_sources_count,
          MAX(bs.latest_effective_date) AS latest_effective_date,
          ROUND(MAX(bs.base_strength_score)::numeric, 4) AS max_base_strength_score,
          ROUND(AVG(bs.base_strength_score)::numeric, 4) AS avg_base_strength_score,
          ROUND(MAX(bs.base_average_confidence)::numeric, 4) AS max_base_average_confidence,
          ROUND(AVG(bs.base_average_confidence)::numeric, 4) AS avg_base_average_confidence
        FROM researched_signals u
        LEFT JOIN base_signals bs
          ON bs.research_run_id = u.research_run_id
         AND bs.company_id = u.company_id
         AND bs.signal_definition_id = u.signal_definition_id
        GROUP BY u.signal_definition_id
      ),
      rollup_signals AS (
        SELECT
          css.research_run_id, css.company_id,
          (sig->>'signal_definition_id')::bigint AS signal_definition_id,
          NULLIF(sig->>'strength_score', '')::numeric AS rollup_strength_score,
          NULLIF(sig->>'confidence_score', '')::numeric AS rollup_confidence_score,
          NULLIF(sig->>'freshness_score', '')::numeric AS rollup_freshness_score,
          NULLIF(sig->>'scope_classification', '') AS rollup_scope_classification,
          COALESCE((sig->>'account_support')::boolean, false) AS account_support,
          COALESCE((sig->>'repeated_entity_support')::boolean, false) AS repeated_entity_support,
          NULLIF(sig->>'material_entity_support_count', '')::int AS material_entity_support_count
        FROM public.company_signal_summaries css
        INNER JOIN run_scope rs ON rs.research_run_id = css.research_run_id
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(css.summary_json::jsonb->'signals', '[]'::jsonb)) AS sig
        WHERE css.summary_version = 'account_rollup_v1'
      ),
      rollup_priorities AS (
        SELECT
          css.research_run_id, css.company_id,
          (sp->>'signal_definition_id')::bigint AS signal_definition_id,
          NULLIF(sp->>'priority', '') AS priority_label,
          NULLIF(sp->>'reason', '') AS priority_reason
        FROM public.company_signal_summaries css
        INNER JOIN run_scope rs ON rs.research_run_id = css.research_run_id
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(css.summary_json::jsonb->'signal_priorities', '[]'::jsonb)) AS sp
        WHERE css.summary_version = 'account_rollup_v1'
      ),
      rollup_metrics AS (
        SELECT
          u.signal_definition_id,
          COUNT(DISTINCT (u.research_run_id::text || ':' || u.company_id::text))
            FILTER (WHERE rs.signal_definition_id IS NOT NULL) AS rollup_summary_context_count,
          ROUND(MAX(rs.rollup_strength_score)::numeric, 4) AS max_rollup_strength_score,
          ROUND(AVG(rs.rollup_strength_score)::numeric, 4) AS avg_rollup_strength_score,
          ROUND(MAX(rs.rollup_confidence_score)::numeric, 4) AS max_rollup_confidence_score,
          ROUND(AVG(rs.rollup_confidence_score)::numeric, 4) AS avg_rollup_confidence_score,
          ROUND(MAX(rs.rollup_freshness_score)::numeric, 4) AS max_rollup_freshness_score,
          ROUND(AVG(rs.rollup_freshness_score)::numeric, 4) AS avg_rollup_freshness_score,
          BOOL_OR(COALESCE(rs.account_support, false)) AS has_account_support,
          BOOL_OR(COALESCE(rs.repeated_entity_support, false)) AS has_repeated_entity_support,
          MAX(rs.material_entity_support_count) AS max_material_entity_support_count,
          ARRAY_AGG(DISTINCT rs.rollup_scope_classification)
            FILTER (WHERE rs.rollup_scope_classification IS NOT NULL) AS rollup_scope_classifications,
          ARRAY_AGG(DISTINCT rp.priority_label)
            FILTER (WHERE rp.priority_label IS NOT NULL) AS rollup_priority_labels
        FROM researched_signals u
        LEFT JOIN rollup_signals rs
          ON rs.research_run_id = u.research_run_id
         AND rs.company_id = u.company_id
         AND rs.signal_definition_id = u.signal_definition_id
        LEFT JOIN rollup_priorities rp
          ON rp.research_run_id = u.research_run_id
         AND rp.company_id = u.company_id
         AND rp.signal_definition_id = u.signal_definition_id
        GROUP BY u.signal_definition_id
      ),
      frontend_report AS (
        SELECT
          um.signal_definition_id,
          st.name AS signal_type_name,
          sd.code AS signal_definition_code,
          sd.name AS signal_definition_name,
          um.researched_context_count,
          COALESCE(dm.decision_context_count, 0) AS decision_context_count,
          um.researched_context_count - COALESCE(dm.decision_context_count, 0) AS researched_but_not_selected_context_count,
          COALESCE(dm.used_seed_count, 0) AS used_seed_count,
          COALESCE(dm.final_opportunity_count, 0) AS final_opportunity_count,
          COALESCE(dm.top10_opportunity_count, 0) AS top10_opportunity_count,
          COALESCE(dm.deep_dive_opportunity_count, 0) AS deep_dive_opportunity_count,
          COALESCE(dm.used_effective_signal_score, 0) AS used_effective_signal_score,
          COALESCE(dm.top10_effective_signal_score, 0) AS top10_effective_signal_score,
          COALESCE(dm.avg_effective_signal_score, 0) AS avg_effective_signal_score,
          COALESCE(bm.total_confirmation_count, 0) AS total_confirmation_count,
          COALESCE(rm.avg_rollup_strength_score, bm.avg_base_strength_score, 0) AS avg_evidence_strength_score,
          COALESCE(rm.avg_rollup_confidence_score, bm.avg_base_average_confidence, 0) AS avg_evidence_confidence_score,
          COALESCE(rm.avg_rollup_freshness_score, 0) AS avg_evidence_freshness_score,
          bm.latest_effective_date,
          COALESCE(dm.selected_opportunity_spaces, ARRAY[]::text[]) AS selected_opportunity_spaces,
          CASE
            WHEN COALESCE(dm.seed_count, 0) = 0 THEN 'researched_but_never_selected'
            WHEN COALESCE(dm.final_opportunity_count, 0) = 0 THEN 'selected_but_never_converted'
            WHEN COALESCE(dm.deep_dive_opportunity_count, 0) > 0 THEN 'deep_dive_signal'
            WHEN COALESCE(dm.top10_opportunity_count, 0) > 0 THEN 'top10_signal'
            ELSE 'converted_signal'
          END AS signal_effectiveness_class
        FROM universe_metrics um
        INNER JOIN public.signal_definitions sd ON sd.id = um.signal_definition_id
        INNER JOIN public.signal_types st ON st.id = sd.signal_type_id
        LEFT JOIN decision_metrics dm ON dm.signal_definition_id = um.signal_definition_id
        LEFT JOIN base_metrics bm ON bm.signal_definition_id = um.signal_definition_id
        LEFT JOIN rollup_metrics rm ON rm.signal_definition_id = um.signal_definition_id
      )
      SELECT
        signal_definition_id,
        signal_type_name,
        signal_definition_name,
        researched_context_count,
        decision_context_count,
        researched_but_not_selected_context_count,
        used_seed_count,
        final_opportunity_count,
        top10_opportunity_count,
        deep_dive_opportunity_count,
        used_effective_signal_score,
        top10_effective_signal_score,
        avg_effective_signal_score,
        total_confirmation_count,
        avg_evidence_strength_score,
        avg_evidence_confidence_score,
        avg_evidence_freshness_score,
        latest_effective_date,
        selected_opportunity_spaces,
        signal_effectiveness_class
      FROM frontend_report
      ORDER BY
        used_effective_signal_score DESC NULLS LAST,
        deep_dive_opportunity_count DESC,
        top10_opportunity_count DESC,
        final_opportunity_count DESC,
        researched_context_count DESC,
        signal_definition_name
    `;
  }

  static async getSalesMinerReportOpportunitySummary(reportId: number) {
    return prisma.$queryRaw<Array<{
      motion_family: string | null;
      horizon: string | null;
      count: bigint;
      avg_priority: number | null;
      companies_count: bigint;
    }>>`
      SELECT
        oc.motion_family,
        oc.horizon,
        count(*) AS count,
        round(avg(oc.portfolio_priority_score)::numeric, 2) AS avg_priority,
        count(DISTINCT oc.company_id) AS companies_count
      FROM opportunity_candidates oc
      JOIN research_runs rr ON rr.id = oc.research_run_id
      JOIN report_companies rc ON rc.company_id = rr.company_id AND rc.report_id = ${reportId}
      WHERE rr.report_id = ${reportId}
      GROUP BY oc.motion_family, oc.horizon
      ORDER BY avg_priority DESC NULLS LAST
    `;
  }

  static async getSalesMinerAccountOpportunitySummary(accountReportId: number, entityReportId: number) {
    return prisma.$queryRaw<Array<{
      motion_family: string | null;
      horizon: string | null;
      count: bigint;
      avg_priority: number | null;
      companies_count: bigint;
    }>>`
      SELECT
        oc.motion_family,
        oc.horizon,
        count(*) AS count,
        round(avg(oc.portfolio_priority_score)::numeric, 2) AS avg_priority,
        count(DISTINCT oc.company_id) AS companies_count
      FROM opportunity_candidates oc
      JOIN research_runs rr ON rr.id = oc.research_run_id
      JOIN companies child ON child.id = rr.company_id
      WHERE rr.report_id = ${entityReportId}
        AND EXISTS (
          SELECT 1 FROM report_companies rc
          JOIN companies account ON account.id = rc.company_id
          WHERE rc.report_id = ${accountReportId}
            AND (child.parent_company = account.id OR child.id = account.id)
        )
      GROUP BY oc.motion_family, oc.horizon
      ORDER BY avg_priority DESC NULLS LAST
    `;
  }

  static async getSalesMinerEntityTopCompanies(reportId: number) {
    return prisma.$queryRaw<Array<{
      id: number;
      name: string;
      opp_count: bigint;
      avg_priority: number | null;
      signal_count: bigint;
      is_analyzed: boolean;
    }>>`
      SELECT
        c.id,
        c.name,
        count(DISTINCT oc.id) AS opp_count,
        round(avg(oc.portfolio_priority_score)::numeric, 1) AS avg_priority,
        count(DISTINCT cssi.id) AS signal_count,
        (count(DISTINCT rr.id) > 0) AS is_analyzed
      FROM report_companies rc
      JOIN companies c ON c.id = rc.company_id
      LEFT JOIN research_runs rr ON rr.company_id = c.id AND rr.report_id = ${reportId}
      LEFT JOIN opportunity_candidates oc ON oc.research_run_id = rr.id
      LEFT JOIN company_signal_summaries css ON css.research_run_id = rr.id
      LEFT JOIN company_signal_summary_items cssi ON cssi.company_signal_summary_id = css.id
      WHERE rc.report_id = ${reportId}
      GROUP BY c.id, c.name
      ORDER BY avg_priority DESC NULLS LAST
    `;
  }

  static async getSalesMinerAccountCompanies(reportId: number, relatedReportId: number) {
    return prisma.$queryRaw<Array<{
      id: number;
      name: string;
      opp_count: bigint;
      avg_priority: number | null;
      signal_count: bigint;
      steps_done: bigint;
    }>>`
      SELECT
        c.id,
        c.name,
        (
          SELECT count(DISTINCT oc.id)
          FROM research_runs rr
          JOIN companies child ON child.id = rr.company_id
          JOIN opportunity_candidates oc ON oc.research_run_id = rr.id
          WHERE rr.report_id = ${relatedReportId}
            AND (child.parent_company = c.id OR child.id = c.id)
        ) AS opp_count,
        (
          SELECT round(avg(oc.portfolio_priority_score)::numeric, 1)
          FROM research_runs rr
          JOIN companies child ON child.id = rr.company_id
          JOIN opportunity_candidates oc ON oc.research_run_id = rr.id
          WHERE rr.report_id = ${relatedReportId}
            AND (child.parent_company = c.id OR child.id = c.id)
        ) AS avg_priority,
        (
          SELECT count(DISTINCT cssi.id)
          FROM research_runs rr
          JOIN companies child ON child.id = rr.company_id
          JOIN company_signal_summaries css ON css.research_run_id = rr.id
          JOIN company_signal_summary_items cssi ON cssi.company_signal_summary_id = css.id
          WHERE rr.report_id = ${relatedReportId}
            AND (child.parent_company = c.id OR child.id = c.id)
        ) AS signal_count,
        (
          SELECT count(*) FROM sales_report_step_intermediate_results srir2
          WHERE srir2.report_id = ${reportId} AND srir2.company_id = c.id AND srir2.status = true
        ) AS steps_done
      FROM report_companies rc
      JOIN companies c ON c.id = rc.company_id
      WHERE rc.report_id = ${reportId}
      ORDER BY opp_count DESC
    `;
  }
}
