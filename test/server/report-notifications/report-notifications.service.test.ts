/**
 * @jest-environment node
 *
 * Repositories are spied so we assert service-level behavior (fully_subscribed
 * calculation, dedupe/payload shape, dispatch transitions) without a database.
 */
jest.mock("../../../src/lib/prisma", () => ({
	__esModule: true,
	default: { reports: { findMany: jest.fn() } },
}));

import prisma from "../../../src/lib/prisma";
import { NotificationDeliveriesRepository } from "../../../src/app/server/modules/report-notifications/notification-deliveries.repository";
import type { NewDeliveryRow } from "../../../src/app/server/modules/report-notifications/notification-deliveries.repository";
import { ReportNotificationConditionsRepository } from "../../../src/app/server/modules/report-notifications/report-notification-conditions.repository";
import { ReportNotificationsRepository } from "../../../src/app/server/modules/report-notifications/report-notifications.repository";
import { ReportNotificationsService } from "../../../src/app/server/modules/report-notifications/report-notifications.service";
import type { SubscriptionStateResponse } from "../../../src/app/server/modules/report-notifications/report-notifications.service";

function reportState(result: SubscriptionStateResponse, reportId: number) {
	const report = result.reports[String(reportId)];
	if (!report) throw new Error(`missing report ${reportId} in response`);
	return report;
}

function mock<
	M extends
		| typeof ReportNotificationsRepository
		| typeof NotificationDeliveriesRepository
		| typeof ReportNotificationConditionsRepository,
	K extends keyof M,
>(module: M, method: K, value: unknown) {
	return jest.spyOn(module, method as never).mockResolvedValue(value as never);
}

const ORIGINAL_ENV = process.env.N8N_NOTIFICATION_WEBHOOK_URL;

beforeEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
});

afterAll(() => {
	process.env.N8N_NOTIFICATION_WEBHOOK_URL = ORIGINAL_ENV;
});

describe("getMySubscriptionState", () => {
	it("normalizes the recipient email", async () => {
		mock(ReportNotificationsRepository, "findEnabledSubscriptions", []);
		const result = await ReportNotificationsService.getMySubscriptionState(
			[1],
			"  Anna@Example.COM  ",
		);
		expect(reportState(result, 1).recipient_email).toBe("anna@example.com");
	});

	it("is fully_subscribed only when every supported event is enabled", async () => {
		mock(ReportNotificationsRepository, "findEnabledSubscriptions", [
			{
				report_id: 1,
				recipient_email: "a@b.com",
				event_type: "REPORT_STARTED",
				enabled: true,
			},
			{
				report_id: 1,
				recipient_email: "a@b.com",
				event_type: "REPORT_COMPLETED",
				enabled: true,
			},
			// REPORT_FAILED missing
		]);

		const result = await ReportNotificationsService.getMySubscriptionState(
			[1],
			"a@b.com",
		);
		expect(reportState(result, 1).fully_subscribed).toBe(false);
		expect(reportState(result, 1).events).toMatchObject({
			REPORT_STARTED: true,
			REPORT_COMPLETED: true,
			REPORT_FAILED: false,
		});
	});

	it("is fully_subscribed when all three events are enabled", async () => {
		mock(
			ReportNotificationsRepository,
			"findEnabledSubscriptions",
			["REPORT_STARTED", "REPORT_COMPLETED", "REPORT_FAILED"].map(
				(event_type) => ({
					report_id: 1,
					recipient_email: "a@b.com",
					event_type,
					enabled: true,
				}),
			),
		);

		const result = await ReportNotificationsService.getMySubscriptionState(
			[1],
			"a@b.com",
		);
		expect(reportState(result, 1).fully_subscribed).toBe(true);
	});
});

