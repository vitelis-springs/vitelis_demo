import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";
import type { KpiScoreTier, KpiScoreValue } from "../../shared/kpi-score";
import type { SortOrder } from "../../types/sorting";

export type DeepDiveStatus = "PENDING" | "PROCESSING" | "DONE" | "ERROR";

export interface DeepDiveListItem {
  id: number;
  name?: string | null;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  status: DeepDiveStatus;
  settings: {
    id: number;
    name: string;
    masterFileId: string;
    prefix: number | null;
    settings: unknown;
  } | null;
  useCase: {
    id: number;
    name: string;
  } | null;
  industryName?: string | null;
  reportType?: string | null;
  counts: {
    companies: number;
    steps: number;
  };
}

export interface DeepDiveFilterOptions {
  useCases: Array<{ id: number; name: string }>;
  industries: Array<{ id: number; name: string }>;
}

export interface DeepDiveListResponse {
  success: boolean;
  data: {
    total: number;
    items: DeepDiveListItem[];
    filters: DeepDiveFilterOptions;
  };
}

export interface DeepDiveSummary {
  companiesCount: number;
  orchestratorStatus: DeepDiveStatus;
  totalSources: number;
  usedSources: number;
  totalScrapeCandidates: number;
  totalQueries: number;
}

export interface KpiChartItem {
  company: string;
  companyId: number;
  [category: string]: string | number | null;
}

export interface DeepDiveCompanyRow {
  id: number;
  name: string;
  countryCode?: string | null;
  url?: string | null;
  status: DeepDiveStatus;
  sourcesCount: number;
  validSourcesCount: number;
  usedSourcesCount: number;
  candidatesCount: number;
  stepsDone: number;
  stepsTotal: number;
}

export interface DeepDiveDetailResponse {
  success: boolean;
  data: {
    report: {
      id: number;
      name?: string | null;
      description?: string | null;
      createdAt?: string | null;
      updatedAt?: string | null;
      status: DeepDiveStatus;
      useCase?: { id: number; name: string } | null;
      settings?: { id: number; name: string } | null;
    };
    summary: DeepDiveSummary;
    categories: string[];
    kpiChart: KpiChartItem[];
    companies: DeepDiveCompanyRow[];
  };
}

export interface DeepDiveOverviewResponse {
  success: boolean;
  data: {
    report: {
      id: number;
      name?: string | null;
      description?: string | null;
      createdAt?: string | null;
      updatedAt?: string | null;
      status: DeepDiveStatus;
      reportType?: string | null;
      useCase?: { id: number; name: string } | null;
      settings?: { id: number; name: string } | null;
    };
  };
}

export type DeepDiveMetricName =
  | "companies-count"
  | "orchestrator-status"
  | "total-sources"
  | "used-sources"
  | "total-scrape-candidates"
  | "total-queries";

export interface DeepDiveMetricResponse<
  TValue extends number | string = number | string,
> {
  success: boolean;
  data: {
    reportId: number;
    metric: DeepDiveMetricName;
    value: TValue;
  };
}

export interface DeepDiveKpiChartResponse {
  success: boolean;
  data: {
    reportId: number;
    categories: string[];
    kpiChart: KpiChartItem[];
  };
}

export interface DeepDiveCompaniesResponse {
  success: boolean;
  data: {
    reportId: number;
    companies: DeepDiveCompanyRow[];
  };
}

export interface KpiAverages {
  reportAverage: Record<string, number>;
  top5Average: Record<string, number>;
  top5Companies: Array<{ id: number; name: string; total: number }>;
}

export interface SalesMinerOpportunity {
  id: string;
  entityName?: string;
  title: string | null;
  score: number | null;
  portfolioPriorityScore: number | null;
  portfolioPriorityReason: string | null;
  track: string | null;
  horizon: string | null;
  dealSize: string | null;
  whyNow: string | null;
  businessProblem: string | null;
  valueProposition: string | null;
  rankPosition?: number | null;
  isTop10?: boolean | null;
  solutionCenter?: string | null;
}

export interface SalesMinerSignal {
  id: string;
  themeCode: string | null;
  strengthScore: number | null;
  confidenceScore: number | null;
  freshnessScore: number | null;
  summaryText: string | null;
  signalName: string | null;
  signalDescription: string | null;
}

