import { REPORT_NOTIFICATION_EVENTS } from "../../app/server/modules/report-notifications/report-notifications.constants";
import type { ReportNotificationEvent } from "../../hooks/api/useReportNotificationsService";

export const NOTIFICATION_EVENT_LABELS: Record<
	ReportNotificationEvent,
	string
> = {
	REPORT_STARTED: "Started",
	REPORT_COMPLETED: "Completed",
	REPORT_FAILED: "Failed",
};

export const NOTIFICATION_EVENT_ORDER = REPORT_NOTIFICATION_EVENTS;
