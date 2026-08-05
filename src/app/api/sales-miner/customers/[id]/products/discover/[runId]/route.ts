import type { NextRequest } from "next/server";
import { ProductDiscoveryController } from "../../../../../../../server/modules/product-discovery";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ runId: string }> },
) {
	const { runId } = await params;
	return ProductDiscoveryController.get(request, runId);
}