export interface SalesMinerStakeholder {
  id: string;
  fullName: string | null;
  linkedinUrl: string | null;
  gateRole: string | null;
  gateRoleType: string | null;
  roleTitle: string | null;
  entityName: string | null;
  entityLevel: string | null;
  rationale: string | null;
  opportunityId: string | null;
}

export type SalesMinerCompanyResponse =
  | {
      success: boolean;
      data: {
        level: "account";
        reportId: number;
        company: { id: number; name: string; url?: string | null };
        accountSnapshot: unknown;
        accountAssessment: unknown;
        sellerBrief: unknown;
        validation: unknown;
        topOpportunities: SalesMinerOpportunity[];
      };
    }
  | {
      success: boolean;
      data: {
        level: "entity";
        reportId: number;
        company: { id: number; name: string; url?: string | null };
        signals: SalesMinerSignal[];
        opportunities: SalesMinerOpportunity[];
        stakeholders: SalesMinerStakeholder[];
      };
    };

export interface DeepDiveCompanyResponse {
  success: boolean;
  data: {
    reportId: number;
    reportType?: string | null;
    typeLevel?: string | null;
    company: {
      id: number;
      name: string;
      countryCode?: string | null;
      url?: string | null;
      industryId?: number | null;
      slug?: string | null;
      investPortal?: string | null;
      careerPortal?: string | null;
      reportRole?: string | null;
      additionalData?: unknown;
    };
    kpiAverages: KpiAverages;
    steps: Array<{
      stepId: number;
      order: number;
      status: DeepDiveStatus;
      updatedAt?: string | null;
      metadata?: unknown;
      definition: {
        id: number;
        name: string;
        url: string;
        dependency?: string | null;
        settings?: unknown;
      };
    }>;
    kpiResults: Array<{
      id: number;
      dataPointId?: string | null;
      name?: string | null;
      type?: string | null;
      value?: string | null;
      manualValue?: string | null;
      data?: unknown;
      status?: boolean | null;
      updatedAt?: string | null;
    }>;
    scrapCandidates: Array<{
      id: number;
      title?: string | null;
      description?: string | null;
      url: string;
      status: string;
      metadata?: unknown;
      createdAt?: string | null;
      updatedAt?: string | null;
    }>;
    scrapCandidatesTotal: number;
    sources: {
      total: number;
      byTier: Array<{ tier: number | null; count: number }>;
      byVectorized: Array<{ isVectorized: boolean | null; count: number }>;
      metadataGroups: Array<{ value: string | null; count: number }> | null;
      items: Array<{
        id: number;
        url: string;
        title?: string | null;
        summary?: string | null;
        tier?: number | null;
        date?: string | null;
        metadata?: unknown;
        isVectorized?: boolean | null;
        created_at?: string | null;
        updated_at?: string | null;
      }>;
    };
  };
}

export interface UpdateCompanyDataPointPayload {
  reasoning?: string | null;
  sources?: string | null;
  score?: string | number | null;
  scoreValue?: KpiScoreValue | null;
  scoreTier?: KpiScoreTier | null;
  status?: boolean;
}

export interface UpdateCompanyDataPointResponse {
  success: boolean;
  error?: string;
  data?: {
    id: number;
    reportId: number | null;
    companyId: number | null;
    dataPointId: string | null;
    type: string | null;
    value: string | null;
    manualValue: string | null;
    status: boolean | null;
    data: unknown;
    updatedAt: string | null;
  };
}

