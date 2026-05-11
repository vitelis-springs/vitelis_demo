import type { SortOrder } from "../types/sorting";
import type { KpiScoreTier, KpiScoreValue } from "./kpi-score";

export interface DeepDivePaginationParams {
	limit?: number;
	offset?: number;
}

export interface DeepDiveSortParams {
	sortBy?: string;
	sortOrder?: SortOrder;
}

export interface DeepDiveDateRangeParams<TDate> {
	createdFrom?: TDate;
	createdTo?: TDate;
}

export interface DeepDiveListFilterParams extends DeepDiveSortParams {
	useCaseId?: number;
	industryId?: number;
	reportType?: string;
}

export interface SourcesAnalyticsFilterParams
	extends DeepDivePaginationParams,
		DeepDiveSortParams {
	tier?: number;
	qualityClass?: string;
	isValid?: boolean;
	agent?: string;
	category?: string;
	tag?: string;
	search?: string;
}

export interface ScrapeCandidatesBaseParams
	extends DeepDivePaginationParams,
		DeepDiveSortParams {
	search?: string;
}

export type DeepDiveMetricName =
	| "companies-count"
	| "orchestrator-status"
	| "total-sources"
	| "used-sources"
	| "total-scrape-candidates"
	| "total-queries";

export type ValidationStatus = "pass" | "warn" | "failed";

export interface UpdateCompanyDataPointPayload {
	reasoning?: string | null;
	sources?: string | Record<string, unknown> | unknown[] | null;
	score?: string | number | null;
	scoreValue?: KpiScoreValue | null;
	scoreTier?: KpiScoreTier | null;
	status?: boolean;
	rawData?: Record<string, unknown>;
}

export interface CreateCompanyDataPointPayload
	extends UpdateCompanyDataPointPayload {
	dataPointId: string;
}

export interface UpdateDeepDiveSettingsPayload {
	reportInfo: {
		name: string;
		description?: string | null;
		useCaseId?: number | null;
	};
	reportSettings: {
		name?: string;
		masterFileId?: string;
		prefix?: number | null;
		settings: Record<string, unknown>;
	};
	validatorSettings: {
		name?: string;
		settings: Record<string, unknown>;
	};
	countryIds?: string[];
}

export interface UpdateReportModelItemPayload {
	dataPointId: string;
	name?: string | null;
	settings?: Record<string, unknown>;
	manualMethod?: boolean | null;
}

export interface CreateReportModelItemBasePayload {
	dataPointId: string;
	type: string;
	name?: string | null;
	settings: Record<string, unknown>;
	manualMethod?: boolean;
}

export interface KpiDriverResultData {
	Index?: number | null;
	Score?: string | null;
	Sources?: string | null;
	Reasoning?: string | null;
	"KPI Category"?: string | null;
	"Definition (KPI)"?: string | null;
	"Metric (KPI Driver)"?: string | null;
	"KPI Score"?: string | number | null;
	"Key Question"?: string | null;
	"Country Code"?: string | null;
	"L3 Category"?: string | null;
}

export interface RawDataPointResultData {
	answer?: string | number | null;
	explanation?: string | null;
	sources?: string | null;
	raw_data_point_id?: string | number | null;
	raw_data_point?: string | null;
}

export interface KpiProductResultData {
	settings: Record<string, unknown>;
	kpi_results: Record<string, unknown>;
	raw_data_points?: unknown;
	id?: number | null;
	company_id?: number | null;
	company_name?: string | null;
	execId?: string | null;
	name?: string | null;
	report_id?: number | null;
}

export type DataPointResultData =
	| KpiDriverResultData
	| RawDataPointResultData
	| KpiProductResultData;
