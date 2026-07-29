/** biome-ignore-all lint/complexity/noStaticOnlyClass: Controller methods are grouped statically to match existing module conventions. */
import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../lib/auth";
import {
	isReportNotificationEvent,
	isValidEmail,
	REPORT_NOTIFICATION_EVENTS,
	type ReportNotificationEvent,
} from "./report-notifications.constants";
import { ReportNotificationsService } from "./report-notifications.service";

function errorResponse(error: unknown): NextResponse {
	const message =
		error instanceof Error ? error.message : "Internal server error";
	return NextResponse.json({ success: false, error: message }, { status: 500 });
}

function parseReportIds(raw: string | null): number[] | null {
	if (!raw || raw.trim() === "") return null;

	const ids = raw
		.split(",")
		.map((part) => part.trim())
		.filter((part) => part !== "")
		.map((part) => Number(part));

	if (ids.length === 0 || ids.some((id) => !Number.isInteger(id))) return null;
	return ids;
}

const INVALID_EVENT_TYPE_ERROR = `event_type must be one of ${REPORT_NOTIFICATION_EVENTS.join(", ")}`;

/** `null` value means "no event_type given" (caller should fall back to all-events behavior). */
type OptionalEventTypeResult =
	| { ok: true; value: ReportNotificationEvent | null }
	| { ok: false };

function parseOptionalEventType(raw: unknown): OptionalEventTypeResult {
	if (raw === undefined || raw === null || raw === "") {
		return { ok: true, value: null };
	}
	if (typeof raw === "string" && isReportNotificationEvent(raw)) {
		return { ok: true, value: raw };
	}
	return { ok: false };
}

