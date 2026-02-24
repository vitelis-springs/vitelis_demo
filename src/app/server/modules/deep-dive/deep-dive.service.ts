import { report_status_enum } from "../../../../generated/prisma";
import {
  buildKpiScoreValue,
  isKpiScoreTier,
  isKpiScoreValue,
  KPI_SCORE_TIER_BY_VALUE,
  type KpiScoreTier,
  type KpiScoreValue,
} from "../../../../shared/kpi-score";
import {
  CompanyDataPointResultUpdateData,
  DeepDiveRepository,
  DeepDiveListParams,
  SourceFilterParams,
  SourceCountingContext,
  SourcesAnalyticsParams,
  ScrapeCandidatesParams,
} from "./deep-dive.repository";

const DEFAULT_STATUS_COUNTS = {
  PENDING: 0,
  PROCESSING: 0,
  DONE: 0,
  ERROR: 0,
};

type ReuseSettingsAction = {
  mode: "reuse";
  id: number;
};

type CreateReportSettingsAction =
  | {
      mode: "create";
      strategy: "clone";
      baseId: number;
      name?: string;
      settings: Record<string, unknown>;
    }
  | {
      mode: "create";
      strategy: "blank";
      name: string;
      masterFileId: string;
      prefix?: number | null;
      settings: Record<string, unknown>;
    };

type CreateValidatorSettingsAction =
  | {
      mode: "create";
      strategy: "clone";
      baseId: number;
      name?: string;
      settings: Record<string, unknown>;
    }
  | {
      mode: "create";
      strategy: "blank";
      name: string;
      settings: Record<string, unknown>;
    };

export type ReportSettingsAction = ReuseSettingsAction | CreateReportSettingsAction;
export type ValidatorSettingsAction = ReuseSettingsAction | CreateValidatorSettingsAction;

export interface UpdateDeepDiveSettingsPayload {
  reportSettingsAction?: ReportSettingsAction;
  validatorSettingsAction?: ValidatorSettingsAction;
}

export interface UpdateCompanyDataPointPayload {
  reasoning?: string | null;
  sources?: string | null;
  score?: string | number | null;
  scoreValue?: KpiScoreValue | null;
  scoreTier?: KpiScoreTier | null;
  status?: boolean;
}

