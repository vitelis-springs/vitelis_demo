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
    const created = await prisma.report_settings.create({
      data: {
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
    const created = await prisma.source_validation_settings.create({
      data: {
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
}
