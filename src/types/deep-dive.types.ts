import type {
	CreateReportModelItemBasePayload,
	DataPointResultData,
	DeepDiveDateRangeParams,
	DeepDiveListFilterParams,
	DeepDiveMetricName,
	DeepDivePaginationParams,
	DeepDiveSortParams,
	ScrapeCandidatesBaseParams,
	SourcesAnalyticsFilterParams,
	ValidationDataPointLevel,
	ValidationRuleLevel,
	ValidationStatus,
} from "../shared/deep-dive-contract.types";

export type {
	CreateCompanyDataPointPayload,
	DataPointResultData,
	DeepDiveMetricName,
	KpiDriverResultData,
	KpiProductResultData,
	RawDataPointResultData,
	UpdateCompanyDataPointPayload,
	UpdateDeepDiveSettingsPayload,
	UpdateReportModelItemPayload,
	ValidationDataPointLevel,
	ValidationRuleLevel,
	ValidationStatus,
} from "../shared/deep-dive-contract.types";
export {
	VALIDATION_DATA_POINT_LEVELS,
	VALIDATION_RULE_LEVELS,
} from "../shared/deep-dive-contract.types";

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
	cost: {
		totalCost: number;
		callsWithoutPricing: number;
	} | null;
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

export interface DeepDiveStaticValidation {
	categoryMathOk: boolean;
	categoryMathMismatchCount: number;
	categoryMathDetails: Array<{
		category: string;
		currentValue: number | null;
		expectedCalculatedValue: number | null;
		delta: number | null;
	}>;
	missingReportDataPointsCount: number;
	missingReportDataPointIds: string[];
	hasMissingReportDataPoints: boolean;
}

export interface DeepDiveCompanyRow {
	id: number;
	name: string;
	listed?: boolean | null;
	countryCode?: string | null;
	url?: string | null;
	status: DeepDiveStatus;
	sourcesCount: number;
	validSourcesCount: number;
	usedSourcesCount: number;
	candidatesCount: number;
	companyLevelReportFilesCount: number;
	stepsDone: number;
	stepsTotal: number;
	staticValidation: DeepDiveStaticValidation;
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
			listed?: boolean | null;
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
			data?: DataPointResultData | null;
			status?: boolean | null;
			updatedAt?: string | null;
		}>;
		staticValidationDebug?: {
			categoryMath: Array<{
				category: string;
				currentValue: number | null;
				expectedCalculatedValue: number | null;
				delta: number | null;
			}>;
		} | null;
		manualDataPoints: Array<{
			dataPointId: string;
			name?: string | null;
			type?: string | null;
			settings?: Record<string, unknown> | null;
			manualMethod?: boolean | null;
			resultId?: number | null;
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
		data: DataPointResultData | null;
		updatedAt: string | null;
	};
}

export type CreateCompanyDataPointResponse = UpdateCompanyDataPointResponse;

export interface DeepDiveListParams
	extends DeepDivePaginationParams,
		DeepDiveListFilterParams,
		DeepDiveDateRangeParams<string> {
	q?: string;
	status?: DeepDiveStatus;
}

export interface DeepDiveSourcesParams extends DeepDiveSortParams {
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
			description: string | null;
			useCaseId: number | null;
			useCaseName: string | null;
		};
		current: {
			reportSettings: ReportSettingsOption | null;
			validatorSettings: ValidatorSettingsOption | null;
		};
		options: {
			useCases: Array<{ id: number; name: string }>;
		};
		countries: {
			all: Array<{ id: string; name: string }>;
			selected: string[];
		};
	};
}

export interface ReportModelItem {
	id: number;
	dataPointId: string;
	includeToReport: boolean;
	name: string | null;
	type: string | null;
	manualMethod: boolean | null;
	settings: Record<string, unknown> | null;
}

export interface ReportModelResponse {
	success: boolean;
	data: {
		report: {
			id: number;
			name: string | null;
			reportType: string | null;
			prefix: number;
			useCase: {
				id: number;
				name: string;
			} | null;
		};
		items: ReportModelItem[];
		summary: {
			total: number;
			included: number;
			excluded: number;
			byType: Array<{
				type: string;
				count: number;
			}>;
		};
	};
}