export class DeepDiveService {
  private static isJsonObject(
    value: unknown
  ): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private static normalizeName(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private static buildCopyName(
    baseName: string,
    reportId: number,
    requestedName?: string
  ): string {
    const normalized = this.normalizeName(requestedName);
    return normalized ?? `${baseName} (Report #${reportId} copy)`;
  }

  private static async resolveReportSettingsId(
    reportId: number,
    action: ReportSettingsAction
  ): Promise<{ success: true; id: number } | { success: false; error: string }> {
    if (action.mode === "reuse") {
      const existing = await DeepDiveRepository.getReportSettingsById(action.id);
      if (!existing) return { success: false, error: "Report settings not found" };
      return { success: true, id: existing.id };
    }

    if (action.strategy === "clone") {
      const base = await DeepDiveRepository.getReportSettingsById(action.baseId);
      if (!base) {
        return { success: false, error: "Base report settings template not found" };
      }
      if (!this.isJsonObject(action.settings)) {
        return { success: false, error: "reportSettingsAction.settings must be a JSON object" };
      }

      const created = await DeepDiveRepository.createReportSettings({
        name: this.buildCopyName(base.name, reportId, action.name),
        masterFileId: base.masterFileId,
        prefix: base.prefix,
        settings: action.settings,
      });
      return { success: true, id: created.id };
    }

    if (!this.isJsonObject(action.settings)) {
      return { success: false, error: "reportSettingsAction.settings must be a JSON object" };
    }

    const name = this.normalizeName(action.name);
    if (!name) {
      return { success: false, error: "reportSettingsAction.name is required" };
    }
    const masterFileId = action.masterFileId.trim();
    if (!masterFileId) {
      return { success: false, error: "reportSettingsAction.masterFileId is required" };
    }
    if (action.prefix !== undefined && action.prefix !== null && !Number.isInteger(action.prefix)) {
      return { success: false, error: "reportSettingsAction.prefix must be an integer or null" };
    }

    const created = await DeepDiveRepository.createReportSettings({
      name,
      masterFileId,
      prefix: action.prefix ?? null,
      settings: action.settings,
    });
    return { success: true, id: created.id };
  }

  private static async resolveValidatorSettingsId(
    reportId: number,
    action: ValidatorSettingsAction
  ): Promise<{ success: true; id: number } | { success: false; error: string }> {
    if (action.mode === "reuse") {
      const existing = await DeepDiveRepository.getValidatorSettingsById(action.id);
      if (!existing) return { success: false, error: "Validator settings not found" };
      return { success: true, id: existing.id };
    }

    if (action.strategy === "clone") {
      const base = await DeepDiveRepository.getValidatorSettingsById(action.baseId);
      if (!base) {
        return { success: false, error: "Base validator settings template not found" };
      }
      if (!this.isJsonObject(action.settings)) {
        return { success: false, error: "validatorSettingsAction.settings must be a JSON object" };
      }

      const created = await DeepDiveRepository.createValidatorSettings({
        name: this.buildCopyName(base.name, reportId, action.name),
        settings: action.settings,
      });
      return { success: true, id: created.id };
    }

    if (!this.isJsonObject(action.settings)) {
      return { success: false, error: "validatorSettingsAction.settings must be a JSON object" };
    }

    const name = this.normalizeName(action.name);
    if (!name) {
      return { success: false, error: "validatorSettingsAction.name is required" };
    }

    const created = await DeepDiveRepository.createValidatorSettings({
      name,
      settings: action.settings,
    });
    return { success: true, id: created.id };
  }

  private static async buildSourceCountingContext(
    reportId: number,
  ): Promise<SourceCountingContext> {
    return DeepDiveRepository.getSourceCountingContext(reportId);
  }

  private static normalizeTextInput(value: string | null): string | null {
    if (value === null) return null;
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private static normalizeRawScoreInput(value: string | number | null): {
    textValue: string | null;
    numericValue: number | null;
  } | null {
    if (value === null) {
      return { textValue: null, numericValue: null };
    }

    if (typeof value === "number") {
      if (!Number.isFinite(value)) return null;
      return { textValue: String(value), numericValue: value };
    }

    const normalized = value.trim();
    if (!normalized) {
      return { textValue: null, numericValue: null };
    }

    const parsedNumber = Number(normalized);
    return {
      textValue: normalized,
      numericValue: Number.isFinite(parsedNumber) ? parsedNumber : null,
    };
  }

  private static normalizeKpiScoreInput(payload: UpdateCompanyDataPointPayload): {
    provided: boolean;
    success: boolean;
    error?: string;
    concatenatedValue?: string | null;
    scoreValue?: KpiScoreValue | null;
    scoreTier?: KpiScoreTier | null;
  } {
    const hasScoreValue = payload.scoreValue !== undefined;
    const hasScoreTier = payload.scoreTier !== undefined;
    const hasLegacyScore = payload.score !== undefined;
    const provided = hasScoreValue || hasScoreTier || hasLegacyScore;

    if (!provided) return { provided: false, success: true };

    if (hasLegacyScore) {
      return {
        provided: true,
        success: false,
        error: "Use scoreValue and scoreTier for KPI category/driver updates",
      };
    }

    if (!hasScoreValue || !hasScoreTier) {
      return {
        provided: true,
        success: false,
        error: "scoreValue and scoreTier must be provided together",
      };
    }

    const scoreValue = payload.scoreValue ?? null;
    const scoreTier = payload.scoreTier ?? null;

    if (scoreValue === null && scoreTier === null) {
      return {
        provided: true,
        success: true,
        concatenatedValue: null,
        scoreValue: null,
        scoreTier: null,
      };
    }

    if (!isKpiScoreValue(scoreValue) || !isKpiScoreTier(scoreTier)) {
      return {
        provided: true,
        success: false,
        error: "scoreValue must be 1-5 and scoreTier must be a valid tier",
      };
    }

    const expectedTier = KPI_SCORE_TIER_BY_VALUE[scoreValue];
    if (scoreTier !== expectedTier) {
      return {
        provided: true,
        success: false,
        error: `scoreTier must be ${expectedTier} for scoreValue ${scoreValue}`,
      };
    }

    return {
      provided: true,
      success: true,
      concatenatedValue: buildKpiScoreValue(scoreValue, scoreTier),
      scoreValue,
      scoreTier,
    };
  }

  static async updateCompanyDataPoint(
    reportId: number,
    companyId: number,
    resultId: number,
    payload: UpdateCompanyDataPointPayload,
  ) {
    const existing = await DeepDiveRepository.getCompanyDataPointResultById(
      reportId,
      companyId,
      resultId,
    );
    if (!existing) return null;

    const dataPointType = existing.data_points?.type ?? "";
    const dataPointId = existing.data_point_id ?? "";
    const isCategory = dataPointType === "kpi_category" || dataPointId.startsWith("kpi_category");
    const isDriver = dataPointType === "kpi_driver" || dataPointId.startsWith("kpi_driver");
    const isRaw = dataPointType === "raw_data_point" || dataPointId.startsWith("raw_data_point");

    const mutableData: Record<string, unknown> = this.isJsonObject(existing.data)
      ? { ...existing.data }
      : {};

    const patch: CompanyDataPointResultUpdateData = {};
    let dataChanged = false;

    if (payload.reasoning !== undefined) {
      const reasoning = payload.reasoning === null
        ? null
        : this.normalizeTextInput(payload.reasoning);

      if (isRaw) {
        mutableData.explanation = reasoning;
      }
      mutableData.Reasoning = reasoning;
      dataChanged = true;
    }

    if (payload.sources !== undefined) {
      const sources = payload.sources === null
        ? null
        : this.normalizeTextInput(payload.sources);

      mutableData.Sources = sources;
      mutableData.sources = sources;
      dataChanged = true;
    }

    if (isCategory || isDriver) {
      const normalizedKpiScore = this.normalizeKpiScoreInput(payload);
      if (!normalizedKpiScore.success) {
        return { success: false, error: normalizedKpiScore.error || "Invalid KPI score payload" } as const;
      }
      if (normalizedKpiScore.provided) {
        patch.value = normalizedKpiScore.concatenatedValue ?? null;
        if (isCategory) {
          mutableData["KPI Score"] = normalizedKpiScore.concatenatedValue ?? null;
        } else {
          mutableData.Score = normalizedKpiScore.concatenatedValue ?? null;
        }
        dataChanged = true;
      }
    } else if (payload.score !== undefined) {
      const normalizedScore = this.normalizeRawScoreInput(payload.score);
      if (!normalizedScore) {
        return { success: false, error: "score must be a finite number, string, or null" } as const;
      }

      if (isRaw) {
        patch.manualValue = normalizedScore.textValue;
        mutableData.answer = normalizedScore.numericValue ?? normalizedScore.textValue;
        dataChanged = true;
      } else {
        patch.value = normalizedScore.textValue;
        mutableData.Score = normalizedScore.numericValue ?? normalizedScore.textValue;
        dataChanged = true;
      }
    }

    if (payload.status !== undefined) {
      patch.status = payload.status;
    }

    if (dataChanged) {
      patch.data = mutableData as unknown as CompanyDataPointResultUpdateData["data"];
    }

    if (Object.keys(patch).length === 0) {
      return { success: false, error: "No fields to update" } as const;
    }

    const updated = await DeepDiveRepository.updateCompanyDataPointResult(
      resultId,
      patch,
    );

    return {
      success: true as const,
      data: {
        id: updated.id,
        reportId: updated.report_id,
        companyId: updated.company_id,
        dataPointId: updated.data_point_id,
        type: updated.data_points?.type ?? null,
        value: updated.value,
        manualValue: updated.manualValue,
        status: updated.status,
        data: updated.data,
        updatedAt: updated.updates_at,
      },
    };
  }

  static async getSettings(reportId: number) {
    const [snapshot, reportSettingsOptions, validatorSettingsOptions] = await Promise.all([
      DeepDiveRepository.getReportSettingsSnapshot(reportId),
      DeepDiveRepository.listReportSettings(),
      DeepDiveRepository.listValidatorSettings(),
    ]);

    if (!snapshot) return null;

    return {
      success: true,
      data: {
        report: {
          id: snapshot.reportId,
          name: snapshot.reportName,
        },
        current: {
          reportSettings: snapshot.reportSettings,
          validatorSettings: snapshot.validatorSettings,
        },
        options: {
          reportSettings: reportSettingsOptions,
          validatorSettings: validatorSettingsOptions,
        },
      },
    };
  }

  static async updateSettings(
    reportId: number,
    payload: UpdateDeepDiveSettingsPayload
  ) {
    const snapshot = await DeepDiveRepository.getReportSettingsSnapshot(reportId);
    if (!snapshot) {
      return { success: false, error: "Deep dive not found" };
    }

    if (!payload.reportSettingsAction && !payload.validatorSettingsAction) {
      return { success: false, error: "At least one settings action is required" };
    }

    let reportSettingsId = snapshot.reportSettingsId;
    let validatorSettingsId = snapshot.sourceValidationSettingsId;

    if (payload.reportSettingsAction) {
      const resolved = await this.resolveReportSettingsId(
        reportId,
        payload.reportSettingsAction
      );
      if (!resolved.success) return resolved;
      reportSettingsId = resolved.id;
    }

    if (payload.validatorSettingsAction) {
      const resolved = await this.resolveValidatorSettingsId(
        reportId,
        payload.validatorSettingsAction
      );
      if (!resolved.success) return resolved;
      validatorSettingsId = resolved.id;
    }

    const updated = await DeepDiveRepository.updateReportSettingsReferences(
      reportId,
      reportSettingsId,
      validatorSettingsId
    );
    if (!updated) {
      return { success: false, error: "Deep dive not found" };
    }

    const result = await this.getSettings(reportId);
    if (!result) {
      return { success: false, error: "Deep dive not found" };
    }

    return result;
  }

  static async listDeepDives(params: DeepDiveListParams) {
    const [{ items, total }, useCases, industries] = await Promise.all([
      DeepDiveRepository.listReports(params),
      DeepDiveRepository.getDistinctUseCasesForReports(),
      DeepDiveRepository.getDistinctIndustriesForReports(),
    ]);

    return {
      success: true,
      data: {
        total,
        items: items.map((report) => {
          const firstCompany = report.report_companies[0]?.companies;
          return {
            id: report.id,
            name: report.name,
            description: report.description,
            createdAt: report.created_at,
            updatedAt: report.updates_at,
            status: report.report_orhestrator?.status ?? report_status_enum.PENDING,
            settings: report.report_settings
              ? {
                  id: report.report_settings.id,
                  name: report.report_settings.name,
                  masterFileId: report.report_settings.master_file_id,
                  prefix: report.report_settings.prefix,
                  settings: report.report_settings.settings,
                }
              : null,
            useCase: report.use_cases
              ? {
                  id: report.use_cases.id,
                  name: report.use_cases.name,
                }
              : null,
            industryName: firstCompany?.industries?.name ?? null,
            counts: {
              companies: report._count.report_companies,
              steps: report._count.report_steps,
            },
          };
        }),
        filters: {
          useCases,
          industries,
        },
      },
    };
  }

  static async getDeepDiveById(reportId: number) {
    const report = await DeepDiveRepository.getReportById(reportId);
    if (!report) return null;

    const companies = await DeepDiveRepository.getReportCompanies(reportId);
    const companyIds = companies
      .map((row) => row.company_id)
      .filter((id): id is number => typeof id === "number");

    const sourceCountingContext = await this.buildSourceCountingContext(reportId);

    const [
      kpiRaw,
      totalSources,
      totalUsedSources,
      totalScrapeCandidates,
      totalQueries,
      companyStatusRaw,
      perCompanySources,
      perCompanyUsedSources,
      perCompanyCandidates,
    ] = await Promise.all([
      DeepDiveRepository.getKpiCategoryScoresByCompany(reportId),
      DeepDiveRepository.getReportSourcesCount(reportId, sourceCountingContext),
      DeepDiveRepository.getReportUsedSourcesCount(reportId, sourceCountingContext),
      DeepDiveRepository.getReportScrapeCandidatesCount(reportId, sourceCountingContext),
      DeepDiveRepository.getReportQueriesCount(reportId),
      DeepDiveRepository.getCompanyStepStatusSummary(reportId, companyIds),
      DeepDiveRepository.getPerCompanySourcesCount(reportId, sourceCountingContext),
      DeepDiveRepository.getPerCompanyUsedSourcesCount(reportId, sourceCountingContext),
      DeepDiveRepository.getPerCompanyCandidatesCount(reportId, sourceCountingContext),
    ]);

    // Build KPI chart — categories are dynamic, derived from data
    const categoriesSet = new Set<string>();
    const chartMap = new Map<number, Record<string, unknown>>();

    for (const row of kpiRaw) {
      categoriesSet.add(row.category);

      if (!chartMap.has(row.company_id)) {
        chartMap.set(row.company_id, {
          company: row.company_name,
          companyId: row.company_id,
        });
      }
      const entry = chartMap.get(row.company_id)!;
      entry[row.category] = Math.round(row.avg_score * 10) / 10;
    }

    const categories = Array.from(categoriesSet).sort();
    const kpiChart = Array.from(chartMap.values());

    // Derive per-company dominant status
    const statusByCompany = new Map<number, Record<report_status_enum, number>>();
    companyStatusRaw.forEach((row) => {
      const current = statusByCompany.get(row.company_id) ?? { ...DEFAULT_STATUS_COUNTS };
      current[row.status] = row._count._all;
      statusByCompany.set(row.company_id, current);
    });

    const totalSteps = await DeepDiveRepository.getReportSteps(reportId);
    const totalStepsCount = totalSteps.length;

    // Per-company sources & candidates maps
    const sourcesMap = new Map<number, number>();
    const validSourcesMap = new Map<number, number>();
    for (const row of perCompanySources) {
      sourcesMap.set(row.company_id, row.total);
      validSourcesMap.set(row.company_id, row.valid_count);
    }
    const usedSourcesMap = new Map<number, number>();
    for (const row of perCompanyUsedSources) {
      usedSourcesMap.set(row.company_id, row.total);
    }
    const candidatesMap = new Map<number, number>();
    for (const row of perCompanyCandidates) {
      candidatesMap.set(row.company_id, row.total);
    }

    function deriveDominantStatus(counts: Record<report_status_enum, number>): report_status_enum {
      const total = counts.PENDING + counts.PROCESSING + counts.DONE + counts.ERROR;
      if (counts.ERROR > 0) return report_status_enum.ERROR;
      if (counts.PROCESSING > 0) return report_status_enum.PROCESSING;
      if (counts.PENDING > 0) return report_status_enum.PENDING;
      // No statuses recorded or fewer than total steps (without active processing/error) -> PENDING
      if (total === 0 || total < totalStepsCount) return report_status_enum.PENDING;
      return report_status_enum.DONE;
    }

    return {
      success: true,
      data: {
        report: {
          id: report.id,
          name: report.name,
          description: report.description,
          createdAt: report.created_at,
          updatedAt: report.updates_at,
          status: report.report_orhestrator?.status ?? report_status_enum.PENDING,
          useCase: report.use_cases
            ? { id: report.use_cases.id, name: report.use_cases.name }
            : null,
          settings: report.report_settings
            ? { id: report.report_settings.id, name: report.report_settings.name }
            : null,
        },
        summary: {
          companiesCount: companies.length,
          orchestratorStatus: report.report_orhestrator?.status ?? report_status_enum.PENDING,
          totalSources,
          usedSources: totalUsedSources,
          totalScrapeCandidates,
          totalQueries,
        },
        categories,
        kpiChart,
        companies: companies
          .filter((row) => row.companies !== null)
          .map((row) => {
            const company = row.companies!;
            const counts = statusByCompany.get(company.id) ?? { ...DEFAULT_STATUS_COUNTS };
            const doneSteps = counts.DONE;
            return {
              id: company.id,
              name: company.name,
              countryCode: company.country_code,
              url: company.url,
              status: deriveDominantStatus(counts),
              sourcesCount: sourcesMap.get(company.id) ?? 0,
              validSourcesCount: validSourcesMap.get(company.id) ?? 0,
              usedSourcesCount: usedSourcesMap.get(company.id) ?? 0,
              candidatesCount: candidatesMap.get(company.id) ?? 0,
              stepsDone: doneSteps,
              stepsTotal: totalStepsCount,
            };
          }),
      },
    };
  }

  static async getReportCompanyIds(reportId: number): Promise<number[] | null> {
    const report = await DeepDiveRepository.getReportById(reportId);
    if (!report) return null;

    const companies = await DeepDiveRepository.getReportCompanies(reportId);
    return companies
      .map((row) => row.company_id)
      .filter((id): id is number => typeof id === "number");
  }

  static async getReportQueries(reportId: number, params?: { sortBy?: string; sortOrder?: import("../../../../types/sorting").SortOrder }) {
    const report = await DeepDiveRepository.getReportById(reportId);
    if (!report) return null;

    const sourceCountingContext = await this.buildSourceCountingContext(reportId);
    const rows = await DeepDiveRepository.getReportQueriesWithStats(
      reportId,
      params?.sortBy,
      params?.sortOrder,
      sourceCountingContext,
    );

    return {
      success: true,
      data: {
        reportName: report.name,
        queries: rows.map((row) => {
          const total = Number(row.total_companies);
          const completed = Number(row.completed_companies);
          return {
            id: Number(row.id),
            goal: row.goal ?? "",
            searchQueries: Array.isArray(row.search_queries) ? row.search_queries : [],
            sourcesCount: row.sources_count,
            candidatesCount: row.candidates_count,
            completedCompanies: completed,
            totalCompanies: total,
            completionPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
            dataPoints: (row.data_points ?? []).map((dp) => ({
              id: dp.id,
              name: dp.name ?? "",
              type: dp.type ?? "",
            })),
          };
        }),
      },
    };
  }

  static async updateQuery(
    reportId: number,
    queryId: number,
    payload: { goal: string; searchQueries: string[] },
  ) {
    const bigId = BigInt(queryId);

    const link = await DeepDiveRepository.verifyQueryBelongsToReport(reportId, bigId);
    if (!link) return null;

    if (!payload.goal.trim()) {
      return { success: false, error: "Goal cannot be empty" };
    }

    await DeepDiveRepository.updateQueryContent(bigId, {
      goal: payload.goal.trim(),
      search_queries: payload.searchQueries.filter((q) => q.trim() !== ""),
    });

    return { success: true };
  }

  static async getCompanyDeepDive(
    reportId: number,
    companyId: number,
    filters: SourceFilterParams
  ) {
    const company = await DeepDiveRepository.getCompany(reportId, companyId);
    if (!company) return null;

    const steps = await DeepDiveRepository.getReportSteps(reportId);

    const [
      stepStatuses,
      kpiResults,
      scrapCandidates,
      scrapCandidatesTotal,
      sources,
      kpiAllScores,
    ] = await Promise.all([
      DeepDiveRepository.getCompanyStepStatuses(reportId, companyId),
      DeepDiveRepository.getCompanyKpiResults(reportId, companyId),
      DeepDiveRepository.getCompanyScrapCandidates(reportId, companyId, 200),
      DeepDiveRepository.getCompanyScrapCandidatesCount(reportId, companyId),
      DeepDiveRepository.getCompanySources(reportId, companyId, filters),
      DeepDiveRepository.getKpiCategoryScoresByCompany(reportId),
    ]);

    const statusByStepId = new Map<number, typeof stepStatuses[number]>();
    stepStatuses.forEach((row) => {
      statusByStepId.set(row.step_id, row);
    });

    const orderedSteps = steps.map((step) => {
      const status = statusByStepId.get(step.step_id);

      return {
        stepId: step.step_id,
        order: step.step_order,
        status: status?.status ?? report_status_enum.PENDING,
        updatedAt: status?.updated_at ?? null,
        metadata: status?.metadata ?? null,
        definition: {
          id: step.report_generation_steps.id,
          name: step.report_generation_steps.name,
          url: step.report_generation_steps.url,
          dependency: step.report_generation_steps.dependency,
          settings: step.report_generation_steps.settings,
        },
      };
    });

    // Build KPI averages for radar chart: report average + top-5 average
    const companyScores = new Map<number, { name: string; totals: Map<string, number> }>();
    const categoryScoreSums = new Map<string, { sum: number; count: number }>();

    for (const row of kpiAllScores) {
      // Accumulate per-company
      if (!companyScores.has(row.company_id)) {
        companyScores.set(row.company_id, { name: row.company_name, totals: new Map() });
      }
      companyScores.get(row.company_id)!.totals.set(row.category, row.avg_score);

      // Accumulate report-wide per category
      const cat = categoryScoreSums.get(row.category) ?? { sum: 0, count: 0 };
      cat.sum += row.avg_score;
      cat.count += 1;
      categoryScoreSums.set(row.category, cat);
    }

    // Report average per category
    const reportAverage: Record<string, number> = {};
    categoryScoreSums.forEach(({ sum, count }, cat) => {
      reportAverage[cat] = Math.round((sum / count) * 10) / 10;
    });

    // Top-5 companies by total score, then average per category
    const companyTotals = Array.from(companyScores.entries()).map(([id, { name, totals }]) => {
      let total = 0;
      totals.forEach((score) => { total += score; });
      return { id, name, total, totals };
    });
    companyTotals.sort((a, b) => b.total - a.total);
    const top5 = companyTotals.slice(0, 5);

    const top5Average: Record<string, number> = {};
    if (top5.length > 0) {
      const top5Sums = new Map<string, { sum: number; count: number }>();
      for (const c of top5) {
        c.totals.forEach((score, cat) => {
          const entry = top5Sums.get(cat) ?? { sum: 0, count: 0 };
          entry.sum += score;
          entry.count += 1;
          top5Sums.set(cat, entry);
        });
      }
      top5Sums.forEach(({ sum, count }, cat) => {
        top5Average[cat] = Math.round((sum / count) * 10) / 10;
      });
    }

    return {
      success: true,
      data: {
        reportId,
        company: {
          id: company.id,
          name: company.name,
          countryCode: company.country_code,
          url: company.url,
          industryId: company.industry_id,
        },
        kpiAverages: {
          reportAverage,
          top5Average,
          top5Companies: top5.map((c) => ({ id: c.id, name: c.name, total: Math.round(c.total * 10) / 10 })),
        },
        steps: orderedSteps,
        kpiResults: kpiResults.map((result) => ({
          id: result.id,
          dataPointId: result.data_point_id,
          name: result.data_points?.name,
          type: result.data_points?.type,
          value: result.value,
          manualValue: result.manualValue,
          data: result.data,
          status: result.status,
          updatedAt: result.updates_at,
        })),
        scrapCandidates: scrapCandidates.map((candidate) => ({
          id: candidate.id,
          title: candidate.title,
          description: candidate.description,
          url: candidate.url,
          status: candidate.status,
          metadata: candidate.metadata,
          createdAt: candidate.created_at,
          updatedAt: candidate.updated_at,
        })),
        scrapCandidatesTotal,
        sources: {
          total: sources.total,
          byTier: sources.byTier.map((row) => ({
            tier: row.tier,
            count: (row._count as { _all: number })._all,
          })),
          byVectorized: sources.byVectorized.map((row) => ({
            isVectorized: row.isVectorized,
            count: (row._count as { _all: number })._all,
          })),
          metadataGroups: sources.metadataGroups,
          items: sources.items,
        },
      },
    };
  }

  static async getSourcesAnalytics(
    reportId: number,
    companyId: number,
    filters: SourcesAnalyticsParams,
  ) {
    const company = await DeepDiveRepository.getCompany(reportId, companyId);
    if (!company) return null;

    const result = await DeepDiveRepository.getSourcesAnalytics(
      reportId,
      companyId,
      filters,
    );

    return {
      success: true,
      data: {
        reportId,
        company: {
          id: company.id,
          name: company.name,
          countryCode: company.country_code,
          url: company.url,
        },
        totalUnfiltered: result.totalUnfiltered,
        totalFiltered: result.totalFiltered,
        vectorizedCount: result.vectorizedCount,
        aggregations: result.aggregations,
        items: result.items,
      },
    };
  }

  static async getScrapeCandidates(
    reportId: number,
    companyId: number,
    filters: ScrapeCandidatesParams,
  ) {
    const company = await DeepDiveRepository.getCompany(reportId, companyId);
    if (!company) return null;

    const result = await DeepDiveRepository.getScrapeCandidatesList(
      reportId,
      companyId,
      filters,
    );

    return {
      success: true,
      data: {
        reportId,
        company: {
          id: company.id,
          name: company.name,
          countryCode: company.country_code,
          url: company.url,
        },
        total: result.total,
        totalFiltered: result.totalFiltered,
        aggregations: result.aggregations,
        items: result.items,
      },
    };
  }
}