export interface DeepDiveListParams {
  limit?: number;
  offset?: number;
  q?: string;
  status?: DeepDiveStatus;
  useCaseId?: number;
  industryId?: number;
  reportType?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface DeepDiveSourcesParams {
  sourcesLimit?: number;
  sourcesOffset?: number;
  tier?: number;
  isVectorized?: boolean;
  dateFrom?: string;
  dateTo?: string;
  metaKey?: string;
  metaValue?: string;
  metaGroupBy?: string;
}

export interface ReportSettingsOption {
  id: number;
  name: string;
  masterFileId: string;
  prefix: number | null;
  settings: unknown;
}

export interface ValidatorSettingsOption {
  id: number;
  name: string;
  settings: unknown;
}

export interface DeepDiveSettingsResponse {
  success: boolean;
  data: {
    report: {
      id: number;
      name: string | null;
    };
    current: {
      reportSettings: ReportSettingsOption | null;
      validatorSettings: ValidatorSettingsOption | null;
    };
    options: {
      reportSettings: ReportSettingsOption[];
      validatorSettings: ValidatorSettingsOption[];
    };
  };
}

export type ReportSettingsActionPayload =
  | { mode: "reuse"; id: number }
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

export type ValidatorSettingsActionPayload =
  | { mode: "reuse"; id: number }
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

export interface UpdateDeepDiveSettingsPayload {
  reportSettingsAction?: ReportSettingsActionPayload;
  validatorSettingsAction?: ValidatorSettingsActionPayload;
}

export interface CloneOptions {
  orchestrator: boolean;
  kpiModel: boolean;
  companies: boolean;
}

export interface CreateReportPayload {
  name: string;
  description?: string;
  useCaseId?: number;
  reportType: string;
  reportSettings?: {
    name: string;
    masterFileId?: string;
    prefix?: number;
    settings: object;
  };
  sourceValidationSettings?: {
    name: string;
    settings: object;
  };
  cloneFromId?: number;
  cloneOptions?: CloneOptions;
}

const deepDiveApi = {
  async create(payload: CreateReportPayload): Promise<{ success: boolean; data: { id: number; name: string | null } }> {
    const response = await api.post("/deep-dive", payload);
    return response.data;
  },

  async list(params: DeepDiveListParams): Promise<DeepDiveListResponse> {
    const searchParams = new URLSearchParams();
    if (params.limit !== undefined) searchParams.set("limit", String(params.limit));
    if (params.offset !== undefined) searchParams.set("offset", String(params.offset));
    if (params.q) searchParams.set("q", params.q);
    if (params.status) searchParams.set("status", params.status);
    if (params.useCaseId !== undefined) searchParams.set("useCaseId", String(params.useCaseId));
    if (params.industryId !== undefined) searchParams.set("industryId", String(params.industryId));
    if (params.reportType) searchParams.set("reportType", params.reportType);
    if (params.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

    const response = await api.get(`/deep-dive?${searchParams.toString()}`);
    return response.data;
  },

  async getById(id: number): Promise<DeepDiveDetailResponse> {
    const response = await api.get(`/deep-dive/${id}`);
    return response.data;
  },

  async getOverview(id: number): Promise<DeepDiveOverviewResponse> {
    const response = await api.get(`/deep-dive/${id}/overview`);
    return response.data;
  },

  async getMetric<TValue extends number | string>(
    id: number,
    metric: DeepDiveMetricName
  ): Promise<DeepDiveMetricResponse<TValue>> {
    const response = await api.get(`/deep-dive/${id}/metric/${metric}`);
    return response.data as DeepDiveMetricResponse<TValue>;
  },

  async getKpiChart(id: number): Promise<DeepDiveKpiChartResponse> {
    const response = await api.get(`/deep-dive/${id}/kpi-chart`);
    return response.data;
  },

  async getCompanies(id: number): Promise<DeepDiveCompaniesResponse> {
    const response = await api.get(`/deep-dive/${id}/companies`);
    return response.data;
  },

  async getSettings(reportId: number): Promise<DeepDiveSettingsResponse> {
    const response = await api.get(`/deep-dive/${reportId}/settings`);
    return response.data;
  },

  async updateSettings(
    reportId: number,
    payload: UpdateDeepDiveSettingsPayload
  ): Promise<DeepDiveSettingsResponse> {
    const response = await api.patch(`/deep-dive/${reportId}/settings`, payload);
    return response.data;
  },

  async getCompany(
    reportId: number,
    companyId: number,
    params: DeepDiveSourcesParams
  ): Promise<DeepDiveCompanyResponse> {
    const searchParams = new URLSearchParams();
    if (params.sourcesLimit !== undefined) searchParams.set("sourcesLimit", String(params.sourcesLimit));
    if (params.sourcesOffset !== undefined) searchParams.set("sourcesOffset", String(params.sourcesOffset));
    if (params.tier !== undefined) searchParams.set("tier", String(params.tier));
    if (params.isVectorized !== undefined) searchParams.set("isVectorized", String(params.isVectorized));
    if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params.dateTo) searchParams.set("dateTo", params.dateTo);
    if (params.metaKey) searchParams.set("metaKey", params.metaKey);
    if (params.metaValue) searchParams.set("metaValue", params.metaValue);
    if (params.metaGroupBy) searchParams.set("metaGroupBy", params.metaGroupBy);

    const suffix = searchParams.toString();
    const response = await api.get(
      `/deep-dive/${reportId}/companies/${companyId}${suffix ? `?${suffix}` : ""}`
    );
    return response.data;
  },

  async updateCompanyDataPoint(
    reportId: number,
    companyId: number,
    resultId: number,
    payload: UpdateCompanyDataPointPayload,
  ): Promise<UpdateCompanyDataPointResponse> {
    const response = await api.patch(
      `/deep-dive/${reportId}/companies/${companyId}/data-points/${resultId}`,
      payload,
    );
    return response.data;
  },

  async getSalesMinerCompany(
    reportId: number,
    companyId: number,
  ): Promise<SalesMinerCompanyResponse> {
    const response = await api.get(
      `/deep-dive/${reportId}/companies/${companyId}/sales-miner`
    );
    return response.data;
  },

  async getSalesMinerReportOverview(
    reportId: number,
  ): Promise<SalesMinerReportOverviewResponse> {
    const response = await api.get(`/deep-dive/${reportId}/sales-miner-overview`);
    return response.data;
  },
};

export const useGetDeepDives = (params: DeepDiveListParams, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [
      "deep-dive",
      "list",
      params.limit ?? 50,
      params.offset ?? 0,
      params.q ?? "",
      params.status ?? "",
      params.useCaseId ?? "",
      params.industryId ?? "",
      params.reportType ?? "",
      params.sortBy ?? "",
      params.sortOrder ?? "",
    ],
    queryFn: () => deepDiveApi.list(params),
    enabled: options?.enabled ?? true,
  });
};

