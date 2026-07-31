import { type NextRequest, NextResponse } from "next/server";
import { ReportNotificationsController } from "../../../../../server/modules/report-notifications";

function parseReportId(raw: string): number | null {
	const id = Number(raw);
	return Number.isInteger(id) ? id : null;
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const reportId = parseReportId(id);
	if (reportId === null) {
		return NextResponse.json(
			{ success: false, error: "Invalid report id" },
			{ status: 400 },
		);
	}
	return ReportNotificationsController.listRecipients(request, reportId);
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const reportId = parseReportId(id);
	if (reportId === null) {
		return NextResponse.json(
			{ success: false, error: "Invalid report id" },
			{ status: 400 },
		);
	}
	return ReportNotificationsController.addRecipient(request, reportId);
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const reportId = parseReportId(id);
	if (reportId === null) {
		return NextResponse.json(
			{ success: false, error: "Invalid report id" },
			{ status: 400 },
		);
	}
	return ReportNotificationsController.removeRecipient(request, reportId);
}
