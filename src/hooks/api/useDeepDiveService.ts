import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";
import type {
	AddCompanyPayload,
	CompanySearchResult,
	CompanyUpdatePayload,
	CreateCompanyDataPointPayload,
	CreateCompanyDataPointResponse,
	CreateReportModelItemPayload,
	CreateReportPayload,
	CreateValidationRulePayload,
	DeepDiveCompaniesResponse,
	DeepDiveCompanyResponse,
	DeepDiveDetailResponse,
	DeepDiveKpiChartResponse,
	DeepDiveListParams,
	DeepDiveListResponse,
	DeepDiveMetricName,
	DeepDiveMetricResponse,
	DeepDiveOverviewResponse,
	DeepDiveSettingsResponse,
	DeepDiveSourcesParams,
	ImportKpiModelPayload,
	OpportunityCardsResponse,
	ReplaceReportModelPayload,
	ReportCloneData,
	ReportCostStatsResponse,
	ReportModelResponse,
	ReportQueriesResponse,
	ReportValidationRulesResponse,
	SalesMinerCompanyResponse,
	SalesMinerReportOverviewResponse,
	ScrapeCandidatesParams,
	ScrapeCandidatesResponse,
	SignalStatsResponse,
	SourcesAnalyticsParams,
	SourcesAnalyticsResponse,
	StepCostTasksResponse,
	TryQueryResult,
	UpdateCompanyDataPointPayload,
	UpdateCompanyDataPointResponse,
	UpdateDeepDiveSettingsPayload,
	UpdateQueryPayload,
	UpdateReportModelItemPayload,
	UpdateValidationCheckPayload,
	ValidationByCompanyResponse,
	ValidationStatus,
	ValidationSummaryResponse,
} from "../../types/deep-dive.types";

export type * from "../../types/deep-dive.types";

