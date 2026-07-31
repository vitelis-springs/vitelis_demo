/**
 * @jest-environment node
 *
 * Raw-SQL queries can't be exercised without a real database. These are
 * smoke tests: they assert the atomic claim query is actually atomic
 * (FOR UPDATE SKIP LOCKED) and that markFailed's retry-vs-give-up decision
 * lands on the right status literal.
 */
jest.mock("../../../src/lib/prisma", () => ({
	__esModule: true,
	default: {
		$queryRaw: jest.fn().mockResolvedValue([]),
		$executeRaw: jest.fn().mockResolvedValue(0),
	},
}));

import prisma from "../../../src/lib/prisma";
import {
	MAX_DELIVERY_ATTEMPTS,
	NotificationDeliveriesRepository,
} from "../../../src/app/server/modules/report-notifications/notification-deliveries.repository";

function lastQuerySql(): string {
	const mock = prisma.$queryRaw as jest.Mock;
	const strings = mock.mock.calls[
		mock.mock.calls.length - 1
	][0] as TemplateStringsArray;
	return strings.join("");
}

function lastExecuteCall(): { sql: string; values: unknown[] } {
	const mock = prisma.$executeRaw as jest.Mock;
	const call = mock.mock.calls[mock.mock.calls.length - 1] as [
		TemplateStringsArray,
		...unknown[],
	];
	return { sql: call[0].join(""), values: call.slice(1) };
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("claimPending", () => {
	it("atomically claims and flips rows to processing under lock", async () => {
		await NotificationDeliveriesRepository.claimPending(10);
		const sql = lastQuerySql();

		expect(sql).toContain("FOR UPDATE SKIP LOCKED");
		expect(sql).toContain("SET status = 'processing'");
		expect(sql).toContain("attempt_count = attempt_count + 1");
		expect(sql).toContain("WHERE status = 'pending'");
	});

	it("computes retry eligibility from last_attempt_at instead of a stored column", async () => {
		await NotificationDeliveriesRepository.claimPending(10);
		const sql = lastQuerySql();

		expect(sql).toContain("last_attempt_at IS NULL");
		expect(sql).toContain("CASE attempt_count");
	});
});

describe("markFailed", () => {
	it("returns the delivery to pending when attempts remain", async () => {
		await NotificationDeliveriesRepository.markFailed(
			BigInt(1),
			"boom",
			MAX_DELIVERY_ATTEMPTS - 1,
		);
		const { sql, values } = lastExecuteCall();

		expect(sql).toContain("SET status =");
		expect(values).toContain("pending");
	});

	it("permanently fails the delivery once attempts are exhausted", async () => {
		await NotificationDeliveriesRepository.markFailed(
			BigInt(2),
			"boom",
			MAX_DELIVERY_ATTEMPTS,
		);
		const { values } = lastExecuteCall();

		expect(values).toContain("failed");
	});
});

describe("resetForReport", () => {
	it("deletes every delivery for the report regardless of status", async () => {
		await NotificationDeliveriesRepository.resetForReport(123);
		const { sql, values } = lastExecuteCall();

		expect(sql).toContain("DELETE FROM notification_deliveries");
		expect(sql).toContain("WHERE report_id =");
		expect(values).toContain(123);
	});
});
