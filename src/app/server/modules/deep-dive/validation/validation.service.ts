/** biome-ignore-all lint/complexity/noStaticOnlyClass: Service methods are grouped statically to match existing module conventions. */
import type { validation_status } from "../../../../../generated/prisma";
import { DeepDiveRepository } from "../deep-dive.repository";
import {
	mapAvailableValidationRule,
	mapConfiguredValidationRule,
	mapValidationSummaryByCompany,
	mapValidationSummaryByRule,
} from "./validation.mappers";
import { ValidationRepository } from "./validation.repository";
import {
	getString,
	sortValidationCompanyItems,
	toDataRecord,
} from "./validation.tools";
import type {
	ValidationManualUpdatePayload,
	ValidationRulePayload,
	ValidationStatus,
} from "./validation.types";

export class ValidationService {
	static async getValidationSummary(reportId: number) {
		const [byCompany, byRule] = await Promise.all([
			ValidationRepository.getValidationSummary(reportId),
			ValidationRepository.getValidationByRule(reportId),
		]);

		return {
			byCompany: byCompany.map(mapValidationSummaryByCompany),
			byRule: byRule.map(mapValidationSummaryByRule),
		};
	}

	static async getReportValidationRules(reportId: number) {
		const [configured, available] = await Promise.all([
			ValidationRepository.getConfiguredValidationRules(reportId),
			ValidationRepository.getAvailableValidationRules(reportId),
		]);

		return {
			configured: configured.map(mapConfiguredValidationRule),
			available: available.map(mapAvailableValidationRule),
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
				const rawSources = data.Sources ?? data.sources;
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
					dataSourcesRaw: rawSources,
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

	static async updateValidationCheckManually(
		reportId: number,
		companyId: number,
		validationId: number,
		payload: ValidationManualUpdatePayload,
	) {
		const result = await ValidationRepository.updateValidationCheckManually(
			reportId,
			companyId,
			validationId,
			payload,
		);

		return result.count > 0;
	}
}
