import type { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../../../server/modules/deep-dive";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; companyId: string }> },
) {
	const { id, companyId } = await params;
	return DeepDiveController.createCompanyDataPoint(request, id, companyId);
}
