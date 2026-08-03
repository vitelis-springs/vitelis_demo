/**
 * @jest-environment node
 *
 * E2E tests through the actual route handlers → controller → service chain.
 * The service is spied so we assert routing/validation without a database.
 */
import { NextRequest } from "next/server";

jest.mock("../../../src/lib/prisma", () => ({
	__esModule: true,
	default: {},
}));

jest.mock("../../../src/lib/auth", () => ({
	extractAdminFromRequest: jest.fn(() => ({
		success: true,
		user: { userId: "1", email: "Anna@Example.com", role: "admin" },
	})),
}));

import { GET as bulkGet } from "../../../src/app/api/sales-miner/reports/notification-subscriptions/me/route";
import {
	DELETE as reportDelete,
	GET as reportGet,
	POST as reportPost,
} from "../../../src/app/api/sales-miner/reports/[id]/notification-subscriptions/me/route";
import {
	DELETE as recipientsDelete,
	GET as recipientsGet,
	POST as recipientsPost,
} from "../../../src/app/api/sales-miner/reports/[id]/notification-subscriptions/route";
import { ReportNotificationsService } from "../../../src/app/server/modules/report-notifications";

function makeRequest(path: string): NextRequest {
	return new NextRequest(new URL(path, "http://localhost:3000"));
}

function makeJsonPost(path: string, body: unknown): NextRequest {
	return new NextRequest(new URL(path, "http://localhost:3000"), {
		method: "POST",
		body: JSON.stringify(body),
		headers: { "Content-Type": "application/json" },
	});
}

const EMPTY_STATE = {
	supported_events: ["REPORT_STARTED", "REPORT_COMPLETED", "REPORT_FAILED"],
	reports: {},
};

const EMPTY_RECIPIENTS = {
	report_id: 123,
	supported_events: ["REPORT_STARTED", "REPORT_COMPLETED", "REPORT_FAILED"],
	recipients: [],
};

beforeEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
});

describe("GET /notification-subscriptions/me (bulk)", () => {
	it("returns 400 for an empty report_ids list", async () => {
		const response = await bulkGet(
			makeRequest("/api/sales-miner/reports/notification-subscriptions/me"),
		);
		expect(response.status).toBe(400);
	});

	it("returns 404 with missing_ids when a requested report does not exist", async () => {
		jest
			.spyOn(ReportNotificationsService, "findExistingReportIds")
			.mockResolvedValue(new Set([1]));

		const response = await bulkGet(
			makeRequest(
				"/api/sales-miner/reports/notification-subscriptions/me?report_ids=1,2,3",
			),
		);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.missing_ids.sort()).toEqual([2, 3]);
	});

	it("returns subscription state for existing ids", async () => {
		jest
			.spyOn(ReportNotificationsService, "findExistingReportIds")
			.mockResolvedValue(new Set([1]));
		jest
			.spyOn(ReportNotificationsService, "getMySubscriptionState")
			.mockResolvedValue(EMPTY_STATE as never);

		const response = await bulkGet(
			makeRequest(
				"/api/sales-miner/reports/notification-subscriptions/me?report_ids=1",
			),
		);
		expect(response.status).toBe(200);
	});
});

describe("POST /reports/{id}/notification-subscriptions/me", () => {
	it("returns 404 when the report does not exist", async () => {
		jest
			.spyOn(ReportNotificationsService, "findExistingReportIds")
			.mockResolvedValue(new Set());

		const response = await reportPost(
			makeRequest("/api/sales-miner/reports/999/notification-subscriptions/me"),
			{ params: Promise.resolve({ id: "999" }) },
		);
		expect(response.status).toBe(404);
	});

	it("subscribes the current JWT email to all supported events", async () => {
		jest
			.spyOn(ReportNotificationsService, "findExistingReportIds")
			.mockResolvedValue(new Set([123]));
		const subscribeAll = jest
			.spyOn(ReportNotificationsService, "subscribeAll")
			.mockResolvedValue(undefined);
		jest
			.spyOn(ReportNotificationsService, "getMySubscriptionState")
			.mockResolvedValue(EMPTY_STATE as never);

		const response = await reportPost(
			makeRequest("/api/sales-miner/reports/123/notification-subscriptions/me"),
			{ params: Promise.resolve({ id: "123" }) },
		);

		expect(response.status).toBe(200);
		expect(subscribeAll).toHaveBeenCalledWith(123, "Anna@Example.com");
	});

	it("subscribes to a single event when event_type is given, without touching the others", async () => {
		jest
			.spyOn(ReportNotificationsService, "findExistingReportIds")
			.mockResolvedValue(new Set([123]));
		const setEventSubscription = jest
			.spyOn(ReportNotificationsService, "setEventSubscription")
			.mockResolvedValue(undefined);
		const subscribeAll = jest.spyOn(ReportNotificationsService, "subscribeAll");
		jest
			.spyOn(ReportNotificationsService, "getMySubscriptionState")
			.mockResolvedValue(EMPTY_STATE as never);

		const response = await reportPost(
			makeJsonPost(
				"/api/sales-miner/reports/123/notification-subscriptions/me",
				{ event_type: "REPORT_FAILED" },
			),
			{ params: Promise.resolve({ id: "123" }) },
		);

		expect(response.status).toBe(200);
		expect(setEventSubscription).toHaveBeenCalledWith(
			123,
			"Anna@Example.com",
			"REPORT_FAILED",
			true,
		);
		expect(subscribeAll).not.toHaveBeenCalled();
	});

	it("returns 400 for an unknown event_type", async () => {
		const response = await reportPost(
			makeJsonPost(
				"/api/sales-miner/reports/123/notification-subscriptions/me",
				{ event_type: "REPORT_QUEUED" },
			),
			{ params: Promise.resolve({ id: "123" }) },
		);
		expect(response.status).toBe(400);
	});
});

