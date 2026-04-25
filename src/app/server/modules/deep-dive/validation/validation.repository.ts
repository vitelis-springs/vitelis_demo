/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
import type { validation_status } from "../../../../../generated/prisma";
import prisma from "../../../../../lib/prisma";
import type { ValidationRulePayload } from "./validation.types";

export class ValidationRepository {
	static async getValidationSummary(reportId: number) {
		return prisma.$queryRaw<
			{
				company_id: number;
				company_name: string;
				total: bigint;
				pass: bigint;
				warn: bigint;
				failed: bigint;
			}[]
		>`
      SELECT
        c.id   AS company_id,
        c.name AS company_name,
        COUNT(v.id)                                              AS total,
        SUM(CASE WHEN v.status = 'pass'   THEN 1 ELSE 0 END)   AS pass,
        SUM(CASE WHEN v.status = 'warn'   THEN 1 ELSE 0 END)   AS warn,
        SUM(CASE WHEN v.status = 'failed' THEN 1 ELSE 0 END)   AS failed
      FROM report_data_point_validations v
      JOIN report_data_point_results r ON r.id = v.report_data_point_result_id
      JOIN companies c ON c.id = r.company_id
      WHERE r.report_id = ${reportId}
      GROUP BY c.id, c.name
      ORDER BY failed DESC, warn DESC, c.name
    `;
	}

	static async getValidationByRule(reportId: number) {
		return prisma.$queryRaw<
			{
				rule_name: string;
				rule_label: string;
				rule_level: string;
				total: bigint;
				pass: bigint;
				warn: bigint;
				failed: bigint;
			}[]
		>`
      SELECT
        vr.name  AS rule_name,
        vr.label AS rule_label,
        vr.level AS rule_level,
        COUNT(v.id)                                              AS total,
        SUM(CASE WHEN v.status = 'pass'   THEN 1 ELSE 0 END)   AS pass,
        SUM(CASE WHEN v.status = 'warn'   THEN 1 ELSE 0 END)   AS warn,
        SUM(CASE WHEN v.status = 'failed' THEN 1 ELSE 0 END)   AS failed
      FROM report_data_point_validations v
      JOIN validation_rules vr ON vr.id = v.validation_rule_id
      JOIN report_data_point_results r ON r.id = v.report_data_point_result_id
      WHERE r.report_id = ${reportId}
      GROUP BY vr.id, vr.name, vr.label, vr.level
      ORDER BY failed DESC, warn DESC
    `;
	}

	static async getConfiguredValidationRules(reportId: number) {
		return prisma.$queryRaw<
			{
				id: number;
				validation_rule_id: number;
				execution_order: number | null;
				enabled: boolean;
				rule_name: string;
				rule_label: string | null;
				rule_level: string;
				rule_description: string | null;
				rule_criteria: unknown;
			}[]
		>`
      SELECT
        rvr.id,
        rvr.validation_rule_id,
        rvr.execution_order,
        rvr.enabled,
        vr.name        AS rule_name,
        vr.label       AS rule_label,
        vr.level       AS rule_level,
        vr.description AS rule_description,
        vr.criteria    AS rule_criteria
      FROM report_validation_rules rvr
      JOIN validation_rules vr ON vr.id = rvr.validation_rule_id
      WHERE rvr.report_id = ${reportId}
      ORDER BY rvr.execution_order NULLS LAST, vr.name
    `;
	}

	static async getAvailableValidationRules(reportId: number) {
		return prisma.$queryRaw<
			{
				id: number;
				name: string;
				label: string | null;
				level: string;
				description: string | null;
				criteria: unknown;
			}[]
		>`
      SELECT vr.id, vr.name, vr.label, vr.level, vr.description, vr.criteria
      FROM validation_rules vr
      WHERE vr.enabled = true
        AND vr.id NOT IN (
          SELECT validation_rule_id FROM report_validation_rules WHERE report_id = ${reportId}
        )
      ORDER BY vr.level, vr.name
    `;
	}

	static async addReportValidationRule(reportId: number, ruleId: number) {
		const maxOrder = await prisma.$queryRaw<{ max: number | null }[]>`
      SELECT MAX(execution_order) AS max FROM report_validation_rules WHERE report_id = ${reportId}
    `;
		const nextOrder = (maxOrder[0]?.max ?? 0) + 1;
		await prisma.$executeRaw`
      INSERT INTO report_validation_rules (report_id, validation_rule_id, execution_order, enabled, created_at)
      VALUES (${reportId}, ${ruleId}, ${nextOrder}, true, NOW())
      ON CONFLICT DO NOTHING
    `;
	}

	static async removeReportValidationRule(reportId: number, ruleId: number) {
		await prisma.$executeRaw`
      DELETE FROM report_validation_rules
      WHERE report_id = ${reportId} AND validation_rule_id = ${ruleId}
    `;
	}

	static async updateValidationRule(id: number, params: ValidationRulePayload) {
		await prisma.$executeRaw`
      UPDATE validation_rules
      SET
        name        = ${params.name},
        label       = ${params.label},
        level       = ${params.level}::"validation_rule_level",
        enabled     = ${params.enabled},
        description = ${params.description},
        criteria    = ${JSON.stringify(params.criteria)}::jsonb,
        updated_at  = NOW()
      WHERE id = ${id}
    `;
	}

	static async createValidationRule(params: ValidationRulePayload) {
		const result = await prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO validation_rules (name, label, level, enabled, description, criteria, created_at, updated_at)
      VALUES (
        ${params.name},
        ${params.label},
        ${params.level}::"validation_rule_level",
        ${params.enabled},
        ${params.description},
        ${JSON.stringify(params.criteria)}::jsonb,
        NOW(),
        NOW()
      )
      RETURNING id
    `;
		return result[0];
	}

	static async getValidationByCompany(
		reportId: number,
		companyId: number,
		status?: validation_status,
	) {
		return prisma.report_data_point_validations.findMany({
			where: {
				...(status ? { status } : {}),
				report_data_point_results: {
					report_id: reportId,
					company_id: companyId,
				},
			},
			select: {
				id: true,
				status: true,
				reasoning: true,
				validation_rules: {
					select: { id: true, name: true, label: true, level: true },
				},
				report_data_point_results: {
					select: {
						id: true,
						data_point_id: true,
						value: true,
						manualValue: true,
						data: true,
						status: true,
						data_points: {
							select: { name: true, type: true },
						},
						companies: {
							select: { id: true, name: true },
						},
					},
				},
			},
		});
	}
}
