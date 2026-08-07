/**
 * @jest-environment node
 */
import { buildReportUrl } from "../../../src/app/server/modules/report-notifications/report-url";

const BASE_URL = "https://vitelis-demo.vercel.app";

describe("buildReportUrl", () => {
	it("resolves sales_miner", () => {
		expect(buildReportUrl(123, "sales_miner")).toBe(
			`${BASE_URL}/sales-miner/reports/123`,
		);
	});

	it("resolves biz_miner", () => {
		expect(buildReportUrl(5, "biz_miner")).toBe(`${BASE_URL}/biz-miner/5`);
	});

	it("resolves internal", () => {
		expect(buildReportUrl(7, "internal")).toBe(`${BASE_URL}/vitelis-sales/7`);
	});

	it("falls back to deep-dive for unknown types", () => {
		expect(buildReportUrl(9, "something_else")).toBe(`${BASE_URL}/deep-dive/9`);
	});

	it("falls back to deep-dive for null", () => {
		expect(buildReportUrl(9, null)).toBe(`${BASE_URL}/deep-dive/9`);
	});
});
