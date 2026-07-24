/**
 * @jest-environment node
 *
 * E2E tests for:
 *   GET /api/deep-dive/[id]/companies/[companyId]/opportunities/[oppId]
 *   PATCH /api/deep-dive/[id]/companies/[companyId]/opportunities/[oppId]/fields
 */
import { NextRequest } from "next/server";

jest.mock("../../../src/lib/prisma", () => ({
	__esModule: true,
	default: {},
}));

jest.mock("../../../src/lib/auth", () => ({
	extractAdminFromRequest: jest.fn(() => ({
		success: true,
		user: { userId: "1", email: "admin@test.com", role: "admin" },
	})),
}));

import { GET } from "../../../src/app/api/deep-dive/[id]/companies/[companyId]/opportunities/[oppId]/route";
import { PATCH } from "../../../src/app/api/deep-dive/[id]/companies/[companyId]/opportunities/[oppId]/fields/route";
import { DeepDiveRepository } from "../../../src/app/server/modules/deep-dive/deep-dive.repository";
import { extractAdminFromRequest } from "../../../src/lib/auth";

function makeRequest(
	path: string,
	body?: unknown,
	method = "GET",
): NextRequest {
	return new NextRequest(new URL(path, "http://localhost:3000"), {
		method,
		headers: body ? { "Content-Type": "application/json" } : undefined,
		body: body ? JSON.stringify(body) : undefined,
	});
}

function callGet(
	reportId = "171",
	companyId = "2929",
	oppId = "4395",
): Promise<Response> {
	return GET(
		makeRequest(
			`/api/deep-dive/${reportId}/companies/${companyId}/opportunities/${oppId}`,
		),
		{ params: Promise.resolve({ id: reportId, companyId, oppId }) },
	);
}

function callPatch(
	body: unknown,
	reportId = "171",
	companyId = "2929",
	oppId = "4395",
): Promise<Response> {
	return PATCH(
		makeRequest(
			`/api/deep-dive/${reportId}/companies/${companyId}/opportunities/${oppId}/fields`,
			body,
			"PATCH",
		),
		{ params: Promise.resolve({ id: reportId, companyId, oppId }) },
	);
}

const BASE_ROW = {
	id: BigInt(4395),
	title: "Original title",
	rank_position: 1,
	motion_family: "LAND",
	stage: "discovery",
	status: "candidate",
	deal_size_general: "50k-250k equivalent",
	horizon_name: "Near term",
	priority_score: 84,
	confidence_score: 0.82,
	is_approved: true,
	company_name: "Welltower Inc.",
	company_logo_url: "https://cdn.example.com/welltower.png",
	primary_business_problem: "Base business problem",
	primary_value_proposition: "Base value proposition",
	why_now: "Base why now",
	notes: "Base notes",
	competitive_awareness: { status: "confirmed" },
};

const PROPERTY_ROWS = [
	{
		property_key: "primaryProblem",
		property_group: "narrative",
		kind: "simple",
		preferred_shape: null,
		value_json: "Deep primary problem",
		status: "succeeded",
		assemble_order: 10,
	},
	{
		property_key: "whyWeWin",
		property_group: "narrative",
		kind: "simple",
		preferred_shape: null,
		value_json: "Deep why we win",
		status: "succeeded",
		assemble_order: 20,
	},
	{
		property_key: "whatToOffer",
		property_group: "narrative",
		kind: "complex",
		preferred_shape: "object",
		value_json: { offering: "Modern Workforce" },
		status: "succeeded",
		assemble_order: 40,
	},
];

