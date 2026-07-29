import type { NextRequest } from "next/server";
import { ReportNotificationsController } from "../../../../../server/modules/report-notifications";

export async function GET(request: NextRequest) {
	return ReportNotificationsController.getBulkState(request);
}