describe("listRecipients", () => {
	it("groups rows by recipient and computes fully_subscribed per recipient", async () => {
		mock(ReportNotificationsRepository, "findEnabledForReport", [
			{
				report_id: 1,
				recipient_email: "a@b.com",
				event_type: "REPORT_STARTED",
				enabled: true,
			},
			{
				report_id: 1,
				recipient_email: "a@b.com",
				event_type: "REPORT_COMPLETED",
				enabled: true,
			},
			{
				report_id: 1,
				recipient_email: "a@b.com",
				event_type: "REPORT_FAILED",
				enabled: true,
			},
			{
				report_id: 1,
				recipient_email: "c@d.com",
				event_type: "REPORT_STARTED",
				enabled: true,
			},
		]);

		const result = await ReportNotificationsService.listRecipients(1);

		expect(result.report_id).toBe(1);
		expect(result.recipients).toHaveLength(2);
		// Sorted alphabetically by email.
		expect(result.recipients[0]).toMatchObject({
			recipient_email: "a@b.com",
			fully_subscribed: true,
		});
		expect(result.recipients[1]).toMatchObject({
			recipient_email: "c@d.com",
			fully_subscribed: false,
			events: {
				REPORT_STARTED: true,
				REPORT_COMPLETED: false,
				REPORT_FAILED: false,
			},
		});
	});

	it("is empty when nobody is subscribed", async () => {
		mock(ReportNotificationsRepository, "findEnabledForReport", []);
		const result = await ReportNotificationsService.listRecipients(1);
		expect(result.recipients).toEqual([]);
	});
});

describe("subscribeAll / unsubscribeAll", () => {
	it("enables all supported events on subscribe", async () => {
		const setAllEvents = mock(
			ReportNotificationsRepository,
			"setAllEvents",
			undefined,
		);
		await ReportNotificationsService.subscribeAll(123, "Anna@Example.com");
		expect(setAllEvents).toHaveBeenCalledWith(123, "anna@example.com", true);
	});

	it("disables all supported events on unsubscribe", async () => {
		const setAllEvents = mock(
			ReportNotificationsRepository,
			"setAllEvents",
			undefined,
		);
		await ReportNotificationsService.unsubscribeAll(123, "Anna@Example.com");
		expect(setAllEvents).toHaveBeenCalledWith(123, "anna@example.com", false);
	});
});

describe("setEventSubscription", () => {
	it("normalizes the email and touches only the given event", async () => {
		const setEvents = mock(
			ReportNotificationsRepository,
			"setEvents",
			undefined,
		);
		await ReportNotificationsService.setEventSubscription(
			123,
			"Anna@Example.com",
			"REPORT_FAILED",
			true,
		);
		expect(setEvents).toHaveBeenCalledWith(
			123,
			"anna@example.com",
			["REPORT_FAILED"],
			true,
		);
	});

	it("can disable a single event", async () => {
		const setEvents = mock(
			ReportNotificationsRepository,
			"setEvents",
			undefined,
		);
		await ReportNotificationsService.setEventSubscription(
			123,
			"anna@example.com",
			"REPORT_STARTED",
			false,
		);
		expect(setEvents).toHaveBeenCalledWith(
			123,
			"anna@example.com",
			["REPORT_STARTED"],
			false,
		);
	});
});

describe("findExistingReportIds", () => {
	it("returns the set of report ids that exist", async () => {
		(prisma.reports.findMany as jest.Mock).mockResolvedValue([
			{ id: 1 },
			{ id: 3 },
		]);
		const result = await ReportNotificationsService.findExistingReportIds([
			1, 2, 3,
		]);
		expect(result).toEqual(new Set([1, 3]));
	});
});

describe("enqueueDueReportEvents", () => {
	it("creates one delivery per due report x active subscriber, with dedupe key and n8n payload shape", async () => {
		mock(ReportNotificationConditionsRepository, "findStarted", []);
		mock(ReportNotificationConditionsRepository, "findFailed", []);
		mock(ReportNotificationConditionsRepository, "findCompleted", [
			{
				report_id: 123,
				report_name: "Korn Ferry Coaching",
				report_type: "sales_miner",
				status: "DONE",
			},
		]);
		mock(ReportNotificationsRepository, "findActiveByEvent", [
			{
				report_id: 123,
				recipient_email: "anna@example.com",
				event_type: "REPORT_COMPLETED",
				enabled: true,
			},
		]);
		const insertDue = mock(NotificationDeliveriesRepository, "insertDue", 1);

		await ReportNotificationsService.enqueueDueReportEvents();

		expect(insertDue).toHaveBeenCalledTimes(1);
		const call = insertDue.mock.calls[0];
		if (!call) throw new Error("expected insertDue to have been called");
		const rows = call[0] as NewDeliveryRow[];
		expect(rows).toHaveLength(1);
		const [row] = rows;
		if (!row) throw new Error("expected a row");
		expect(row).toMatchObject({
			reportId: 123,
			recipientEmail: "anna@example.com",
			eventType: "REPORT_COMPLETED",
			dedupeKey:
				"report:123:event:REPORT_COMPLETED:channel:email:recipient:anna@example.com",
		});
		expect(row.payload).toMatchObject({
			email: "anna@example.com",
			cc: "",
			event_type: "REPORT_COMPLETED",
			template_data: {
				report_id: 123,
				report_name: "Korn Ferry Coaching",
				report_type: "sales_miner",
				status: "DONE",
			},
		});
	});

	it("skips an event entirely when there are no due reports for it", async () => {
		mock(ReportNotificationConditionsRepository, "findStarted", []);
		mock(ReportNotificationConditionsRepository, "findFailed", []);
		mock(ReportNotificationConditionsRepository, "findCompleted", []);
		const findActiveByEvent = mock(
			ReportNotificationsRepository,
			"findActiveByEvent",
			[],
		);

		await ReportNotificationsService.enqueueDueReportEvents();
		expect(findActiveByEvent).not.toHaveBeenCalled();
	});
});

