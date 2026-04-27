import type { NextRequest } from "next/server";
import { AppSettingsController } from "../../../../server/modules/app-settings";

export async function GET(request: NextRequest) {
	return AppSettingsController.getClrOrchestrator(request);
}

export async function PUT(request: NextRequest) {
	return AppSettingsController.updateClrOrchestrator(request);
}