describe("DELETE /reports/{id}/notification-subscriptions/me", () => {
	it("unsubscribes a single event when event_type is given", async () => {
		jest
			.spyOn(ReportNotificationsService, "findExistingReportIds")
			.mockResolvedValue(new Set([123]));
		const setEventSubscription = jest
			.spyOn(ReportNotificationsService, "setEventSubscription")
			.mockResolvedValue(undefined);
		jest
			.spyOn(ReportNotificationsService, "getMySubscriptionState")
			.mockResolvedValue(EMPTY_STATE as never);

		const response = await reportDelete(
			makeRequest(
				"/api/sales-miner/reports/123/notification-subscriptions/me?event_type=REPORT_STARTED",
			),
			{ params: Promise.resolve({ id: "123" }) },
		);

		expect(response.status).toBe(200);
		expect(setEventSubscription).toHaveBeenCalledWith(
			123,
			"Anna@Example.com",
			"REPORT_STARTED",
			false,
		);
	});

	it("returns 400 for an unknown event_type", async () => {
		const response = await reportDelete(
			makeRequest(
				"/api/sales-miner/reports/123/notification-subscriptions/me?event_type=bogus",
			),
			{ params: Promise.resolve({ id: "123" }) },
		);
		expect(response.status).toBe(400);
	});

	it("unsubscribes the current JWT email from all supported events", async () => {
		jest
			.spyOn(ReportNotificationsService, "findExistingReportIds")
			.mockResolvedValue(new Set([123]));
		const unsubscribeAll = jest
			.spyOn(ReportNotificationsService, "unsubscribeAll")
			.mockResolvedValue(undefined);
		jest
			.spyOn(ReportNotificationsService, "getMySubscriptionState")
			.mockResolvedValue(EMPTY_STATE as never);

		const response = await reportDelete(
			makeRequest("/api/sales-miner/reports/123/notification-subscriptions/me"),
			{ params: Promise.resolve({ id: "123" }) },
		);

		expect(response.status).toBe(200);
		expect(unsubscribeAll).toHaveBeenCalledWith(123, "Anna@Example.com");
	});
});

describe("GET /reports/{id}/notification-subscriptions/me", () => {
	it("returns 400 for a non-numeric id", async () => {
		const response = await reportGet(
			makeRequest(
				"/api/sales-miner/reports/not-a-number/notification-subscriptions/me",
			),
			{ params: Promise.resolve({ id: "not-a-number" }) },
		);
		expect(response.status).toBe(400);
	});
});

describe("GET /reports/{id}/notification-subscriptions (all recipients)", () => {
	it("returns 404 when the report does not exist", async () => {
		jest
			.spyOn(ReportNotificationsService, "findExistingReportIds")
			.mockResolvedValue(new Set());

		const response = await recipientsGet(
			makeRequest("/api/sales-miner/reports/123/notification-subscriptions"),
			{ params: Promise.resolve({ id: "123" }) },
		);
		expect(response.status).toBe(404);
	});

	it("returns the recipients list for an existing report", async () => {
		jest
			.spyOn(ReportNotificationsService, "findExistingReportIds")
			.mockResolvedValue(new Set([123]));
		jest
			.spyOn(ReportNotificationsService, "listRecipients")
			.mockResolvedValue(EMPTY_RECIPIENTS as never);

		const response = await recipientsGet(
			makeRequest("/api/sales-miner/reports/123/notification-subscriptions"),
			{ params: Promise.resolve({ id: "123" }) },
		);
		expect(response.status).toBe(200);
	});
});