export const deepDiveApi = {
	async create(
		payload: CreateReportPayload,
	): Promise<{ success: boolean; data: { id: number; name: string | null } }> {
		const response = await api.post("/deep-dive", payload);
		return response.data;
	},

	async list(params: DeepDiveListParams): Promise<DeepDiveListResponse> {
		const searchParams = new URLSearchParams();
		if (params.limit !== undefined)
			searchParams.set("limit", String(params.limit));
		if (params.offset !== undefined)
			searchParams.set("offset", String(params.offset));
		if (params.q) searchParams.set("q", params.q);
		if (params.status) searchParams.set("status", params.status);
		if (params.useCaseId !== undefined)
			searchParams.set("useCaseId", String(params.useCaseId));
		if (params.industryId !== undefined)
			searchParams.set("industryId", String(params.industryId));
		if (params.reportType) searchParams.set("reportType", params.reportType);
		if (params.sortBy) searchParams.set("sortBy", params.sortBy);
		if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
		if (params.createdFrom) searchParams.set("createdFrom", params.createdFrom);
		if (params.createdTo) searchParams.set("createdTo", params.createdTo);

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
		metric: DeepDiveMetricName,
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

	async getReportModel(reportId: number): Promise<ReportModelResponse> {
		const response = await api.get(`/deep-dive/${reportId}/model`);
		return response.data;
	},

	async updateSettings(
		reportId: number,
		payload: UpdateDeepDiveSettingsPayload,
	): Promise<DeepDiveSettingsResponse> {
		const response = await api.patch(
			`/deep-dive/${reportId}/settings`,
			payload,
		);
		return response.data;
	},

	async replaceReportModel(
		reportId: number,
		payload: ReplaceReportModelPayload,
	): Promise<ReportModelResponse> {
		const response = await api.put(`/deep-dive/${reportId}/model`, payload);
		return response.data;
	},

	async importKpiModel(
		reportId: number,
		payload: ImportKpiModelPayload,
	): Promise<ReportModelResponse> {
		const response = await api.post(
			`/deep-dive/${reportId}/model/import`,
			payload,
		);
		return response.data;
	},

	async createReportModelItem(
		reportId: number,
		payload: CreateReportModelItemPayload,
	): Promise<ReportModelResponse> {
		const response = await api.post(`/deep-dive/${reportId}/model`, payload);
		return response.data;
	},

	async updateReportModelItem(
		reportId: number,
		payload: UpdateReportModelItemPayload,
	): Promise<ReportModelResponse> {
		const response = await api.patch(`/deep-dive/${reportId}/model`, payload);
		return response.data;
	},

	async deleteReportModelItem(
		reportId: number,
		dataPointId: string,
	): Promise<ReportModelResponse> {
		const response = await api.delete(`/deep-dive/${reportId}/model`, {
			data: { dataPointId },
		});
		return response.data;
	},

	async getCompany(
		reportId: number,
		companyId: number,
		params: DeepDiveSourcesParams,
	): Promise<DeepDiveCompanyResponse> {
		const searchParams = new URLSearchParams();
		if (params.sourcesLimit !== undefined)
			searchParams.set("sourcesLimit", String(params.sourcesLimit));
		if (params.sourcesOffset !== undefined)
			searchParams.set("sourcesOffset", String(params.sourcesOffset));
		if (params.tier !== undefined)
			searchParams.set("tier", String(params.tier));
		if (params.isVectorized !== undefined)
			searchParams.set("isVectorized", String(params.isVectorized));
		if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
		if (params.dateTo) searchParams.set("dateTo", params.dateTo);
		if (params.metaKey) searchParams.set("metaKey", params.metaKey);
		if (params.metaValue) searchParams.set("metaValue", params.metaValue);
		if (params.metaGroupBy) searchParams.set("metaGroupBy", params.metaGroupBy);

		const suffix = searchParams.toString();
		const response = await api.get(
			`/deep-dive/${reportId}/companies/${companyId}${suffix ? `?${suffix}` : ""}`,
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

	async createCompanyDataPoint(
		reportId: number,
		companyId: number,
		payload: CreateCompanyDataPointPayload,
	): Promise<CreateCompanyDataPointResponse> {
		const response = await api.post(
			`/deep-dive/${reportId}/companies/${companyId}/data-points`,
			payload,
		);
		return response.data;
	},

	async getSalesMinerCompany(
		reportId: number,
		companyId: number,
	): Promise<SalesMinerCompanyResponse> {
		const response = await api.get(
			`/deep-dive/${reportId}/companies/${companyId}/sales-miner`,
		);
		return response.data;
	},

	async getSalesMinerReportOverview(
		reportId: number,
	): Promise<SalesMinerReportOverviewResponse> {
		const response = await api.get(
			`/deep-dive/${reportId}/sales-miner-overview`,
		);
		return response.data;
	},

	async getCompanyOpportunityCards(
		reportId: number,
		companyId: number,
	): Promise<OpportunityCardsResponse> {
		const response = await api.get(
			`/deep-dive/${reportId}/companies/${companyId}/opportunity-cards`,
		);
		return response.data;
	},
};

export const useGetDeepDives = (
	params: DeepDiveListParams,
	options?: { enabled?: boolean },
) => {
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
			params.createdFrom ?? "",
			params.createdTo ?? "",
		],
		queryFn: () => deepDiveApi.list(params),
		enabled: options?.enabled ?? true,
	});
};

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

export const useGetDeepDiveDetail = (
	id: number | null,
	options?: { enabled?: boolean },
) => {
	return useQuery({
		queryKey: ["deep-dive", "detail", id],
		queryFn: () => deepDiveApi.getById(id!),
		enabled: options?.enabled !== undefined ? options.enabled : id !== null,
	});
};

