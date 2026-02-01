import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api-client";

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

export interface KpiAverages {
  reportAverage: Record<string, number>;
  top5Average: Record<string, number>;
  top5Companies: Array<{ id: number; name: string; total: number }>;
}

export interface DeepDiveCompanyResponse {
  success: boolean;
  data: {
    reportId: number;
    company: {
      id: number;
      name: string;
      countryCode?: string | null;
      url?: string | null;
      industryId?: number | null;
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

export interface DeepDiveListParams {
  limit?: number;
  offset?: number;
  q?: string;
  status?: DeepDiveStatus;
  useCaseId?: number;
  industryId?: number;
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

const deepDiveApi = {
  async list(params: DeepDiveListParams): Promise<DeepDiveListResponse> {
    const searchParams = new URLSearchParams();
    if (params.limit !== undefined) searchParams.set("limit", String(params.limit));
    if (params.offset !== undefined) searchParams.set("offset", String(params.offset));
    if (params.q) searchParams.set("q", params.q);
    if (params.status) searchParams.set("status", params.status);
    if (params.useCaseId !== undefined) searchParams.set("useCaseId", String(params.useCaseId));
    if (params.industryId !== undefined) searchParams.set("industryId", String(params.industryId));

    const response = await api.get(`/deep-dive?${searchParams.toString()}`);
    return response.data;
  },

  async getById(id: number): Promise<DeepDiveDetailResponse> {
    const response = await api.get(`/deep-dive/${id}`);
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
    ],
    queryFn: () => deepDiveApi.list(params),
    enabled: options?.enabled ?? true,
  });
};

export const useGetDeepDiveDetail = (id: number | null, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["deep-dive", "detail", id],
    queryFn: () => deepDiveApi.getById(id!),
    enabled: options?.enabled !== undefined ? options.enabled : id !== null,
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

export default deepDiveApi;
