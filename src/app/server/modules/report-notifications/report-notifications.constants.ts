export const REPORT_NOTIFICATION_EVENTS = [
	"REPORT_STARTED",
	"REPORT_COMPLETED",
	"REPORT_FAILED",
] as const;

export type ReportNotificationEvent =
	(typeof REPORT_NOTIFICATION_EVENTS)[number];

export const NOTIFICATION_CHANNEL = "email" as const;

export const DELIVERY_STATUSES = [
	"pending",
	"processing",
	"dispatched",
	"failed",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export function isReportNotificationEvent(
	value: string,
): value is ReportNotificationEvent {
	return (REPORT_NOTIFICATION_EVENTS as readonly string[]).includes(value);
}

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
	return EMAIL_PATTERN.test(normalizeEmail(email));
}

export function buildDedupeKey(params: {
	reportId: number;
	eventType: ReportNotificationEvent;
	recipientEmail: string;
}): string {
	return `report:${params.reportId}:event:${params.eventType}:channel:${NOTIFICATION_CHANNEL}:recipient:${normalizeEmail(params.recipientEmail)}`;
}