export const useGetDeepDiveOverview = (
	id: number | null,
	options?: { enabled?: boolean },
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
	options?: { enabled?: boolean },
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
	options?: { enabled?: boolean },
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
	options?: { enabled?: boolean },
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
	options?: { enabled?: boolean },
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
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "settings", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "detail", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "overview", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "list"],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useGetReportModel = (
	reportId: number | null,
	options?: { enabled?: boolean },
) => {
	return useQuery({
		queryKey: ["deep-dive", "model", reportId],
		queryFn: () => deepDiveApi.getReportModel(reportId!),
		enabled:
			options?.enabled !== undefined ? options.enabled : reportId !== null,
	});
};

export const useReplaceReportModel = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: ReplaceReportModelPayload) =>
			deepDiveApi.replaceReportModel(reportId, payload),
		onSuccess: (data) => {
			queryClient.setQueryData(["deep-dive", "model", reportId], data);
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "model", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useImportKpiModel = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: ImportKpiModelPayload) =>
			deepDiveApi.importKpiModel(reportId, payload),
		onSuccess: (data) => {
			queryClient.setQueryData(["deep-dive", "model", reportId], data);
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "model", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useCreateReportModelItem = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CreateReportModelItemPayload) =>
			deepDiveApi.createReportModelItem(reportId, payload),
		onSuccess: (data) => {
			queryClient.setQueryData(["deep-dive", "model", reportId], data);
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "model", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useUpdateReportModelItem = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: UpdateReportModelItemPayload) =>
			deepDiveApi.updateReportModelItem(reportId, payload),
		onSuccess: (data) => {
			queryClient.setQueryData(["deep-dive", "model", reportId], data);
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "model", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useDeleteReportModelItem = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (dataPointId: string) =>
			deepDiveApi.deleteReportModelItem(reportId, dataPointId),
		onSuccess: (data) => {
			queryClient.setQueryData(["deep-dive", "model", reportId], data);
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "model", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useGetDeepDiveCompany = (
	reportId: number | null,
	companyId: number | null,
	params: DeepDiveSourcesParams,
	options?: { enabled?: boolean },
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
		}) =>
			deepDiveApi.updateCompanyDataPoint(
				reportId,
				companyId,
				resultId,
				payload,
			),
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "company", reportId, companyId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useCreateCompanyDataPoint = (
	reportId: number,
	companyId: number,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CreateCompanyDataPointPayload) =>
			deepDiveApi.createCompanyDataPoint(reportId, companyId, payload),
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "company", reportId, companyId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

/* ─────────────── Sources Analytics ─────────────── */

/* ─────────────── Scrape Candidates ─────────────── */

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
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "queries", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

/* ─────────────── Export & Try Query ─────────────── */

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

function sanitizeFileNameSegment(
	value: string | null | undefined,
	fallback: string,
): string {
	const normalized = (value ?? "")
		.trim()
		.replace(/\s+/g, "_")
		.replace(/[^a-zA-Z0-9_-]+/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "");

	return normalized || fallback;
}

function formatExportDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function formatSalesMinerExportDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${day}-${month}-${year}`;
}

export const useExportReport = (
	reportId: number,
	reportName?: string | null,
) => {
	return useMutation({
		mutationFn: () => exportApi.exportReport(reportId),
		onSuccess: (blob) => {
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			const safeReportName = sanitizeFileNameSegment(reportName, "report");
			const exportDate = formatExportDate(new Date());
			anchor.download = `${safeReportName}_${reportId}_${exportDate}.xlsx`;
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

export const useGetSalesMinerCompany = (
	reportId: number | null,
	companyId: number | null,
	options?: { enabled?: boolean },
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
	options?: { enabled?: boolean },
) => {
	return useQuery({
		queryKey: ["deep-dive", "sales-miner-overview", reportId],
		queryFn: () => deepDiveApi.getSalesMinerReportOverview(reportId!),
		enabled:
			options?.enabled !== undefined ? options.enabled : reportId !== null,
		staleTime: 60_000,
		refetchOnWindowFocus: false,
	});
};

export const useGetCompanyOpportunityCards = (
	reportId: number | null,
	companyId: number | null,
	options?: { enabled?: boolean },
) => {
	return useQuery({
		queryKey: ["deep-dive", "opportunity-cards", reportId, companyId],
		queryFn: () =>
			deepDiveApi.getCompanyOpportunityCards(reportId!, companyId!),
		enabled:
			options?.enabled !== undefined
				? options.enabled
				: reportId !== null && companyId !== null,
		staleTime: 60_000,
		refetchOnWindowFocus: false,
	});
};

export const useUpdateCompany = (reportId: number, companyId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CompanyUpdatePayload) => {
			const response = await api.patch(
				`/deep-dive/${reportId}/companies/${companyId}`,
				payload,
			);
			return response.data as { success: boolean; error?: string };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["deep-dive", "company", reportId, companyId],
			});
			queryClient.invalidateQueries({
				queryKey: ["deep-dive", "companies", reportId],
			});
			queryClient.invalidateQueries({
				queryKey: ["deep-dive", "sales-miner-overview", reportId],
			});
		},
	});
};

export const useAddCompanyToReport = (reportId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: AddCompanyPayload) => {
			const response = await api.post(
				`/deep-dive/${reportId}/companies`,
				payload,
			);
			return response.data as {
				success: boolean;
				data?: { companyId: number };
			};
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["deep-dive", "companies", reportId],
			});
			queryClient.invalidateQueries({
				queryKey: ["deep-dive", "summary", reportId],
			});
			queryClient.invalidateQueries({
				queryKey: ["deep-dive", "sales-miner-overview", reportId],
			});
		},
	});
};

export const useSearchCompanies = (query: string) => {
	return useQuery({
		queryKey: ["companies", "search", query],
		queryFn: async () => {
			const response = await api.get(
				`/companies/search?q=${encodeURIComponent(query)}`,
			);
			return response.data as { success: boolean; data: CompanySearchResult[] };
		},
		enabled: query.trim().length >= 2,
		staleTime: 30_000,
		refetchOnWindowFocus: false,
	});
};

export const useGetReportCostStats = (reportId: number, enabled = true) => {
	return useQuery({
		queryKey: ["deep-dive", "cost-stats", reportId],
		queryFn: async () => {
			const response = await api.get(`/deep-dive/${reportId}/cost-stats`);
			return response.data as ReportCostStatsResponse;
		},
		enabled: enabled && Number.isFinite(reportId),
		staleTime: 60_000,
		refetchOnWindowFocus: false,
	});
};

export const useGetStepCostTasks = (
	reportId: number,
	stepId: number | null,
) => {
	return useQuery({
		queryKey: ["deep-dive", "cost-stats", reportId, "step", stepId],
		queryFn: async () => {
			const response = await api.get(
				`/deep-dive/${reportId}/cost-stats/${stepId}`,
			);
			return response.data as StepCostTasksResponse;
		},
		enabled: Number.isFinite(reportId) && stepId !== null,
		staleTime: 60_000,
		refetchOnWindowFocus: false,
	});
};

export const useGetSalesMinerSignalStats = (
	reportId: number,
	enabled = true,
) => {
	return useQuery({
		queryKey: ["deep-dive", "signal-stats", reportId],
		queryFn: async () => {
			const response = await api.get(`/deep-dive/${reportId}/signal-stats`);
			return response.data as SignalStatsResponse;
		},
		enabled: enabled && Number.isFinite(reportId),
		staleTime: 5 * 60_000,
		refetchOnWindowFocus: false,
	});
};

export const useExportOpportunitiesXlsx = () => {
	return useMutation({
		mutationFn: async ({
			reportId,
			reportName,
		}: {
			reportId: number;
			reportName?: string | null;
		}) => {
			const response = await api.get(
				`/deep-dive/${reportId}/export-opportunities-xlsx`,
				{ responseType: "blob" },
			);
			const url = URL.createObjectURL(response.data as Blob);
			const a = document.createElement("a");
			a.href = url;
			const safeReportName = sanitizeFileNameSegment(reportName, "report");
			const exportDate = formatSalesMinerExportDate(new Date());
			a.download = `salesminer_${reportId}_${safeReportName}_${exportDate}.xlsx`;
			a.click();
			URL.revokeObjectURL(url);
		},
	});
};

export const useGetValidationSummary = (reportId: number, enabled = true) => {
	return useQuery({
		queryKey: ["deep-dive", "validation", reportId],
		queryFn: async () => {
			const response = await api.get(`/deep-dive/${reportId}/validation`);
			return response.data as ValidationSummaryResponse;
		},
		enabled: enabled && Number.isFinite(reportId),
		staleTime: 5 * 60_000,
		refetchOnWindowFocus: false,
	});
};

export const useGetValidationByCompany = (
	reportId: number,
	companyId: number,
	status?: ValidationStatus,
	enabled = true,
) => {
	return useQuery({
		queryKey: [
			"deep-dive",
			"validation-company",
			reportId,
			companyId,
			status ?? "all",
		],
		queryFn: async () => {
			const sp = status ? `?status=${status}` : "";
			const response = await api.get(
				`/deep-dive/${reportId}/validation/${companyId}${sp}`,
			);
			return response.data as ValidationByCompanyResponse;
		},
		enabled: enabled && Number.isFinite(reportId) && Number.isFinite(companyId),
		staleTime: 5 * 60_000,
		refetchOnWindowFocus: false,
	});
};

export const useUpdateValidationCheckManually = (
	reportId: number,
	companyId: number,
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: UpdateValidationCheckPayload) => {
			const response = await api.patch(
				`/deep-dive/${reportId}/validation/${companyId}`,
				payload,
			);
			return response.data as { success: boolean; error?: string };
		},
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "validation-company", reportId, companyId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "validation", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useGetReportValidationRules = (
	reportId: number,
	enabled = true,
) => {
	return useQuery({
		queryKey: ["deep-dive", "validation-rules", reportId],
		queryFn: async () => {
			const response = await api.get(`/deep-dive/${reportId}/validation-rules`);
			return (response.data as ReportValidationRulesResponse).data;
		},
		enabled: enabled && Number.isFinite(reportId),
		staleTime: 60_000,
		refetchOnWindowFocus: false,
	});
};

export const useAddReportValidationRule = (reportId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (ruleId: number) => {
			await api.post(`/deep-dive/${reportId}/validation-rules`, { ruleId });
		},
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "validation-rules", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useRemoveReportValidationRule = (reportId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (ruleId: number) => {
			await api.delete(`/deep-dive/${reportId}/validation-rules/${ruleId}`);
		},
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "validation-rules", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useUpdateValidationRule = (reportId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			ruleId,
			payload,
		}: {
			ruleId: number;
			payload: CreateValidationRulePayload;
		}) => {
			await api.patch(`/deep-dive/validation-rules/${ruleId}`, payload);
		},
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "validation-rules", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useCreateValidationRule = (reportId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: CreateValidationRulePayload) => {
			const response = await api.post("/deep-dive/validation-rules", payload);
			return response.data as { success: boolean; data: { id: number } };
		},
		onSuccess: () => {
			queryClient
				.invalidateQueries({
					queryKey: ["deep-dive", "validation-rules", reportId],
				})
				.catch((error) => {
					console.error("Failed to invalidate query", error);
				});
		},
	});
};

export const useGenerateXlsxReport = () => {
	return useMutation({
		mutationFn: async (payload: {
			company_ids: number[];
			report_ids: number[];
		}) => {
			const response = await api.post("/n8n/bizminer/generate-xlsx", payload, {
				responseType: "blob",
			});

			const blob = response.data as Blob;
			const contentDisposition = response.headers["content-disposition"] as
				| string
				| undefined;
			const filename =
				contentDisposition?.match(/filename="?([^"]+)"?/)?.[1] ??
				`report_${Date.now()}.xlsx`;

			const url = window.URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = filename;
			anchor.click();
			window.URL.revokeObjectURL(url);
		},
	});
};

export default deepDiveApi;
