import type { NextRequest } from "next/server";
import { N8NTasksController } from "../../server/modules/n8n-tasks";

export async function GET(request: NextRequest) {
	return N8NTasksController.list(request);
}

export async function POST(request: NextRequest) {
	return N8NTasksController.create(request);
}
