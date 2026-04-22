import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../server/modules/deep-dive";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ ruleId: string }> },
) {
	const { ruleId } = await params;
	return DeepDiveController.updateValidationRule(request, ruleId);
}
