/**
 * @jest-environment node
 *
 * Raw-SQL queries can't be exercised without a real database. These are
 * smoke tests: they assert each query is wired to the right orchestrator
 * status literal and join shape, so a typo in the SQL fails loudly instead
 * of silently matching zero (or every) report.
 */
jest.mock("../../../src/lib/prisma", () => ({
	__esModule: true,
	default: { $queryRaw: jest.fn().mockResolvedValue([]) },
}));

import prisma from "../../../src/lib/prisma";
import { ReportNotificationConditionsRepository } from "../../../src/app/server/modules/report-notifications/report-notification-conditions.repository";

function lastQuerySql(): string {
	const mock = prisma.$queryRaw as jest.Mock;
	const strings = mock.mock.calls[
		mock.mock.calls.length - 1
	][0] as TemplateStringsArray;
	return strings.join("");
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("findStarted", () => {
	it("queries orchestrator status PROCESSING", async () => {
		await ReportNotificationConditionsRepository.findStarted();
		expect(lastQuerySql()).toContain("ro.status = 'PROCESSING'");
	});
});

describe("findFailed", () => {
	it("only needs orchestrator status ERROR", async () => {
		await ReportNotificationConditionsRepository.findFailed();
		const sql = lastQuerySql();
		expect(sql).toContain("ro.status = 'ERROR'");
		expect(sql).not.toContain("report_step_statuses");
	});
});

describe("findCompleted", () => {
	it("requires orchestrator DONE and blocks on any missing/non-DONE cell", async () => {
		await ReportNotificationConditionsRepository.findCompleted();
		const sql = lastQuerySql();
		expect(sql).toContain("ro.status = 'DONE'");
		// Expected matrix is report_companies x report_steps for the report.
		expect(sql).toContain("report_companies");
		expect(sql).toContain("report_steps rs ON rs.report_id = rc.report_id");
		// A missing runtime row (rss.status IS NULL) blocks completion, same as a non-DONE row.
		expect(sql).toContain("rss.status IS NULL OR rss.status <> 'DONE'");
		expect(sql).toContain("NOT IN (SELECT report_id FROM incomplete_reports)");
	});
});
