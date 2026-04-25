/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
import type { validation_status } from "../../../../../generated/prisma";
import { DeepDiveRepository } from "../deep-dive.repository";
import { ValidationRepository } from "./validation.repository";
import {
	getString,
	parseValidationCriteria,
	sortValidationCompanyItems,
	toDataRecord,
} from "./validation.tools";
import type {
	ValidationRulePayload,
	ValidationStatus,
} from "./validation.types";

export class ValidationService {
	static async getValidationSummary(reportId: number) {
		const [byCompany, byRule] = await Promise.all([
			ValidationRepository.getValidationSummary(reportId),
			ValidationRepository.getValidationByRule(reportId),
		]);

		const toNum = (value: bigint) => Number(value);

		return {
			byCompany: byCompany.map((row) => ({
				companyId: row.company_id,
				companyName: row.company_name,
				total: toNum(row.total),
				pass: toNum(row.pass),
				warn: toNum(row.warn),
				failed: toNum(row.failed),
			})),
			byRule: byRule.map((row) => ({
				ruleName: row.rule_name,
				ruleLabel: row.rule_label,
				ruleLevel: row.rule_level,
				total: toNum(row.total),
				pass: toNum(row.pass),
				warn: toNum(row.warn),
				failed: toNum(row.failed),
			})),
		};
	}

	static async getReportValidationRules(reportId: number) {
		const [configured, available] = await Promise.all([
			ValidationRepository.getConfiguredValidationRules(reportId),
			ValidationRepository.getAvailableValidationRules(reportId),
		]);

		return {
			configured: configured.map((row) => ({
				id: row.id,
				ruleId: row.validation_rule_id,
				order: row.execution_order,
				enabled: row.enabled,
				name: row.rule_name,
				label: row.rule_label,
				level: row.rule_level,
				description: row.rule_description,
				criteria: parseValidationCriteria(row.rule_criteria),
			})),
			available: available.map((row) => ({
				id: row.id,
				name: row.name,
				label: row.label,
				level: row.level,
				description: row.description,
				criteria: parseValidationCriteria(row.criteria),
			})),
		};
	}

	static async addReportValidationRule(reportId: number, ruleId: number) {
		await ValidationRepository.addReportValidationRule(reportId, ruleId);
	}

	static async removeReportValidationRule(reportId: number, ruleId: number) {
		await ValidationRepository.removeReportValidationRule(reportId, ruleId);
	}

	static async updateValidationRule(id: number, params: ValidationRulePayload) {
		await ValidationRepository.updateValidationRule(id, params);
	}

	static async createValidationRule(params: ValidationRulePayload) {
		return ValidationRepository.createValidationRule(params);
	}

	static async getValidationByCompany(
		reportId: number,
		companyId: number,
		status?: ValidationStatus,
	) {
		const company = await DeepDiveRepository.getCompany(reportId, companyId);
		const rows = await ValidationRepository.getValidationByCompany(
			reportId,
			companyId,
			status as validation_status | undefined,
		);

		const items = sortValidationCompanyItems(
			rows.map((row) => {
				const result = row.report_data_point_results;
				const data = toDataRecord(result.data);
				return {
					validationId: row.id,
					status: row.status as string,
					validationReasoning: row.reasoning,
					resultId: result.id,
					dataPointId: result.data_point_id,
					resultStatus: result.status,
					driverName: result.data_points?.name ?? result.data_point_id ?? "—",
					driverType: result.data_points?.type ?? "unknown",
					ruleId: row.validation_rules.id,
					ruleName: row.validation_rules.name,
					ruleLabel: row.validation_rules.label,
					ruleLevel: row.validation_rules.level as string,
					dataReasoning: getString(data, "Reasoning"),
					dataSources: getString(data, "Sources") || getString(data, "sources"),
					dataScore:
						result.value ||
						result.manualValue ||
						getString(data, "KPI Score") ||
						getString(data, "Score") ||
						getString(data, "answer"),
				};
			}),
		);

		const companyName =
			company?.name ??
			rows[0]?.report_data_point_results?.companies?.name ??
			null;

		return {
			companyId,
			companyName,
			items,
			totals: {
				total: items.length,
				pass: items.filter((item) => item.status === "pass").length,
				warn: items.filter((item) => item.status === "warn").length,
				failed: items.filter((item) => item.status === "failed").length,
			},
		};
	}
}