export interface ReplaceReportModelPayload {
	rows: Array<{
		dataPointId: string;
		includeToReport?: boolean;
	}>;
}

export interface CreateReportModelItemPayload
	extends Omit<CreateReportModelItemBasePayload, "type"> {
	type: "kpi_driver" | "raw_data_point";
}

export interface ImportKpiModelPayload {
	dataPoints: Array<{
		id: string;
		type: string;
		name: string | null;
		settings: Record<string, unknown>;
	}>;
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

export interface SourcesAnalyticsParams extends SourcesAnalyticsFilterParams {
	dateFrom?: string;
	dateTo?: string;
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

export interface ScrapeCandidatesParams extends ScrapeCandidatesBaseParams {}

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

export interface TryQueryResult {
	success: boolean;
	data: unknown;
}

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
	listed?: boolean | null;
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
				customerId: number | null;
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
				customerId: number | null;
				relatedReportId: number | null;
				oppSummary: SalesMinerOppSummaryRow[];
				companies: SalesMinerReportCompanyRow[];
			};
	  };

export interface CompanyUpdatePayload {
	name?: string;
	listed?: boolean | null;
	url?: string | null;
	countryCode?: string | null;
	industryId?: number | null;
	investPortal?: string | null;
	careerPortal?: string | null;
	slug?: string | null;
	reportRole?: string | null;
	additionalData?: unknown;
}

export interface CompanySearchResult {
	id: number;
	name: string;
	listed?: boolean | null;
	countryCode?: string | null;
	url?: string | null;
	verified?: boolean;
}

export interface UpdateCompanyGenericPayload {
	name?: string;
	listed?: boolean | null;
	url?: string | null;
	logoUrl?: string | null;
	countryCode?: string | null;
	industryId?: number | null;
	gicsCode?: string | null;
	investPortal?: string | null;
	careerPortal?: string | null;
	slug?: string | null;
	reportRole?: string | null;
	additionalData?: unknown;
	parentCompanyId?: number | null;
	verified?: boolean;
}

export type AddCompanyPayload =
	| { mode: "existing"; companyId: number }
	| {
			mode: "new";
			name: string;
			listed: boolean;
			url?: string | null;
			countryCode?: string | null;
			industryId?: number | null;
			investPortal?: string | null;
			careerPortal?: string | null;
			slug?: string | null;
			reportRole?: string | null;
			additionalData?: unknown;
			parentCompanyId?: number | null;
	  };

export interface CreateCompanyPayload {
	name: string;
	listed: boolean;
	url?: string | null;
	logoUrl?: string | null;
	countryCode?: string | null;
	industryId?: number | null;
	gicsCode?: string | null;
	investPortal?: string | null;
	careerPortal?: string | null;
	slug?: string | null;
	reportRole?: string | null;
	additionalData?: unknown;
	parentCompanyId?: number | null;
	reportId?: number | null;
	verified?: boolean;
}

export interface CompanyDetail {
	id: number;
	name: string;
	listed: boolean | null;
	url: string | null;
	logoUrl: string | null;
	countryCode: string | null;
	industryId: number | null;
	gicsCode: string | null;
	investPortal: string | null;
	careerPortal: string | null;
	slug: string | null;
	reportRole: string | null;
	additionalData: unknown;
	parentCompanyId: number | null;
	verified: boolean;
}

export interface ReportCostTask {
	id: string;
	taskName: string;
	model: string | null;
	inputTokens: number;
	outputTokens: number;
	cachedInputTokens: number;
	inputCost: number;
	outputCost: number;
	mcpCost: number;
	totalCost: number;
	startedAt: string | null;
	finishedAt: string | null;
}

export interface ReportCostStep {
	stepId: number;
	stepName: string;
	taskCount: number;
	inputTokens: number;
	outputTokens: number;
	cachedInputTokens: number;
	inputCost: number;
	outputCost: number;
	mcpCost: number;
	totalCost: number;
	callsWithoutPricing: number;
	firstCallAt: string | null;
	lastCallAt: string | null;
}

