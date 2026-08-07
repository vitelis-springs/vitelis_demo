/** biome-ignore-all lint/complexity/noStaticOnlyClass: Service methods are grouped statically to match existing module conventions. */
import prisma from "../../../../lib/prisma";
import { NotificationDeliveriesRepository } from "./notification-deliveries.repository";
import { ReportNotificationConditionsRepository } from "./report-notification-conditions.repository";
import { ReportNotificationsRepository } from "./report-notifications.repository";
import {
	buildDedupeKey,
	normalizeEmail,
	REPORT_NOTIFICATION_EVENTS,
	type ReportNotificationEvent,
} from "./report-notifications.constants";
import { buildReportUrl } from "./report-url";

export interface ReportSubscriptionState {
	report_id: number;
	recipient_email: string;
	fully_subscribed: boolean;
	events: Record<ReportNotificationEvent, boolean>;
}

export interface SubscriptionStateResponse {
	supported_events: readonly ReportNotificationEvent[];
	reports: Record<string, ReportSubscriptionState>;
}

export interface RecipientSubscriptionState {
	recipient_email: string;
	fully_subscribed: boolean;
	events: Record<ReportNotificationEvent, boolean>;
}

export interface ReportRecipientsResponse {
	report_id: number;
	supported_events: readonly ReportNotificationEvent[];
	recipients: RecipientSubscriptionState[];
}

function buildEventState(enabledEvents: Set<string>): {
	fully_subscribed: boolean;
	events: Record<ReportNotificationEvent, boolean>;
} {
	const events = Object.fromEntries(
		REPORT_NOTIFICATION_EVENTS.map((eventType) => [
			eventType,
			enabledEvents.has(eventType),
		]),
	) as Record<ReportNotificationEvent, boolean>;

	return {
		fully_subscribed: REPORT_NOTIFICATION_EVENTS.every(
			(eventType) => events[eventType],
		),
		events,
	};
}

export class ReportNotificationsService {
	static async findExistingReportIds(
		reportIds: number[],
	): Promise<Set<number>> {
		if (reportIds.length === 0) return new Set();
		const rows = await prisma.reports.findMany({
			where: { id: { in: reportIds } },
			select: { id: true },
		});
		return new Set(rows.map((row) => row.id));
	}

	static async getMySubscriptionState(
		reportIds: number[],
		rawEmail: string,
	): Promise<SubscriptionStateResponse> {
		const recipientEmail = normalizeEmail(rawEmail);
		const uniqueIds = Array.from(new Set(reportIds));
		const enabledRows =
			await ReportNotificationsRepository.findEnabledSubscriptions(
				uniqueIds,
				recipientEmail,
			);

		const enabledByReport = new Map<number, Set<string>>();
		for (const row of enabledRows) {
			const set = enabledByReport.get(row.report_id) ?? new Set<string>();
			set.add(row.event_type);
			enabledByReport.set(row.report_id, set);
		}

		const reports: Record<string, ReportSubscriptionState> = {};
		for (const reportId of uniqueIds) {
			const enabledEvents = enabledByReport.get(reportId) ?? new Set<string>();
			reports[String(reportId)] = {
				report_id: reportId,
				recipient_email: recipientEmail,
				...buildEventState(enabledEvents),
			};
		}

		return { supported_events: REPORT_NOTIFICATION_EVENTS, reports };
	}

	/** Every recipient currently subscribed to at least one event on a report — for the "manage recipients" UI. */
	static async listRecipients(
		reportId: number,
	): Promise<ReportRecipientsResponse> {
		const rows =
			await ReportNotificationsRepository.findEnabledForReport(reportId);

		const enabledByEmail = new Map<string, Set<string>>();
		for (const row of rows) {
			const set = enabledByEmail.get(row.recipient_email) ?? new Set<string>();
			set.add(row.event_type);
			enabledByEmail.set(row.recipient_email, set);
		}

		const recipients = Array.from(enabledByEmail.entries())
			.map(([recipient_email, enabledEvents]) => ({
				recipient_email,
				...buildEventState(enabledEvents),
			}))
			.sort((a, b) => a.recipient_email.localeCompare(b.recipient_email));

		return {
			report_id: reportId,
			supported_events: REPORT_NOTIFICATION_EVENTS,
			recipients,
		};
	}

