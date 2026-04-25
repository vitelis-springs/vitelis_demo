import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../../server/modules/deep-dive";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; company_id: string }> },
) {
	const { id, company_id } = await params;
	return DeepDiveController.getValidationByCompany(request, id, company_id);
}
