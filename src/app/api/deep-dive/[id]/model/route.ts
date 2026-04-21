import { NextRequest } from "next/server";
import { DeepDiveController } from "../../../../server/modules/deep-dive";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return DeepDiveController.getModel(request, id);
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return DeepDiveController.createModelItem(request, id);
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return DeepDiveController.replaceModel(request, id);
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return DeepDiveController.updateModelItem(request, id);
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return DeepDiveController.deleteModelItem(request, id);
}