describe("dispatchPendingDeliveries", () => {
	afterEach(() => {
		delete (global as { fetch?: unknown }).fetch;
	});

	it("is a no-op when N8N_NOTIFICATION_WEBHOOK_URL is not set", async () => {
		delete process.env.N8N_NOTIFICATION_WEBHOOK_URL;
		const findPending = mock(
			NotificationDeliveriesRepository,
			"findPending",
			[],
		);

		const result = await ReportNotificationsService.dispatchPendingDeliveries();

		expect(findPending).not.toHaveBeenCalled();
		expect(result).toEqual({ dispatched: 0, failed: 0 });
	});

	it("marks a delivery dispatched when the webhook accepts it", async () => {
		process.env.N8N_NOTIFICATION_WEBHOOK_URL =
			"https://n8n.example.com/webhook";
		mock(NotificationDeliveriesRepository, "findPending", [
			{
				id: BigInt(1),
				report_id: 123,
				recipient_email: "anna@example.com",
				event_type: "REPORT_COMPLETED",
				payload: { email: "anna@example.com" },
				attempt_count: 0,
			},
		]);
		const markAttempted = mock(
			NotificationDeliveriesRepository,
			"markAttempted",
			undefined,
		);
		const markDispatched = mock(
			NotificationDeliveriesRepository,
			"markDispatched",
			undefined,
		);
		global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

		const result = await ReportNotificationsService.dispatchPendingDeliveries();

		expect(markAttempted).toHaveBeenCalledWith(BigInt(1));
		expect(markDispatched).toHaveBeenCalledWith(BigInt(1));
		expect(result).toEqual({ dispatched: 1, failed: 0 });
	});

	it("marks a delivery failed when the webhook request throws", async () => {
		process.env.N8N_NOTIFICATION_WEBHOOK_URL =
			"https://n8n.example.com/webhook";
		mock(NotificationDeliveriesRepository, "findPending", [
			{
				id: BigInt(2),
				report_id: 123,
				recipient_email: "anna@example.com",
				event_type: "REPORT_FAILED",
				payload: { email: "anna@example.com" },
				attempt_count: 0,
			},
		]);
		mock(NotificationDeliveriesRepository, "markAttempted", undefined);
		const markFailed = mock(
			NotificationDeliveriesRepository,
			"markFailed",
			undefined,
		);
		global.fetch = jest.fn().mockRejectedValue(new Error("network down"));

		const result = await ReportNotificationsService.dispatchPendingDeliveries();

		expect(markFailed).toHaveBeenCalledWith(BigInt(2), "network down");
		expect(result).toEqual({ dispatched: 0, failed: 1 });
	});

	it("marks a delivery failed when the webhook responds with a non-ok status", async () => {
		process.env.N8N_NOTIFICATION_WEBHOOK_URL =
			"https://n8n.example.com/webhook";
		mock(NotificationDeliveriesRepository, "findPending", [
			{
				id: BigInt(3),
				report_id: 123,
				recipient_email: "anna@example.com",
				event_type: "REPORT_STARTED",
				payload: { email: "anna@example.com" },
				attempt_count: 0,
			},
		]);
		mock(NotificationDeliveriesRepository, "markAttempted", undefined);
		const markFailed = mock(
			NotificationDeliveriesRepository,
			"markFailed",
			undefined,
		);
		global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

		const result = await ReportNotificationsService.dispatchPendingDeliveries();

		expect(markFailed).toHaveBeenCalledWith(
			BigInt(3),
			"n8n webhook responded with status 500",
		);
		expect(result).toEqual({ dispatched: 0, failed: 1 });
	});
});
