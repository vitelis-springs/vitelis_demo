import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../../../../server/modules/deep-dive";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ opportunityId: string }> },
) {
	const { opportunityId } = await params;
	return DeepDiveController.updateOpportunityCandidateApproval(
		request,
		opportunityId,
	);
}
