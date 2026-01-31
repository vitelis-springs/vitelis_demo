import { report_status_enum } from "../../../../generated/prisma";
import { DeepDiveRepository, DeepDiveListParams, SourceFilterParams } from "./deep-dive.repository";

const DEFAULT_STATUS_COUNTS = {
  PENDING: 0,
  PROCESSING: 0,
  DONE: 0,
  ERROR: 0,
};


export class DeepDiveService {
  static async listDeepDives(params: DeepDiveListParams) {
    const { items, total } = await DeepDiveRepository.listReports(params);

    return {
      success: true,
      data: {
        total,
        items: items.map((report) => ({
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
          counts: {
            companies: report._count.report_companies,
            steps: report._count.report_steps,
          },
        })),
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

    const [
      kpiRaw,
      totalSources,
      totalScrapeCandidates,
      totalQueries,
      companyStatusRaw,
    ] = await Promise.all([
      DeepDiveRepository.getKpiCategoryScoresByCompany(reportId),
      DeepDiveRepository.getReportSourcesCount(reportId),
      DeepDiveRepository.getReportScrapeCandidatesCount(reportId),
      DeepDiveRepository.getReportQueriesCount(reportId),
      DeepDiveRepository.getCompanyStepStatusSummary(reportId, companyIds),
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

    function deriveDominantStatus(counts: Record<report_status_enum, number>): report_status_enum {
      if (counts.ERROR > 0) return report_status_enum.ERROR;
      if (counts.PROCESSING > 0) return report_status_enum.PROCESSING;
      if (counts.PENDING > 0) return report_status_enum.PENDING;
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
            return {
              id: company.id,
              name: company.name,
              countryCode: company.country_code,
              url: company.url,
              status: deriveDominantStatus(counts),
            };
          }),
      },
    };
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
      sources,
    ] = await Promise.all([
      DeepDiveRepository.getCompanyStepStatuses(reportId, companyId),
      DeepDiveRepository.getCompanyKpiResults(reportId, companyId),
      DeepDiveRepository.getCompanyScrapCandidates(companyId, 200),
      DeepDiveRepository.getCompanySources(reportId, companyId, filters),
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
}
