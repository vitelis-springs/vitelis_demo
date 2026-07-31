/**
 * @jest-environment node
 */
import {
	buildDedupeKey,
	isReportNotificationEvent,
	isValidEmail,
	normalizeEmail,
	REPORT_NOTIFICATION_EVENTS,
} from "../../../src/app/server/modules/report-notifications/report-notifications.constants";

describe("normalizeEmail", () => {
	it("trims and lowercases", () => {
		expect(normalizeEmail("  Anna@Example.COM  ")).toBe("anna@example.com");
	});
});

describe("isReportNotificationEvent", () => {
	it("accepts every supported event", () => {
		for (const event of REPORT_NOTIFICATION_EVENTS) {
			expect(isReportNotificationEvent(event)).toBe(true);
		}
	});

	it("rejects unknown strings", () => {
		expect(isReportNotificationEvent("REPORT_QUEUED")).toBe(false);
	});
});

describe("isValidEmail", () => {
	it("accepts a well-formed address regardless of case/whitespace", () => {
		expect(isValidEmail("  Anna@Example.COM  ")).toBe(true);
	});

	it.each([
		"not-an-email",
		"missing-domain@",
		"@missing-local.com",
		"",
		"  ",
	])("rejects %p", (value) => {
		expect(isValidEmail(value)).toBe(false);
	});
});

describe("buildDedupeKey", () => {
	it("formats and normalizes the recipient email", () => {
		const key = buildDedupeKey({
			reportId: 123,
			eventType: "REPORT_COMPLETED",
			recipientEmail: "Anna@Example.com",
		});
		expect(key).toBe(
			"report:123:event:REPORT_COMPLETED:channel:email:recipient:anna@example.com",
		);
	});

	it("is stable for the same inputs", () => {
		const params = {
			reportId: 1,
			eventType: "REPORT_STARTED" as const,
			recipientEmail: "a@b.com",
		};
		expect(buildDedupeKey(params)).toBe(buildDedupeKey(params));
	});
});
