import { bigintToNumber, parseValidationCriteria } from "./validation.tools";
import type {
	AvailableValidationRuleRow,
	ConfiguredValidationRuleRow,
	ValidationSummaryByCompanyRow,
	ValidationSummaryByRuleRow,
} from "./validation.types";

export function mapValidationSummaryByCompany(
	row: ValidationSummaryByCompanyRow,
) {
	return {
		companyId: row.company_id,
		companyName: row.company_name,
		total: bigintToNumber(row.total),
		pass: bigintToNumber(row.pass),
		warn: bigintToNumber(row.warn),
		failed: bigintToNumber(row.failed),
	};
}

export function mapValidationSummaryByRule(row: ValidationSummaryByRuleRow) {
	return {
		ruleName: row.rule_name,
		ruleLabel: row.rule_label,
		ruleLevel: row.rule_level,
		total: bigintToNumber(row.total),
		pass: bigintToNumber(row.pass),
		warn: bigintToNumber(row.warn),
		failed: bigintToNumber(row.failed),
	};
}

export function mapConfiguredValidationRule(row: ConfiguredValidationRuleRow) {
	return {
		id: row.id,
		ruleId: row.validation_rule_id,
		order: row.execution_order,
		enabled: row.enabled,
		name: row.rule_name,
		label: row.rule_label,
		level: row.rule_level,
		dataPointLevel: row.rule_data_point_level,
		description: row.rule_description,
		criteria: parseValidationCriteria(row.rule_criteria),
	};
}

export function mapAvailableValidationRule(row: AvailableValidationRuleRow) {
	return {
		id: row.id,
		name: row.name,
		label: row.label,
		level: row.level,
		dataPointLevel: row.data_point_level,
		description: row.description,
		criteria: parseValidationCriteria(row.criteria),
	};
}
