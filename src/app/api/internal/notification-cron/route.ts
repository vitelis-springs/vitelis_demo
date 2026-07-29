import { NextResponse } from "next/server";
import { ReportNotificationsService } from "../../../server/modules/report-notifications";

/**
 * Triggered by the in-process scheduler in src/instrumentation.ts via fetch,
 * not called directly from the client. Kept as a plain HTTP route (rather
 * than a direct import from instrumentation.ts) so the Prisma-touching
 * import chain never has to be bundled for the Edge runtime that
 * src/middleware.ts also requires instrumentation.ts to support.
 */
export async function POST() {
	try {
		await ReportNotificationsService.runNotificationCronOnce();
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[NotificationScheduler] cycle failed:", error);
		return NextResponse.json({ success: false }, { status: 500 });
	}
}
