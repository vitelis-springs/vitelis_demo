import type { NextRequest } from "next/server";
import { ReportStepsController } from "../../../server/modules/report-steps";

export async function GET(request: NextRequest) {
	return ReportStepsController.listPresets(request);
}

export async function POST(request: NextRequest) {
	return ReportStepsController.createPreset(request);
}
