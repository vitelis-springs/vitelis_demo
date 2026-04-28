/**
 * @jest-environment node
 *
 * E2E tests for:
 *   PATCH /api/deep-dive/[id]/validation/[company_id]
 *
 * Full route handler -> controller -> service -> repository chain.
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

import { PATCH } from "../../../src/app/api/deep-dive/[id]/validation/[company_id]/route";
import { ValidationRepository } from "../../../src/app/server/modules/deep-dive/validation/validation.repository";
import { extractAdminFromRequest } from "../../../src/lib/auth";

function makeRequest(path: string, body: unknown): NextRequest {
	return new NextRequest(new URL(path, "http://localhost:3000"), {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

function callPatch(
	reportId: string,
	companyId: string,
	body: unknown,
): Promise<Response> {
	return PATCH(
		makeRequest(`/api/deep-dive/${reportId}/validation/${companyId}`, body),
		{ params: Promise.resolve({ id: reportId, company_id: companyId }) },
	);
}

describe("E2E: PATCH /api/deep-dive/[id]/validation/[company_id]", () => {
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

		const res = await callPatch("10", "173", {
			validationId: 25,
			status: "pass",
		});

		expect(res.status).toBe(401);
	});

	it("returns 400 for invalid status", async () => {
		const res = await callPatch("10", "173", {
			validationId: 25,
			status: "resolved",
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toMatch(/status must be pass, warn, or failed/);
	});

	it("returns 404 when validation check is missing", async () => {
		jest
			.spyOn(ValidationRepository, "updateValidationCheckManually")
			.mockResolvedValueOnce({ count: 0 } as never);

		const res = await callPatch("10", "173", {
			validationId: 404,
			status: "pass",
		});
		const body = await res.json();

		expect(res.status).toBe(404);
		expect(body.error).toMatch(/not found/i);
	});

	it("passes manual status, comment, and user email to the repository", async () => {
		const updateSpy = jest
			.spyOn(ValidationRepository, "updateValidationCheckManually")
			.mockResolvedValueOnce({ count: 1 } as never);

		const res = await callPatch("10", "173", {
			validationId: 25,
			status: "pass",
			comment: "Driver value corrected manually.",
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(updateSpy).toHaveBeenCalledWith(10, 173, 25, {
			status: "pass",
			comment: "Driver value corrected manually.",
			resolvedBy: "admin@test.com",
		});
	});
});