export class ReportNotificationsController {
	/** GET /api/sales-miner/reports/notification-subscriptions/me?report_ids=1,2,3 */
	static async getBulkState(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const reportIds = parseReportIds(
				request.nextUrl.searchParams.get("report_ids"),
			);
			if (!reportIds) {
				return NextResponse.json(
					{
						success: false,
						error: "report_ids must be a non-empty list of integers",
					},
					{ status: 400 },
				);
			}

			const uniqueIds = Array.from(new Set(reportIds));
			const existingIds =
				await ReportNotificationsService.findExistingReportIds(uniqueIds);
			const missingIds = uniqueIds.filter((id) => !existingIds.has(id));
			if (missingIds.length > 0) {
				return NextResponse.json(
					{
						success: false,
						error: "Some report ids do not exist",
						missing_ids: missingIds,
					},
					{ status: 404 },
				);
			}

			const data = await ReportNotificationsService.getMySubscriptionState(
				uniqueIds,
				auth.user.email,
			);
			return NextResponse.json({ success: true, data });
		} catch (error: unknown) {
			console.error("Error fetching notification subscription state:", error);
			return errorResponse(error);
		}
	}

	/** GET /api/sales-miner/reports/{id}/notification-subscriptions/me */
	static async getState(
		request: NextRequest,
		reportId: number,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const existingIds =
				await ReportNotificationsService.findExistingReportIds([reportId]);
			if (!existingIds.has(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Report not found" },
					{ status: 404 },
				);
			}

			const data = await ReportNotificationsService.getMySubscriptionState(
				[reportId],
				auth.user.email,
			);
			return NextResponse.json({ success: true, data });
		} catch (error: unknown) {
			console.error("Error fetching notification subscription state:", error);
			return errorResponse(error);
		}
	}

	/** POST /api/sales-miner/reports/{id}/notification-subscriptions/me — body: {} | { event_type } */
	static async subscribe(
		request: NextRequest,
		reportId: number,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const body = (await request.json().catch(() => null)) as {
				event_type?: unknown;
			} | null;
			const eventType = parseOptionalEventType(body?.event_type);
			if (!eventType.ok) {
				return NextResponse.json(
					{ success: false, error: INVALID_EVENT_TYPE_ERROR },
					{ status: 400 },
				);
			}

			const existingIds =
				await ReportNotificationsService.findExistingReportIds([reportId]);
			if (!existingIds.has(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Report not found" },
					{ status: 404 },
				);
			}

			if (eventType.value) {
				await ReportNotificationsService.setEventSubscription(
					reportId,
					auth.user.email,
					eventType.value,
					true,
				);
			} else {
				await ReportNotificationsService.subscribeAll(
					reportId,
					auth.user.email,
				);
			}
			const data = await ReportNotificationsService.getMySubscriptionState(
				[reportId],
				auth.user.email,
			);
			return NextResponse.json({ success: true, data });
		} catch (error: unknown) {
			console.error("Error subscribing to report notifications:", error);
			return errorResponse(error);
		}
	}

	/** DELETE /api/sales-miner/reports/{id}/notification-subscriptions/me?event_type=... */
	static async unsubscribe(
		request: NextRequest,
		reportId: number,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const eventType = parseOptionalEventType(
				request.nextUrl.searchParams.get("event_type"),
			);
			if (!eventType.ok) {
				return NextResponse.json(
					{ success: false, error: INVALID_EVENT_TYPE_ERROR },
					{ status: 400 },
				);
			}

			const existingIds =
				await ReportNotificationsService.findExistingReportIds([reportId]);
			if (!existingIds.has(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Report not found" },
					{ status: 404 },
				);
			}

			if (eventType.value) {
				await ReportNotificationsService.setEventSubscription(
					reportId,
					auth.user.email,
					eventType.value,
					false,
				);
			} else {
				await ReportNotificationsService.unsubscribeAll(
					reportId,
					auth.user.email,
				);
			}
			const data = await ReportNotificationsService.getMySubscriptionState(
				[reportId],
				auth.user.email,
			);
			return NextResponse.json({ success: true, data });
		} catch (error: unknown) {
			console.error("Error unsubscribing from report notifications:", error);
			return errorResponse(error);
		}
	}

	/** GET /api/sales-miner/reports/{id}/notification-subscriptions */
	static async listRecipients(
		request: NextRequest,
		reportId: number,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const existingIds =
				await ReportNotificationsService.findExistingReportIds([reportId]);
			if (!existingIds.has(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Report not found" },
					{ status: 404 },
				);
			}

			const data = await ReportNotificationsService.listRecipients(reportId);
			return NextResponse.json({ success: true, data });
		} catch (error: unknown) {
			console.error("Error listing report notification recipients:", error);
			return errorResponse(error);
		}
	}

	/** POST /api/sales-miner/reports/{id}/notification-subscriptions — body: { recipient_email, event_type? } */
	static async addRecipient(
		request: NextRequest,
		reportId: number,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const body = (await request.json().catch(() => null)) as {
				recipient_email?: unknown;
				event_type?: unknown;
			} | null;
			const recipientEmail =
				typeof body?.recipient_email === "string" ? body.recipient_email : "";
			if (!isValidEmail(recipientEmail)) {
				return NextResponse.json(
					{
						success: false,
						error: "recipient_email must be a valid email address",
					},
					{ status: 400 },
				);
			}
			const eventType = parseOptionalEventType(body?.event_type);
			if (!eventType.ok) {
				return NextResponse.json(
					{ success: false, error: INVALID_EVENT_TYPE_ERROR },
					{ status: 400 },
				);
			}

			const existingIds =
				await ReportNotificationsService.findExistingReportIds([reportId]);
			if (!existingIds.has(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Report not found" },
					{ status: 404 },
				);
			}

			if (eventType.value) {
				await ReportNotificationsService.setEventSubscription(
					reportId,
					recipientEmail,
					eventType.value,
					true,
				);
			} else {
				await ReportNotificationsService.subscribeAll(reportId, recipientEmail);
			}
			const data = await ReportNotificationsService.listRecipients(reportId);
			return NextResponse.json({ success: true, data });
		} catch (error: unknown) {
			console.error("Error adding report notification recipient:", error);
			return errorResponse(error);
		}
	}

	/** DELETE /api/sales-miner/reports/{id}/notification-subscriptions?recipient_email=...&event_type=... */
	static async removeRecipient(
		request: NextRequest,
		reportId: number,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const recipientEmail =
				request.nextUrl.searchParams.get("recipient_email") ?? "";
			if (!isValidEmail(recipientEmail)) {
				return NextResponse.json(
					{
						success: false,
						error: "recipient_email must be a valid email address",
					},
					{ status: 400 },
				);
			}
			const eventType = parseOptionalEventType(
				request.nextUrl.searchParams.get("event_type"),
			);
			if (!eventType.ok) {
				return NextResponse.json(
					{ success: false, error: INVALID_EVENT_TYPE_ERROR },
					{ status: 400 },
				);
			}

			const existingIds =
				await ReportNotificationsService.findExistingReportIds([reportId]);
			if (!existingIds.has(reportId)) {
				return NextResponse.json(
					{ success: false, error: "Report not found" },
					{ status: 404 },
				);
			}

			if (eventType.value) {
				await ReportNotificationsService.setEventSubscription(
					reportId,
					recipientEmail,
					eventType.value,
					false,
				);
			} else {
				await ReportNotificationsService.unsubscribeAll(
					reportId,
					recipientEmail,
				);
			}
			const data = await ReportNotificationsService.listRecipients(reportId);
			return NextResponse.json({ success: true, data });
		} catch (error: unknown) {
			console.error("Error removing report notification recipient:", error);
			return errorResponse(error);
		}
	}
}
