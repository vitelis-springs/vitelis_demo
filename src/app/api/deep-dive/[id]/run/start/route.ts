import type { NextRequest } from "next/server";
import { SmEngineController } from "../../../../../server/modules/sm-engine";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return SmEngineController.start(request, id);
}
