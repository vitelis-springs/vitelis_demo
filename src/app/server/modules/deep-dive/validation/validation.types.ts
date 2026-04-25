import type { validation_status } from "../../../../../generated/prisma";

export type ValidationStatus = "pass" | "warn" | "failed";

export type ValidationDbStatus = validation_status;

export interface ValidationRuleCriteria {
	pass: string;
	warn: string;
	fail: string;
}

export interface ValidationRulePayload {
	name: string;
	label: string | null;
	level: string;
	enabled: boolean;
	description: string | null;
	criteria: ValidationRuleCriteria;
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