describe("POST /reports/{id}/notification-subscriptions (add recipient)", () => {
	it("returns 400 for an invalid email, without touching the report", async () => {
		const findExistingReportIds = jest.spyOn(
			ReportNotificationsService,
			"findExistingReportIds",
		);

		const response = await recipientsPost(
			makeJsonPost("/api/sales-miner/reports/123/notification-subscriptions", {
				recipient_email: "not-an-email",
			}),
			{ params: Promise.resolve({ id: "123" }) },
		);

		expect(response.status).toBe(400);
		expect(findExistingReportIds).not.toHaveBeenCalled();
	});

	it("returns 404 when the report does not exist", async () => {
		jest
			.spyOn(ReportNotificationsService, "findExistingReportIds")
			.mockResolvedValue(new Set());

		const response = await recipientsPost(
			makeJsonPost("/api/sales-miner/reports/999/notification-subscriptions", {
				recipient_email: "someone@example.com",
			}),
			{ params: Promise.resolve({ id: "999" }) },
		);
		expect(response.status).toBe(404);
	});

	it("subscribes the given email to all supported events", async () => {
		jest
			.spyOn(ReportNotificationsService, "findExistingReportIds")
			.mockResolvedValue(new Set([123]));
		const subscribeAll = jest
			.spyOn(ReportNotificationsService, "subscribeAll")
			.mockResolvedValue(undefined);
		jest
			.spyOn(ReportNotificationsService, "listRecipients")
			.mockResolvedValue(EMPTY_RECIPIENTS as never);

		const response = await recipientsPost(
			makeJsonPost("/api/sales-miner/reports/123/notification-subscriptions", {
				recipient_email: "Someone@Example.com",
			}),
			{ params: Promise.resolve({ id: "123" }) },
		);

		expect(response.status).toBe(200);
		expect(subscribeAll).toHaveBeenCalledWith(123, "Someone@Example.com");
	});

	it("subscribes the given email to a single event when event_type is given", async () => {
		jest
			.spyOn(ReportNotificationsService, "findExistingReportIds")
			.mockResolvedValue(new Set([123]));
		const setEventSubscription = jest
			.spyOn(ReportNotificationsService, "setEventSubscription")
			.mockResolvedValue(undefined);
		const subscribeAll = jest.spyOn(ReportNotificationsService, "subscribeAll");
		jest
			.spyOn(ReportNotificationsService, "listRecipients")
			.mockResolvedValue(EMPTY_RECIPIENTS as never);

		const response = await recipientsPost(
			makeJsonPost("/api/sales-miner/reports/123/notification-subscriptions", {
				recipient_email: "someone@example.com",
				event_type: "REPORT_COMPLETED",
			}),
			{ params: Promise.resolve({ id: "123" }) },
		);

		expect(response.status).toBe(200);
		expect(setEventSubscription).toHaveBeenCalledWith(
			123,
			"someone@example.com",
			"REPORT_COMPLETED",
			true,
		);
		expect(subscribeAll).not.toHaveBeenCalled();
	});

	it("returns 400 for an unknown event_type", async () => {
		const response = await recipientsPost(
			makeJsonPost("/api/sales-miner/reports/123/notification-subscriptions", {
				recipient_email: "someone@example.com",
				event_type: "REPORT_QUEUED",
			}),
			{ params: Promise.resolve({ id: "123" }) },
		);
		expect(response.status).toBe(400);
	});
});

describe("DELETE /reports/{id}/notification-subscriptions (remove recipient)", () => {
	it("returns 400 for an invalid/missing email", async () => {
		const response = await recipientsDelete(
			makeRequest("/api/sales-miner/reports/123/notification-subscriptions"),
			{ params: Promise.resolve({ id: "123" }) },
		);
		expect(response.status).toBe(400);
	});

	it("returns 400 for an unknown event_type", async () => {
		const response = await recipientsDelete(
			makeRequest(
				"/api/sales-miner/reports/123/notification-subscriptions?recipient_email=someone%40example.com&event_type=bogus",
			),
			{ params: Promise.resolve({ id: "123" }) },
		);
		expect(response.status).toBe(400);
	});

	it("unsubscribes a single event when event_type is given", async () => {
		jest
			.spyOn(ReportNotificationsService, "findExistingReportIds")
			.mockResolvedValue(new Set([123]));
		const setEventSubscription = jest
			.spyOn(ReportNotificationsService, "setEventSubscription")
			.mockResolvedValue(undefined);
		jest
			.spyOn(ReportNotificationsService, "listRecipients")
			.mockResolvedValue(EMPTY_RECIPIENTS as never);

		const response = await recipientsDelete(
			makeRequest(
				"/api/sales-miner/reports/123/notification-subscriptions?recipient_email=someone%40example.com&event_type=REPORT_FAILED",
			),
			{ params: Promise.resolve({ id: "123" }) },
		);

		expect(response.status).toBe(200);
		expect(setEventSubscription).toHaveBeenCalledWith(
			123,
			"someone@example.com",
			"REPORT_FAILED",
			false,
		);
	});

	it("unsubscribes the given email from all supported events", async () => {
		jest
			.spyOn(ReportNotificationsService, "findExistingReportIds")
			.mockResolvedValue(new Set([123]));
		const unsubscribeAll = jest
			.spyOn(ReportNotificationsService, "unsubscribeAll")
			.mockResolvedValue(undefined);
		jest
			.spyOn(ReportNotificationsService, "listRecipients")
			.mockResolvedValue(EMPTY_RECIPIENTS as never);

		const response = await recipientsDelete(
			makeRequest(
				"/api/sales-miner/reports/123/notification-subscriptions?recipient_email=someone%40example.com",
			),
			{ params: Promise.resolve({ id: "123" }) },
		);

		expect(response.status).toBe(200);
		expect(unsubscribeAll).toHaveBeenCalledWith(123, "someone@example.com");
	});
});