export interface ReportCloneData {
  name: string;
  description: string;
  reportType: string;
  useCaseId: number | null;
  useCaseName: string | null;
  reportSettings: {
    name: string;
    masterFileId: string;
    prefix: number | null;
    settings: unknown;
  } | null;
  sourceValidationSettings: {
    name: string;
    settings: unknown;
  } | null;
}

export const useGetReportCloneData = (reportId: number | null) => {
  return useQuery({
    queryKey: ["deep-dive", "clone", reportId],
    queryFn: async () => {
      const response = await api.get(`/deep-dive/${reportId}/clone`);
      return response.data as { success: boolean; data: ReportCloneData };
    },
    enabled: reportId !== null,
    staleTime: 0,
  });
};

export const useGetNextReportId = (enabled: boolean) => {
  return useQuery({
    queryKey: ["deep-dive", "next-id"],
    queryFn: async () => {
      const response = await api.get("/deep-dive/next-id");
      return response.data as { success: boolean; data: { nextId: number } };
    },
    enabled,
    staleTime: 0,
  });
};

export const useCreateReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReportPayload) => deepDiveApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deep-dive", "list"] });
    },
  });
};

export const useGetDeepDiveDetail = (id: number | null, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["deep-dive", "detail", id],
    queryFn: () => deepDiveApi.getById(id!),
    enabled: options?.enabled !== undefined ? options.enabled : id !== null,
  });
};

export const useGetDeepDiveOverview = (
  id: number | null,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["deep-dive", "overview", id],
    queryFn: () => deepDiveApi.getOverview(id!),
    enabled: options?.enabled !== undefined ? options.enabled : id !== null,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

export const useGetDeepDiveMetric = <TValue extends number | string>(
  reportId: number | null,
  metric: DeepDiveMetricName,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["deep-dive", "metric", reportId, metric],
    queryFn: () => deepDiveApi.getMetric<TValue>(reportId!, metric),
    enabled:
      options?.enabled !== undefined ? options.enabled : reportId !== null,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
};

export const useGetDeepDiveKpiChart = (
  id: number | null,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["deep-dive", "kpi-chart", id],
    queryFn: () => deepDiveApi.getKpiChart(id!),
    enabled: options?.enabled !== undefined ? options.enabled : id !== null,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
};

export const useGetDeepDiveCompanies = (
  id: number | null,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["deep-dive", "companies", id],
    queryFn: () => deepDiveApi.getCompanies(id!),
    enabled: options?.enabled !== undefined ? options.enabled : id !== null,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
};

export const useGetDeepDiveSettings = (
  reportId: number | null,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["deep-dive", "settings", reportId],
    queryFn: () => deepDiveApi.getSettings(reportId!),
    enabled:
      options?.enabled !== undefined ? options.enabled : reportId !== null,
  });
};

