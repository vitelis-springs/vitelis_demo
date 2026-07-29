/**
 * @jest-environment node
 */
import { buildReportUrl } from "../../../src/app/server/modules/report-notifications/report-url";

const ORIGINAL_ENV = process.env.APP_BASE_URL;

beforeEach(() => {
	process.env.APP_BASE_URL = "https://app.example.com";
});

afterAll(() => {
	process.env.APP_BASE_URL = ORIGINAL_ENV;
});

describe("buildReportUrl", () => {
	it("resolves sales_miner", () => {
		expect(buildReportUrl(123, "sales_miner")).toBe(
			"https://app.example.com/sales-miner/reports/123",
		);
	});

	it("resolves biz_miner", () => {
		expect(buildReportUrl(5, "biz_miner")).toBe(
			"https://app.example.com/biz-miner/5",
		);
	});

	it("resolves internal", () => {
		expect(buildReportUrl(7, "internal")).toBe(
			"https://app.example.com/vitelis-sales/7",
		);
	});

	it("falls back to deep-dive for unknown types", () => {
		expect(buildReportUrl(9, "something_else")).toBe(
			"https://app.example.com/deep-dive/9",
		);
	});

	it("falls back to deep-dive for null", () => {
		expect(buildReportUrl(9, null)).toBe("https://app.example.com/deep-dive/9");
	});

	it("strips a trailing slash from APP_BASE_URL", () => {
		process.env.APP_BASE_URL = "https://app.example.com/";
		expect(buildReportUrl(1, "sales_miner")).toBe(
			"https://app.example.com/sales-miner/reports/1",
		);
	});
});