	static async subscribeAll(reportId: number, rawEmail: string): Promise<void> {
		await ReportNotificationsRepository.setAllEvents(
			reportId,
			normalizeEmail(rawEmail),
			true,
		);
	}

	static async unsubscribeAll(
		reportId: number,
		rawEmail: string,
	): Promise<void> {
		await ReportNotificationsRepository.setAllEvents(
			reportId,
			normalizeEmail(rawEmail),
			false,
		);
	}

	/** Turns a single event on/off for one recipient, leaving their other events untouched. */
	static async setEventSubscription(
		reportId: number,
		rawEmail: string,
		eventType: ReportNotificationEvent,
		enabled: boolean,
	): Promise<void> {
		await ReportNotificationsRepository.setEvents(
			reportId,
			normalizeEmail(rawEmail),
			[eventType],
			enabled,
		);
	}

	/** Enqueues one pending delivery per (due report, active subscriber, event). */
	static async enqueueDueReportEvents(): Promise<number> {
		const byEvent: Record<
			ReportNotificationEvent,
			Awaited<
				ReturnType<typeof ReportNotificationConditionsRepository.findStarted>
			>
		> = {
			REPORT_STARTED:
				await ReportNotificationConditionsRepository.findStarted(),
			REPORT_COMPLETED:
				await ReportNotificationConditionsRepository.findCompleted(),
			REPORT_FAILED: await ReportNotificationConditionsRepository.findFailed(),
		};

		let totalInserted = 0;

		for (const eventType of REPORT_NOTIFICATION_EVENTS) {
			const dueReports = byEvent[eventType];
			if (dueReports.length === 0) continue;

			const subscriptions =
				await ReportNotificationsRepository.findActiveByEvent(eventType);
			if (subscriptions.length === 0) continue;

			const subscribersByReport = new Map<number, string[]>();
			for (const sub of subscriptions) {
				const list = subscribersByReport.get(sub.report_id) ?? [];
				list.push(sub.recipient_email);
				subscribersByReport.set(sub.report_id, list);
			}

			const rows = dueReports.flatMap((report) => {
				const recipients = subscribersByReport.get(report.report_id) ?? [];
				return recipients.map((recipientEmail) => ({
					reportId: report.report_id,
					recipientEmail,
					eventType,
					dedupeKey: buildDedupeKey({
						reportId: report.report_id,
						eventType,
						recipientEmail,
					}),
					payload: {
						email: recipientEmail,
						cc: "",
						event_type: eventType,
						template_data: {
							report_id: report.report_id,
							report_name: report.report_name,
							report_type: report.report_type,
							report_url: buildReportUrl(report.report_id, report.report_type),
							status: report.status,
							occurred_at: new Date().toISOString(),
						},
					},
				}));
			});

			if (rows.length === 0) continue;
			totalInserted += await NotificationDeliveriesRepository.insertDue(rows);
		}

		return totalInserted;
	}

	/** Passes pending deliveries to n8n. Does not wait for final email delivery. */
	static async dispatchPendingDeliveries(limit = 100): Promise<{
		dispatched: number;
		failed: number;
	}> {
		const webhookUrl = process.env.N8N_NOTIFICATION_WEBHOOK_URL;
		if (!webhookUrl) return { dispatched: 0, failed: 0 };

		const claimed = await NotificationDeliveriesRepository.claimPending(limit);
		let dispatched = 0;
		let failed = 0;

		for (const delivery of claimed) {
			try {
				const response = await fetch(webhookUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(delivery.payload),
				});
				if (!response.ok) {
					throw new Error(
						`n8n webhook responded with status ${response.status}`,
					);
				}
				await NotificationDeliveriesRepository.markDispatched(delivery.id);
				dispatched += 1;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				await NotificationDeliveriesRepository.markFailed(
					delivery.id,
					message,
					delivery.attempt_count,
				);
				failed += 1;
			}
		}

		return { dispatched, failed };
	}

	static async runNotificationCronOnce(): Promise<void> {
		if (process.env.NOTIFICATIONS_SCHEDULER_ENABLED !== "true") {
			console.log(
				"[NotificationScheduler] disabled: NOTIFICATIONS_SCHEDULER_ENABLED is not set to true",
			);
			return;
		}

		await ReportNotificationsService.enqueueDueReportEvents();
		await ReportNotificationsService.dispatchPendingDeliveries();
	}
}
