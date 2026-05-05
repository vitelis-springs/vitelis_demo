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
