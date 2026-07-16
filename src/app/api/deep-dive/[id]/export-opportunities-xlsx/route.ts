import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../server/modules/deep-dive";

/** Heavy SQL + Excel build; needs Node runtime and longer timeout on Vercel. */
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return DeepDiveController.exportOpportunitiesXlsx(request, id);
}
