import { NextRequest } from "next/server";
import { ReportStepsController } from "../../../../../../../../server/modules/report-steps";

export async function GET(
	request: NextRequest,
	{
		params,
	}: { params: Promise<{ id: string; companyId: string; stepId: string }> },
) {
	const { id, companyId, stepId } = await params;
	return ReportStepsController.getCompanyStepCostTasks(
		request,
		id,
		companyId,
		stepId,
	);
}
