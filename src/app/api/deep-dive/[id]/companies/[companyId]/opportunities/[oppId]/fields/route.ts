import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../../../../../server/modules/deep-dive";

export async function PATCH(
	request: NextRequest,
	{
		params,
	}: { params: Promise<{ id: string; companyId: string; oppId: string }> },
) {
	const { id, companyId, oppId } = await params;
	return DeepDiveController.updateOpportunityNarrativeField(
		request,
		id,
		companyId,
		oppId,
	);
}
