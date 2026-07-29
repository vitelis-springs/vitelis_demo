/** biome-ignore-all lint/complexity/noStaticOnlyClass: Repository methods are grouped statically to match existing module conventions. */
import prisma from "../../../../lib/prisma";
import {
	NOTIFICATION_CHANNEL,
	REPORT_NOTIFICATION_EVENTS,
	type ReportNotificationEvent,
} from "./report-notifications.constants";

export interface SubscriptionRow {
	report_id: number;
	recipient_email: string;
	event_type: string;
	enabled: boolean;
}

/**
 * Raw-SQL access to report_notification_subscriptions. Kept off the generated
 * Prisma model API on purpose — see REPORT_NOTIFICATIONS_PLAN.md section 4.
 */
export class ReportNotificationsRepository {
	static async findEnabledSubscriptions(
		reportIds: number[],
		recipientEmail: string,
	): Promise<SubscriptionRow[]> {
		if (reportIds.length === 0) return [];

		return prisma.$queryRaw<SubscriptionRow[]>`
			SELECT report_id, recipient_email, event_type, enabled
			FROM report_notification_subscriptions
			WHERE recipient_email = ${recipientEmail}
			  AND channel = ${NOTIFICATION_CHANNEL}
			  AND report_id = ANY(${reportIds})
			  AND enabled = true
		`;
	}

	/** Every enabled subscription row for a report, across all recipients — for the "manage recipients" list. */
	static async findEnabledForReport(
		reportId: number,
	): Promise<SubscriptionRow[]> {
		return prisma.$queryRaw<SubscriptionRow[]>`
			SELECT report_id, recipient_email, event_type, enabled
			FROM report_notification_subscriptions
			WHERE report_id = ${reportId}
			  AND channel = ${NOTIFICATION_CHANNEL}
			  AND enabled = true
		`;
	}

	/** Upserts one row per given event; existing rows are re-enabled/disabled in place. */
	static async setEvents(
		reportId: number,
		recipientEmail: string,
		eventTypes: ReportNotificationEvent[],
		enabled: boolean,
	): Promise<void> {
		if (eventTypes.length === 0) return;

		await prisma.$executeRaw`
			INSERT INTO report_notification_subscriptions
				(report_id, recipient_email, event_type, channel, enabled)
			SELECT ${reportId}, ${recipientEmail}, event_type, ${NOTIFICATION_CHANNEL}, ${enabled}
			FROM unnest(${eventTypes}::text[]) AS event_type
			ON CONFLICT (report_id, recipient_email, event_type, channel)
			DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()
		`;
	}

	static async setAllEvents(
		reportId: number,
		recipientEmail: string,
		enabled: boolean,
	): Promise<void> {
		await ReportNotificationsRepository.setEvents(
			reportId,
			recipientEmail,
			[...REPORT_NOTIFICATION_EVENTS],
			enabled,
		);
	}

	/** Every (report_id, event_type) pair with an active subscription, for the enqueue pass. */
	static async findActiveByEvent(
		eventType: ReportNotificationEvent,
	): Promise<SubscriptionRow[]> {
		return prisma.$queryRaw<SubscriptionRow[]>`
			SELECT report_id, recipient_email, event_type, enabled
			FROM report_notification_subscriptions
			WHERE event_type = ${eventType}
			  AND channel = ${NOTIFICATION_CHANNEL}
			  AND enabled = true
		`;
	}
}