describe("E2E: opportunity detail read/edit", () => {
	beforeEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	it("returns 401 when auth fails", async () => {
		(extractAdminFromRequest as jest.Mock).mockReturnValueOnce({
			success: false,
			response: new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
			}),
		});

		const res = await callGet();
		expect(res.status).toBe(401);
	});

	it("returns editable base and deep-dive text fields plus read-only structured blocks", async () => {
		jest
			.spyOn(DeepDiveRepository, "getOpportunityDetailBase")
			.mockResolvedValueOnce(BASE_ROW as never);
		jest
			.spyOn(DeepDiveRepository, "getOpportunityDeepDiveProperties")
			.mockResolvedValueOnce(PROPERTY_ROWS as never);
		jest
			.spyOn(DeepDiveRepository, "getOpportunityStakeholders")
			.mockResolvedValueOnce([] as never);

		const res = await callGet();
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.data.opportunityId).toBe("4395");
		expect(body.data.companyLogoUrl).toBe(
			"https://cdn.example.com/welltower.png",
		);
		expect(body.data.baseFields).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					source: "base",
					field: "title",
					value: "Original title",
				}),
			]),
		);
		expect(body.data.deepDiveFields).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					source: "deepDive",
					field: "primaryProblem",
					value: "Deep primary problem",
				}),
			]),
		);
		expect(
			body.data.deepDiveFields.map((field: { field: string }) => field.field),
		).toEqual(["primaryProblem", "whyWeWin"]);
		expect(body.data.structuredBlocks).toEqual([
			expect.objectContaining({
				key: "whatToOffer",
				value: { offering: "Modern Workforce" },
			}),
		]);
	});

	it("passes opportunity ids as bigint without safe-integer narrowing", async () => {
		const largeOpportunityId = "9007199254740993";
		const detailSpy = jest
			.spyOn(DeepDiveRepository, "getOpportunityDetailBase")
			.mockResolvedValueOnce({
				...BASE_ROW,
				id: BigInt(largeOpportunityId),
			} as never);
		jest
			.spyOn(DeepDiveRepository, "getOpportunityDeepDiveProperties")
			.mockResolvedValueOnce([] as never);
		jest
			.spyOn(DeepDiveRepository, "getOpportunityStakeholders")
			.mockResolvedValueOnce([] as never);

		const res = await callGet("171", "2929", largeOpportunityId);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.data.opportunityId).toBe(largeOpportunityId);
		expect(detailSpy).toHaveBeenCalledWith(
			171,
			2929,
			BigInt(largeOpportunityId),
		);
	});

	it("rejects invalid opportunity ids before repository lookup", async () => {
		const detailSpy = jest.spyOn(
			DeepDiveRepository,
			"getOpportunityDetailBase",
		);

		const res = await callGet("171", "2929", "4395abc");
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toMatch(/Invalid report, company, or opportunity id/);
		expect(detailSpy).not.toHaveBeenCalled();
	});

	it("returns 404 when the opportunity is outside the current report/company scope", async () => {
		jest
			.spyOn(DeepDiveRepository, "getOpportunityDetailBase")
			.mockResolvedValueOnce(null as never);

		const res = await callGet();
		const body = await res.json();

		expect(res.status).toBe(404);
		expect(body.error).toMatch(/Opportunity not found/);
	});

	it("rejects empty text values", async () => {
		jest
			.spyOn(DeepDiveRepository, "getOpportunityDetailBase")
			.mockResolvedValueOnce(BASE_ROW as never);

		const res = await callPatch({
			source: "base",
			field: "notes",
			value: "   ",
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toMatch(/cannot be empty/);
	});

	it("updates an allowlisted base field with trimmed text", async () => {
		jest
			.spyOn(DeepDiveRepository, "getOpportunityDetailBase")
			.mockResolvedValueOnce(BASE_ROW as never);
		const updateSpy = jest
			.spyOn(DeepDiveRepository, "updateOpportunityBaseTextField")
			.mockResolvedValueOnce(1);

		const res = await callPatch({
			source: "base",
			field: "primary_business_problem",
			value: "  Updated problem  ",
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.data.field.value).toBe("Updated problem");
		expect(updateSpy).toHaveBeenCalledWith(
			171,
			2929,
			BigInt(4395),
			"primary_business_problem",
			"Updated problem",
		);
	});

	it("updates an allowlisted deep-dive property row", async () => {
		jest
			.spyOn(DeepDiveRepository, "getOpportunityDetailBase")
			.mockResolvedValueOnce(BASE_ROW as never);
		const updateSpy = jest
			.spyOn(DeepDiveRepository, "updateOpportunityDeepDiveTextField")
			.mockResolvedValueOnce(1);

		const res = await callPatch({
			source: "deepDive",
			field: "whyWeWin",
			value: "Updated win narrative",
		});

		expect(res.status).toBe(200);
		expect(updateSpy).toHaveBeenCalledWith(
			171,
			2929,
			BigInt(4395),
			"whyWeWin",
			"Updated win narrative",
		);
	});

	it("returns an explicit error when the deep-dive property row is missing", async () => {
		jest
			.spyOn(DeepDiveRepository, "getOpportunityDetailBase")
			.mockResolvedValueOnce(BASE_ROW as never);
		jest
			.spyOn(DeepDiveRepository, "updateOpportunityDeepDiveTextField")
			.mockResolvedValueOnce(0);

		const res = await callPatch({
			source: "deepDive",
			field: "executiveSummary",
			value: "New summary",
		});
		const body = await res.json();

		expect(res.status).toBe(404);
		expect(body.error).toMatch(/not available/);
		expect(body.errorCode).toBe("FIELD_NOT_AVAILABLE");
	});

	it("rejects non-allowlisted fields", async () => {
		jest
			.spyOn(DeepDiveRepository, "getOpportunityDetailBase")
			.mockResolvedValueOnce(BASE_ROW as never);

		const res = await callPatch({
			source: "base",
			field: "portfolio_priority_score",
			value: "99",
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toMatch(/not editable/);
	});
});