export const useUpdateDeepDiveSettings = (reportId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateDeepDiveSettingsPayload) =>
      deepDiveApi.updateSettings(reportId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["deep-dive", "settings", reportId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["deep-dive", "detail", reportId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["deep-dive", "overview", reportId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["deep-dive", "list"],
      });
    },
  });
};

export const useGetDeepDiveCompany = (
  reportId: number | null,
  companyId: number | null,
  params: DeepDiveSourcesParams,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [
      "deep-dive",
      "company",
      reportId,
      companyId,
      params.sourcesLimit ?? 50,
      params.sourcesOffset ?? 0,
      params.tier ?? "",
      params.isVectorized ?? "",
      params.dateFrom ?? "",
      params.dateTo ?? "",
      params.metaKey ?? "",
      params.metaValue ?? "",
      params.metaGroupBy ?? "",
    ],
    queryFn: () => deepDiveApi.getCompany(reportId!, companyId!, params),
    enabled:
      options?.enabled !== undefined
        ? options.enabled
        : reportId !== null && companyId !== null,
  });
};

export const useUpdateCompanyDataPoint = (
  reportId: number,
  companyId: number,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      resultId,
      payload,
    }: {
      resultId: number;
      payload: UpdateCompanyDataPointPayload;
    }) => deepDiveApi.updateCompanyDataPoint(reportId, companyId, resultId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["deep-dive", "company", reportId, companyId],
      });
    },
  });
};

/* ─────────────── Sources Analytics ─────────────── */

export interface SourcesAnalyticsParams {
  limit?: number;
  offset?: number;
  tier?: number;
  qualityClass?: string;
  isValid?: boolean;
  agent?: string;
  category?: string;
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface QueryIdAggItem {
  query_id: string;
  goal: string | null;
  count: number;
}

export interface SourcesAggregations {
  qualityClass: Array<{ value: string | null; count: number }>;
  queryIds: QueryIdAggItem[];
  agents: Array<{ value: string; count: number }>;
  categories: Array<{ value: string; count: number }>;
  tags: Array<{ value: string; count: number }>;
  isValid: Array<{ value: boolean; count: number }>;
  scores: {
    relevance: number;
    authority: number;
    freshness: number;
    originality: number;
    security: number;
    extractability: number;
  };
}

export interface CandidatesAggregations {
  agents: Array<{ value: string; count: number }>;
  queryIds: QueryIdAggItem[];
}

export interface SourceItem {
  id: number;
  url: string;
  title: string | null;
  tier: number | null;
  date: string | null;
  is_vectorized: boolean | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface SourcesAnalyticsResponse {
  success: boolean;
  data: {
    reportId: number;
    company: {
      id: number;
      name: string;
      countryCode?: string | null;
      url?: string | null;
    };
    totalUnfiltered: number;
    totalFiltered: number;
    vectorizedCount: number;
    aggregations: SourcesAggregations;
    items: SourceItem[];
  };
}

/* ─────────────── Scrape Candidates ─────────────── */

export interface ScrapeCandidatesParams {
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface ScrapeCandidateItem {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface ScrapeCandidatesResponse {
  success: boolean;
  data: {
    reportId: number;
    company: {
      id: number;
      name: string;
      countryCode?: string | null;
      url?: string | null;
    };
    total: number;
    totalFiltered: number;
    aggregations: CandidatesAggregations;
    items: ScrapeCandidateItem[];
  };
}

const sourcesApi = {
  async getAnalytics(
    reportId: number,
    companyId: number,
    params: SourcesAnalyticsParams,
  ): Promise<SourcesAnalyticsResponse> {
    const sp = new URLSearchParams();
    if (params.limit !== undefined) sp.set("limit", String(params.limit));
    if (params.offset !== undefined) sp.set("offset", String(params.offset));
    if (params.tier !== undefined) sp.set("tier", String(params.tier));
    if (params.qualityClass) sp.set("qualityClass", params.qualityClass);
    if (params.isValid !== undefined) sp.set("isValid", String(params.isValid));
    if (params.agent) sp.set("agent", params.agent);
    if (params.category) sp.set("category", params.category);
    if (params.tag) sp.set("tag", params.tag);
    if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
    if (params.dateTo) sp.set("dateTo", params.dateTo);
    if (params.search) sp.set("search", params.search);
    if (params.sortBy) sp.set("sortBy", params.sortBy);
    if (params.sortOrder) sp.set("sortOrder", params.sortOrder);

    const suffix = sp.toString();
    const response = await api.get(
      `/deep-dive/${reportId}/companies/${companyId}/sources${suffix ? `?${suffix}` : ""}`,
    );
    return response.data;
  },

  async getCandidates(
    reportId: number,
    companyId: number,
    params: ScrapeCandidatesParams,
  ): Promise<ScrapeCandidatesResponse> {
    const sp = new URLSearchParams();
    if (params.limit !== undefined) sp.set("limit", String(params.limit));
    if (params.offset !== undefined) sp.set("offset", String(params.offset));
    if (params.search) sp.set("search", params.search);
    if (params.sortBy) sp.set("sortBy", params.sortBy);
    if (params.sortOrder) sp.set("sortOrder", params.sortOrder);

    const suffix = sp.toString();
    const response = await api.get(
      `/deep-dive/${reportId}/companies/${companyId}/candidates${suffix ? `?${suffix}` : ""}`,
    );
    return response.data;
  },
};

export const useGetSourcesAnalytics = (
  reportId: number | null,
  companyId: number | null,
  params: SourcesAnalyticsParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: [
      "deep-dive",
      "sources-analytics",
      reportId,
      companyId,
      params.limit ?? 50,
      params.offset ?? 0,
      params.tier ?? "",
      params.qualityClass ?? "",
      params.isValid ?? "",
      params.agent ?? "",
      params.category ?? "",
      params.tag ?? "",
      params.dateFrom ?? "",
      params.dateTo ?? "",
      params.search ?? "",
      params.sortBy ?? "",
      params.sortOrder ?? "",
    ],
    queryFn: () => sourcesApi.getAnalytics(reportId!, companyId!, params),
    enabled:
      options?.enabled !== undefined
        ? options.enabled
        : reportId !== null && companyId !== null,
  });
};

export const useGetScrapeCandidates = (
  reportId: number | null,
  companyId: number | null,
  params: ScrapeCandidatesParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: [
      "deep-dive",
      "scrape-candidates",
      reportId,
      companyId,
      params.limit ?? 50,
      params.offset ?? 0,
      params.search ?? "",
      params.sortBy ?? "",
      params.sortOrder ?? "",
    ],
    queryFn: () => sourcesApi.getCandidates(reportId!, companyId!, params),
    enabled:
      options?.enabled !== undefined
        ? options.enabled
        : reportId !== null && companyId !== null,
  });
};