export interface ReportCostSummary {
	taskCount: number;
	inputTokens: number;
	outputTokens: number;
	cachedInputTokens: number;
	inputCost: number;
	outputCost: number;
	mcpCost: number;
	totalCost: number;
	callsWithoutPricing: number;
	firstCallAt: string | null;
	lastCallAt: string | null;
}

export interface ReportCostStatsResponse {
	success: boolean;
	data: {
		summary: ReportCostSummary | null;
		steps: ReportCostStep[];
	};
}

export interface StepCostTasksResponse {
	success: boolean;
	data: ReportCostTask[];
}

export interface SignalStatRow {
	signalDefinitionId: number;
	signalTypeName: string;
	signalDefinitionName: string;
	researchedContextCount: number;
	decisionContextCount: number;
	researchedButNotSelectedContextCount: number;
	usedSeedCount: number;
	finalOpportunityCount: number;
	top10OpportunityCount: number;
	deepDiveOpportunityCount: number;
	usedEffectiveSignalScore: number;
	top10EffectiveSignalScore: number;
	avgEffectiveSignalScore: number;
	totalConfirmationCount: number | null;
	avgEvidenceStrengthScore: number;
	avgEvidenceConfidenceScore: number;
	avgEvidenceFreshnessScore: number;
	latestEffectiveDate: string | null;
	selectedOpportunitySpaces: string[];
	signalEffectivenessClass: string;
}

export interface SignalStatsResponse {
	success: boolean;
	data: SignalStatRow[];
}

export interface ValidationCompanyRow {
	companyId: number;
	companyName: string;
	total: number;
	pass: number;
	warn: number;
	failed: number;
}

export interface ValidationRuleRow {
	ruleName: string;
	ruleLabel: string;
	ruleLevel: string;
	total: number;
	pass: number;
	warn: number;
	failed: number;
}

export interface ValidationSummaryResponse {
	byCompany: ValidationCompanyRow[];
	byRule: ValidationRuleRow[];
}

export interface ValidationDriverItem {
	validationId: number;
	status: ValidationStatus;
	validationReasoning: string | null;
	resultId: number;
	dataPointId: string | null;
	resultStatus: boolean | null;
	driverName: string;
	driverType: string;
	ruleId: number;
	ruleName: string;
	ruleLabel: string | null;
	ruleLevel: string;
	dataReasoning: string;
	dataSources: string;
	dataSourcesRaw?: unknown;
	dataScore: string;
}

export interface ValidationByCompanyResponse {
	companyId: number;
	companyName: string | null;
	items: ValidationDriverItem[];
	totals: {
		total: number;
		pass: number;
		warn: number;
		failed: number;
	};
}

export interface UpdateValidationCheckPayload {
	validationId: number;
	status: ValidationStatus;
	comment?: string | null;
}

export interface ValidationRuleCriteria {
	pass: string;
	warn: string;
	fail: string;
}

export interface ConfiguredValidationRule {
	id: number;
	ruleId: number;
	order: number | null;
	enabled: boolean;
	name: string;
	label: string | null;
	level: ValidationRuleLevel;
	dataPointLevel: ValidationDataPointLevel | null;
	description: string | null;
	criteria: ValidationRuleCriteria;
}

export interface AvailableValidationRule {
	id: number;
	name: string;
	label: string | null;
	level: ValidationRuleLevel;
	dataPointLevel: ValidationDataPointLevel | null;
	description: string | null;
	criteria: ValidationRuleCriteria;
}

export interface ReportValidationRulesResponse {
	success: boolean;
	data: {
		configured: ConfiguredValidationRule[];
		available: AvailableValidationRule[];
	};
}

export interface CreateValidationRulePayload {
	name: string;
	label: string;
	level: ValidationRuleLevel;
	data_point_level: ValidationDataPointLevel | null;
	enabled: boolean;
	description: string;
	criteria: ValidationRuleCriteria;
}
