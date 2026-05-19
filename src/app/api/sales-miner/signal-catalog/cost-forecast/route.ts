import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

export interface CostForecastStep {
	stepId: number;
	name: string;
	avgCost: number;
}

export interface CostForecastResult {
	fixedCostPerCompany: number;
	avgCostPerSignal: number;
	steps: CostForecastStep[];
}

export async function GET(request: NextRequest) {
	const admin = await extractAdminFromRequest(request);
	if (!admin)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const reportId = Number(request.nextUrl.searchParams.get("reportId"));
	if (!reportId || isNaN(reportId)) {
		return NextResponse.json(
			{ error: "reportId is required" },
			{ status: 400 },
		);
	}

	const [summaryRows, stepRows] = await Promise.all([
		prisma.$queryRaw<
			Array<{ fixed_cost_per_company: number; avg_cost_per_signal: number }>
		>`
			WITH stats_reports AS (
				SELECT r.id AS report_id
				FROM reports r
				JOIN report_settings rs ON rs.id = r.report_settings_id
				WHERE (rs.settings->>'use_for_statistics')::boolean = true
			),
			step_avg_costs AS (
				SELECT step_id, AVG(step_total) AS avg_cost
				FROM (
					SELECT v.report_id, v.company_id, v.step_id, SUM(v.total_cost) AS step_total
					FROM v_external_resource_costs_by_report_company_step_task v
					JOIN stats_reports sr ON sr.report_id = v.report_id
					WHERE v.step_id != 32
					GROUP BY v.report_id, v.company_id, v.step_id
				) sub
				GROUP BY step_id
			),
			fixed_cost AS (
				SELECT COALESCE(SUM(sac.avg_cost), 0) AS total
				FROM report_steps rs2
				JOIN step_avg_costs sac ON sac.step_id = rs2.step_id
				WHERE rs2.report_id = ${reportId}
			),
			signal_cost AS (
				SELECT COALESCE(AVG(v.total_cost / sc.active_signals::numeric), 0) AS avg_per_signal
				FROM v_external_resource_costs_by_report_company_step_task v
				JOIN stats_reports sr ON sr.report_id = v.report_id
				JOIN (
					SELECT report_id, company_id, COUNT(*) AS active_signals
					FROM report_company_signal_scope
					WHERE is_active = true
					GROUP BY report_id, company_id
				) sc ON sc.report_id = v.report_id AND sc.company_id = v.company_id
				WHERE v.step_id = 32
			)
			SELECT
				fc.total AS fixed_cost_per_company,
				sc.avg_per_signal AS avg_cost_per_signal
			FROM fixed_cost fc, signal_cost sc
		`,
		// Step breakdown: per step_id in this report, avg cost + step name from report_generation_steps
		prisma.$queryRaw<
			Array<{ step_id: number; name: string; avg_cost: number }>
		>`
			WITH stats_reports AS (
				SELECT r.id AS report_id
				FROM reports r
				JOIN report_settings rs ON rs.id = r.report_settings_id
				WHERE (rs.settings->>'use_for_statistics')::boolean = true
			),
			per_step_totals AS (
				SELECT v.report_id, v.company_id, v.step_id,
					SUM(v.total_cost) AS step_total
				FROM v_external_resource_costs_by_report_company_step_task v
				JOIN stats_reports sr ON sr.report_id = v.report_id
				WHERE v.step_id != 32
				GROUP BY v.report_id, v.company_id, v.step_id
			)
			SELECT
				pst.step_id,
				COALESCE(rgs.name, pst.step_id::text) AS name,
				AVG(pst.step_total) AS avg_cost
			FROM per_step_totals pst
			JOIN report_steps rs2 ON rs2.step_id = pst.step_id AND rs2.report_id = ${reportId}
			LEFT JOIN report_generation_steps rgs ON rgs.id = pst.step_id
			GROUP BY pst.step_id, rgs.name
			ORDER BY avg_cost DESC
		`,
	]);

	const r = summaryRows[0]!;
	const data: CostForecastResult = {
		fixedCostPerCompany: Number(r.fixed_cost_per_company),
		avgCostPerSignal: Number(r.avg_cost_per_signal),
		steps: stepRows.map((s) => ({
			stepId: Number(s.step_id),
			name: s.name,
			avgCost: Number(s.avg_cost),
		})),
	};

	return NextResponse.json({ data });
}