/* ─────────────── Report Queries ─────────────── */

export interface ReportQueryItem {
  id: number;
  goal: string;
  searchQueries: string[];
  sourcesCount: number;
  candidatesCount: number;
  completedCompanies: number;
  totalCompanies: number;
  completionPercent: number;
  dataPoints: Array<{ id: string; name: string; type: string }>;
}

export interface ReportQueriesResponse {
  success: boolean;
  data: {
    reportName: string | null;
    queries: ReportQueryItem[];
  };
}

export interface UpdateQueryPayload {
  goal: string;
  searchQueries: string[];
}

const queriesApi = {
  async getReportQueries(reportId: number): Promise<ReportQueriesResponse> {
    const response = await api.get(`/deep-dive/${reportId}/queries`);
    return response.data;
  },

  async updateQuery(
    reportId: number,
    queryId: number,
    payload: UpdateQueryPayload,
  ): Promise<{ success: boolean; error?: string }> {
    const response = await api.put(
      `/deep-dive/${reportId}/queries/${queryId}`,
      payload,
    );
    return response.data;
  },
};

export const useGetReportQueries = (
  reportId: number | null,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ["deep-dive", "queries", reportId],
    queryFn: () => queriesApi.getReportQueries(reportId!),
    enabled:
      options?.enabled !== undefined ? options.enabled : reportId !== null,
  });
};

export const useUpdateQuery = (reportId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      queryId,
      payload,
    }: {
      queryId: number;
      payload: UpdateQueryPayload;
    }) => queriesApi.updateQuery(reportId, queryId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["deep-dive", "queries", reportId],
      });
    },
  });
};

/* ─────────────── Export & Try Query ─────────────── */

export interface TryQueryResult {
  success: boolean;
  data: unknown;
}

