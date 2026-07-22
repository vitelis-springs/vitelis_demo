import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../lib/auth";
import { DeepDiveService } from "../../../../server/modules/deep-dive/deep-dive.service";
import { N8NService } from "../../../../server/modules/n8n";

function parseReportIds(value: unknown): number[] | null {
	if (!Array.isArray(value)) return null;
	const ids = value.filter(
		(id): id is number => Number.isInteger(id) && id > 0,
	);
	if (ids.length !== value.length || ids.length === 0) return null;
	return Array.from(new Set(ids));
}

export async function POST(request: NextRequest) {
	try {
		const auth = extractAdminFromRequest(request);
		if (!auth.success) return auth.response;

		const body = (await request.json()) as { report_ids?: unknown };
		const reportIds = parseReportIds(body.report_ids);

		if (!reportIds) {
			return NextResponse.json(
				{
					success: false,
					error: "report_ids must be a non-empty array of positive integers.",
				},
				{ status: 400 },
			);
		}

		const { invalidReports } =
			await DeepDiveService.getSalesMinerDopExportValidation(reportIds);

		if (invalidReports.length > 0) {
			return NextResponse.json(
				{
					success: false,
					error: "Some reports cannot be sent to DOP.",
					invalid_reports: invalidReports,
				},
				{ status: 400 },
			);
		}

		const n8nResult = await N8NService.sendSalesMinerReportsToDop({
			report_ids: reportIds,
		});

		return NextResponse.json({
			success: true,
			report_ids: reportIds,
			n8n: n8nResult,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to send reports to DOP";
		console.error("❌ POST /api/sales-miner/reports/send-to-dop:", message);
		return NextResponse.json(
			{ success: false, error: message },
			{ status: 500 },
		);
	}
}
