import type { NextRequest } from "next/server";
import { N8NTasksController } from "../../../../server/modules/n8n-tasks";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return N8NTasksController.stop(request, id);
}
