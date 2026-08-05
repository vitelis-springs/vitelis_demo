import type { NextRequest } from "next/server";
import { ProductDiscoveryController } from "../../../../../../server/modules/product-discovery";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return ProductDiscoveryController.start(request, id);
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return ProductDiscoveryController.latest(request, id);
}
