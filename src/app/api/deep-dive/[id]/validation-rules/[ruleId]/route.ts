import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../../server/modules/deep-dive";

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; ruleId: string }> },
) {
	const { id, ruleId } = await params;
	return DeepDiveController.removeReportValidationRule(request, id, ruleId);
}
