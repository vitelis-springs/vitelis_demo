import type { validation_status } from "../../../../../generated/prisma";
import type {
	ValidationDataPointLevel,
	ValidationRuleLevel,
	ValidationStatus,
} from "../../../../../shared/deep-dive-contract.types";

export type {
	ValidationDataPointLevel,
	ValidationRuleLevel,
	ValidationStatus,
} from "../../../../../shared/deep-dive-contract.types";

export type ValidationDbStatus = validation_status;

export interface ValidationRuleCriteria {
	pass: string;
	warn: string;
	fail: string;
}

export interface ValidationRulePayload {
	name: string;
	label: string | null;
	level: ValidationRuleLevel;
	enabled: boolean;
	description: string | null;
	criteria: ValidationRuleCriteria;
	data_point_level: ValidationDataPointLevel | null;
}

export interface ValidationSummaryByCompanyRow {
	company_id: number;
	company_name: string;
	total: bigint;
	pass: bigint;
	warn: bigint;
	failed: bigint;
}

export interface ValidationSummaryByRuleRow {
	rule_name: string;
	rule_label: string;
	rule_level: string;
	total: bigint;
	pass: bigint;
	warn: bigint;
	failed: bigint;
}

export interface ConfiguredValidationRuleRow {
	id: number;
	validation_rule_id: number;
	execution_order: number | null;
	enabled: boolean;
	rule_name: string;
	rule_label: string | null;
	rule_level: ValidationRuleLevel;
	rule_data_point_level: ValidationDataPointLevel | null;
	rule_description: string | null;
	rule_criteria: unknown;
}

export interface AvailableValidationRuleRow {
	id: number;
	name: string;
	label: string | null;
	level: ValidationRuleLevel;
	data_point_level: ValidationDataPointLevel | null;
	description: string | null;
	criteria: unknown;
}

export interface ValidationManualUpdatePayload {
	status: ValidationStatus;
	comment: string | null;
	resolvedBy: string;
}

export interface ValidationSummaryCompanyRow {
	companyId: number;
	companyName: string;
	total: number;
	pass: number;
	warn: number;
	failed: number;
}

export interface ValidationSummaryRuleRow {
	ruleName: string;
	ruleLabel: string;
	ruleLevel: string;
	total: number;
	pass: number;
	warn: number;
	failed: number;
}

export interface ValidationCompanyItem {
	validationId: number;
	status: string;
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
	items: ValidationCompanyItem[];
	totals: {
		total: number;
		pass: number;
		warn: number;
		failed: number;
	};
}
