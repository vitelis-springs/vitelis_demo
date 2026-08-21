import type { NextRequest } from "next/server";
import { SmEngineController } from "../../../../server/modules/sm-engine";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return SmEngineController.getLatestRun(request, id);
}