const exportApi = {
  async exportReport(reportId: number): Promise<Blob> {
    const response = await api.post(`/deep-dive/${reportId}/export`, null, {
      responseType: "blob",
      timeout: 120_000,
    });
    return response.data as Blob;
  },

  async tryQuery(
    reportId: number,
    query: string,
    companyId: number,
    metadataFilters?: Record<string, unknown>,
  ): Promise<TryQueryResult> {
    const response = await api.post(`/deep-dive/${reportId}/try-query`, {
      query,
      company_id: companyId,
      metadata_filters: metadataFilters,
    });
    return response.data;
  },
};

export const useExportReport = (reportId: number) => {
  return useMutation({
    mutationFn: () => exportApi.exportReport(reportId),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `report-${reportId}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });
};

export const useTryQuery = (reportId: number) => {
  return useMutation({
    mutationFn: ({
      query,
      companyId,
      metadataFilters,
    }: {
      query: string;
      companyId: number;
      metadataFilters?: Record<string, unknown>;
    }) => exportApi.tryQuery(reportId, query, companyId, metadataFilters),
  });
};

/* ─────────────── Sales Miner Report Overview ─────────────── */

export interface SalesMinerOppSummaryRow {
  motionFamily: string | null;
  horizon: string | null;
  count: number;
  avgPriority: number | null;
  companiesCount: number;
}

export interface SalesMinerSignalSummaryRow {
  themeCode: string;
  signalCount: number;
  avgStrength: number | null;
  companiesCount: number;
}

export interface SalesMinerReportCompanyRow {
  id: number;
  name: string;
  oppCount: number;
  avgPriority: number | null;
  signalCount: number;
  stepsDone?: number;
  isAnalyzed?: boolean;
}

export type SalesMinerReportOverviewResponse =
  | {
      success: boolean;
      data: {
        level: "entity";
        reportId: number;
        signalSummary: SalesMinerSignalSummaryRow[];
        oppSummary: SalesMinerOppSummaryRow[];
        topCompanies: SalesMinerReportCompanyRow[];
      };
    }
  | {
      success: boolean;
      data: {
        level: "account";
        reportId: number;
        relatedReportId: number | null;
        oppSummary: SalesMinerOppSummaryRow[];
        companies: SalesMinerReportCompanyRow[];
      };
    };

export const useGetSalesMinerCompany = (
  reportId: number | null,
  companyId: number | null,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["deep-dive", "sales-miner", reportId, companyId],
    queryFn: () => deepDiveApi.getSalesMinerCompany(reportId!, companyId!),
    enabled:
      options?.enabled !== undefined
        ? options.enabled
        : reportId !== null && companyId !== null,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
};

export const useGetSalesMinerReportOverview = (
  reportId: number | null,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["deep-dive", "sales-miner-overview", reportId],
    queryFn: () => deepDiveApi.getSalesMinerReportOverview(reportId!),
    enabled: options?.enabled !== undefined ? options.enabled : reportId !== null,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
};

export interface CompanyUpdatePayload {
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

export const useUpdateCompany = (reportId: number, companyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CompanyUpdatePayload) => {
      const response = await api.patch(`/deep-dive/${reportId}/companies/${companyId}`, payload);
      return response.data as { success: boolean; error?: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deep-dive", "company", reportId, companyId] });
      queryClient.invalidateQueries({ queryKey: ["deep-dive", "companies", reportId] });
    },
  });
};

export interface CompanySearchResult {
  id: number;
  name: string;
  countryCode?: string | null;
  url?: string | null;
}

export type AddCompanyPayload =
  | { mode: "existing"; companyId: number }
  | {
      mode: "new";
      name: string;
      url?: string | null;
      countryCode?: string | null;
      industryId?: number | null;
      investPortal?: string | null;
      careerPortal?: string | null;
      slug?: string | null;
      reportRole?: string | null;
      additionalData?: unknown;
    };

export const useAddCompanyToReport = (reportId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddCompanyPayload) => {
      const response = await api.post(`/deep-dive/${reportId}/companies`, payload);
      return response.data as { success: boolean; data?: { companyId: number } };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deep-dive", "companies", reportId] });
      queryClient.invalidateQueries({ queryKey: ["deep-dive", "summary", reportId] });
    },
  });
};

export const useSearchCompanies = (query: string) => {
  return useQuery({
    queryKey: ["companies", "search", query],
    queryFn: async () => {
      const response = await api.get(`/companies/search?q=${encodeURIComponent(query)}`);
      return response.data as { success: boolean; data: CompanySearchResult[] };
    },
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

export default deepDiveApi;
