import type { Prisma, report_status_enum } from "../../../../generated/prisma";
import type {
	CreateReportModelItemBasePayload,
	DeepDiveDateRangeParams,
	DeepDiveListFilterParams,
	DeepDiveMetricName,
	DeepDivePaginationParams,
	DeepDiveSortParams,
	ScrapeCandidatesBaseParams,
	SourcesAnalyticsFilterParams,
} from "../../../../shared/deep-dive-contract.types";

export type {
	UpdateCompanyDataPointPayload,
	UpdateDeepDiveSettingsPayload,
	UpdateReportModelItemPayload,
} from "../../../../shared/deep-dive-contract.types";

export interface DeepDiveListParams
	extends Required<DeepDivePaginationParams>,
		Omit<DeepDiveListFilterParams, "sortBy" | "sortOrder">,
		DeepDiveSortParams,
		DeepDiveDateRangeParams<Date> {
	query?: string;
	status?: report_status_enum;
}

export interface SourceFilterParams extends Required<DeepDivePaginationParams> {
	tier?: number;
	isVectorized?: boolean;
	dateFrom?: Date;
	dateTo?: Date;
	metaKey?: string;
	metaValue?: string;
	metaGroupBy?: string;
}

export interface SourcesAnalyticsParams
	extends Required<Pick<SourcesAnalyticsFilterParams, "limit" | "offset">>,
		Omit<SourcesAnalyticsFilterParams, "limit" | "offset"> {
	dateFrom?: Date;
	dateTo?: Date;
}

export interface ScrapeCandidatesParams
	extends Required<Pick<ScrapeCandidatesBaseParams, "limit" | "offset">>,
		Omit<ScrapeCandidatesBaseParams, "limit" | "offset"> {}

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
	reportDescription: string | null;
	reportUseCaseId: number | null;
	reportUseCaseName: string | null;
	reportSettingsId: number | null;
	sourceValidationSettingsId: number | null;
	reportSettings: ReportSettingsProfile | null;
	validatorSettings: ValidatorSettingsProfile | null;
}

export type ReportWithRelations = Prisma.reportsGetPayload<{
	include: {
		report_settings: true;
		report_orhestrator: true;
		use_cases: true;
	};
}>;

export interface CompanyDataPointResultUpdateData {
	value?: string | null;
	manualValue?: string | null;
	data?: Prisma.InputJsonValue;
	status?: boolean;
}

export interface ReportModelUpdateRow {
	dataPointId: string;
	includeToReport: boolean;
}

export interface ReportDataPointSourcesRow {
	company_id: number | null;
	data: unknown;
}

export interface ReportModelItemUpdateData {
	name?: string | null;
	settings?: Prisma.InputJsonValue;
	manual_method?: boolean | null;
}

export interface CreateReportModelItemData {
	dataPointId: string;
	type: string;
	name: string | null;
	settings: Prisma.InputJsonValue;
	manualMethod?: boolean;
}

export type DeepDiveMetricKey = DeepDiveMetricName;

export interface ReportModelImportRow {
	dataPointId: string;
	includeToReport?: boolean;
}

export interface CreateReportModelItemPayload
	extends CreateReportModelItemBasePayload {}

export interface ImportedModelDataPoint {
	id: string;
	type: string;
	name: string | null;
	settings: Record<string, unknown>;
}
