/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../lib/auth";
import { ValidationService } from "./validation.service";
import {
	parseValidationRulePayload,
	parseValidationStatus,
} from "./validation.tools";

export class ValidationController {
	static async getValidationSummary(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const result = await ValidationService.getValidationSummary(reportId);
			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ ValidationController.getValidationSummary:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch validation summary" },
				{ status: 500 },
			);
		}
	}

	static async getReportValidationRules(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const result = await ValidationService.getReportValidationRules(reportId);
			return NextResponse.json({ success: true, data: result });
		} catch (error) {
			console.error("❌ ValidationController.getReportValidationRules:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch validation rules" },
				{ status: 500 },
			);
		}
	}

	static async addReportValidationRule(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			if (!Number.isFinite(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid report id" },
					{ status: 400 },
				);
			}

			const body = (await request.json()) as { ruleId?: unknown };
			const ruleId = Number(body.ruleId);
			if (!Number.isFinite(ruleId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid rule id" },
					{ status: 400 },
				);
			}

			await ValidationService.addReportValidationRule(reportId, ruleId);
			return NextResponse.json({ success: true });
		} catch (error) {
			console.error("❌ ValidationController.addReportValidationRule:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to add validation rule" },
				{ status: 500 },
			);
		}
	}

	static async removeReportValidationRule(
		request: NextRequest,
		reportIdParam: string,
		ruleIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			const ruleId = Number(ruleIdParam);
			if (!Number.isFinite(reportId) || !Number.isFinite(ruleId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid id" },
					{ status: 400 },
				);
			}

			await ValidationService.removeReportValidationRule(reportId, ruleId);
			return NextResponse.json({ success: true });
		} catch (error) {
			console.error(
				"❌ ValidationController.removeReportValidationRule:",
				error,
			);
			return NextResponse.json(
				{ success: false, error: "Failed to remove validation rule" },
				{ status: 500 },
			);
		}
	}

	static async updateValidationRule(
		request: NextRequest,
		ruleIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const ruleId = Number(ruleIdParam);
			if (!Number.isFinite(ruleId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid rule id" },
					{ status: 400 },
				);
			}

			const body = (await request.json()) as Record<string, unknown>;
			const payload = parseValidationRulePayload(body);
			if ("error" in payload) {
				return NextResponse.json(
					{ success: false, error: payload.error },
					{ status: 400 },
				);
			}

			await ValidationService.updateValidationRule(ruleId, payload);
			return NextResponse.json({ success: true });
		} catch (error) {
			console.error("❌ ValidationController.updateValidationRule:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to update validation rule" },
				{ status: 500 },
			);
		}
	}

	static async createValidationRule(
		request: NextRequest,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const body = (await request.json()) as Record<string, unknown>;
			const payload = parseValidationRulePayload(body);
			if ("error" in payload) {
				return NextResponse.json(
					{ success: false, error: payload.error },
					{ status: 400 },
				);
			}

			const result = await ValidationService.createValidationRule(payload);
			return NextResponse.json({ success: true, data: result });
		} catch (error) {
			console.error("❌ ValidationController.createValidationRule:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to create validation rule" },
				{ status: 500 },
			);
		}
	}

	static async getValidationByCompany(
		request: NextRequest,
		reportIdParam: string,
		companyIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportId = Number(reportIdParam);
			const companyId = Number(companyIdParam);
			if (!Number.isFinite(reportId) || !Number.isFinite(companyId)) {
				return NextResponse.json(
					{ success: false, error: "Invalid id" },
					{ status: 400 },
				);
			}

			const { searchParams } = new URL(request.url);
			const status = parseValidationStatus(searchParams.get("status"));
			const result = await ValidationService.getValidationByCompany(
				reportId,
				companyId,
				status,
			);
			return NextResponse.json(result);
		} catch (error) {
			console.error("❌ ValidationController.getValidationByCompany:", error);
			return NextResponse.json(
				{ success: false, error: "Failed to fetch validation details" },
				{ status: 500 },
			);
		}
	}
}
