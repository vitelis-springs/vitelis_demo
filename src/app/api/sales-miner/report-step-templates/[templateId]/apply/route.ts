import type { NextRequest } from "next/server";
import { ReportStepsController } from "../../../../../server/modules/report-steps";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ templateId: string }> },
) {
	const { templateId } = await params;
	return ReportStepsController.applyPreset(request, templateId);
}
