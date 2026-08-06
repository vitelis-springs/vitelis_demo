import { NextRequest } from "next/server";
import { ReportStepsController } from "../../../../../../server/modules/report-steps";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; companyId: string }> },
) {
	const { id, companyId } = await params;
	return ReportStepsController.getCompanyCostSteps(request, id, companyId);
}
