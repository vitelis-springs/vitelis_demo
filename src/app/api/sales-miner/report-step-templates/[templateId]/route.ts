import type { NextRequest } from "next/server";
import { ReportStepsController } from "../../../../server/modules/report-steps";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ templateId: string }> },
) {
	const { templateId } = await params;
	return ReportStepsController.getPreset(request, templateId);
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ templateId: string }> },
) {
	const { templateId } = await params;
	return ReportStepsController.updatePreset(request, templateId);
}
