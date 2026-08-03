import type { NextRequest } from "next/server";
import { MonitoringController } from "../../../server/modules/monitoring";

export async function GET(request: NextRequest) {
	return MonitoringController.getSettings(request);
}

export async function PUT(request: NextRequest) {
	return MonitoringController.updateSettings(request);
}
