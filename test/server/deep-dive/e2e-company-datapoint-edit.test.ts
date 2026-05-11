/**
 * @jest-environment node
 *
 * E2E tests for:
 *   PATCH /api/deep-dive/[id]/companies/[companyId]/data-points/[resultId]
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

import { PATCH } from "../../../src/app/api/deep-dive/[id]/companies/[companyId]/data-points/[resultId]/route";
import { POST as POST_DATA_POINT } from "../../../src/app/api/deep-dive/[id]/companies/[companyId]/data-points/route";
import { DeepDiveRepository } from "../../../src/app/server/modules/deep-dive/deep-dive.repository";
import { extractAdminFromRequest } from "../../../src/lib/auth";

function makeRequest(
	path: string,
	body: unknown,
	method = "PATCH",
): NextRequest {
	return new NextRequest(new URL(path, "http://localhost:3000"), {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

function callPatch(
	reportId: string,
	companyId: string,
	resultId: string,
	body: unknown,
): Promise<Response> {
	return PATCH(
		makeRequest(
			`/api/deep-dive/${reportId}/companies/${companyId}/data-points/${resultId}`,
			body,
		),
		{
			params: Promise.resolve({ id: reportId, companyId, resultId }),
		},
	);
}

function callPost(
	reportId: string,
	companyId: string,
	body: unknown,
): Promise<Response> {
	return POST_DATA_POINT(
		makeRequest(
			`/api/deep-dive/${reportId}/companies/${companyId}/data-points`,
			body,
			"POST",
		),
		{
			params: Promise.resolve({ id: reportId, companyId }),
		},
	);
}

describe("E2E: PATCH /api/deep-dive/[id]/companies/[companyId]/data-points/[resultId]", () => {
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

		const res = await callPatch("10", "173", "1", { status: true });
		expect(res.status).toBe(401);
	});

	it("returns 400 for non-numeric ids", async () => {
		const res = await callPatch("abc", "173", "1", { status: true });
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toMatch(/Invalid report\/company\/result id/);
	});

	it("returns 400 when body has no editable fields", async () => {
		const res = await callPatch("10", "173", "1", { foo: "bar" });
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toMatch(/At least one field is required/);
	});

	it("returns 400 when field types are invalid", async () => {
		const res = await callPatch("10", "173", "1", { status: "true" });
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toMatch(/status must be a boolean/);
	});

	it("returns 404 when datapoint result is missing", async () => {
		jest
			.spyOn(DeepDiveRepository, "getCompanyDataPointResultById")
			.mockResolvedValueOnce(null);

		const res = await callPatch("10", "173", "404", { status: false });
		const body = await res.json();

		expect(res.status).toBe(404);
		expect(body.error).toMatch(/not found/i);
	});

	it("updates kpi category and syncs concatenated value + JSON score", async () => {
		const base = {
			id: 31,
			report_id: 10,
			company_id: 173,
			data_point_id: "kpi_category_Strategy",
			value: "2.5",
			manualValue: null,
			status: true,
			data: { "KPI Category": "Strategy", "KPI Score": 2.5, Reasoning: "Old" },
			updates_at: new Date("2026-02-24T10:00:00.000Z"),
			data_points: { type: "kpi_category", name: "Strategy" },
		};
		const updated = {
			...base,
			value: "4 Medium-High",
			status: false,
			data: {
				"KPI Category": "Strategy",
				"KPI Score": "4 Medium-High",
				Reasoning: "New reasoning",
				Sources: "https://example.com/a",
			},
		};

		jest
			.spyOn(DeepDiveRepository, "getCompanyDataPointResultById")
			.mockResolvedValueOnce(base as never);
		const updateSpy = jest
			.spyOn(DeepDiveRepository, "updateCompanyDataPointResult")
			.mockResolvedValueOnce(updated as never);

		const res = await callPatch("10", "173", "31", {
			scoreValue: 4,
			scoreTier: "Medium-High",
			reasoning: "New reasoning",
			sources: "https://example.com/a",
			status: false,
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.data.value).toBe("4 Medium-High");
		expect(body.data.status).toBe(false);
		expect(body.data.type).toBe("kpi_category");
		const updatePayload = updateSpy.mock.calls[0]?.[1];
		expect(updatePayload).toBeDefined();
		const updateData = updatePayload?.data as Record<string, unknown>;
		expect(updateData.Sources).toBe("https://example.com/a");
		expect(updateData).not.toHaveProperty("sources");
		expect(updateSpy).toHaveBeenCalledWith(
			31,
			expect.objectContaining({
				value: "4 Medium-High",
				status: false,
				data: expect.objectContaining({
					"KPI Score": "4 Medium-High",
					Reasoning: "New reasoning",
					Sources: "https://example.com/a",
				}),
			}),
		);
	});

	it("updates kpi driver sources using canonical Sources key only", async () => {
		const base = {
			id: 41,
			report_id: 10,
			company_id: 173,
			data_point_id: "kpi_driver_Quality",
			value: "3 Medium",
			manualValue: null,
			status: true,
			data: {
				"Metric (KPI Driver)": "Quality",
				Score: "3 Medium",
				Reasoning: "Old reasoning",
				Sources: "https://example.com/old",
				sources: "https://example.com/legacy",
			},
			updates_at: new Date("2026-02-24T10:00:00.000Z"),
			data_points: { type: "kpi_driver", name: "Quality" },
		};
		const updated = {
			...base,
			data: {
				"Metric (KPI Driver)": "Quality",
				Score: "4 Medium-High",
				Reasoning: "Updated reasoning",
				Sources: "https://example.com/new",
			},
			value: "4 Medium-High",
		};

		jest
			.spyOn(DeepDiveRepository, "getCompanyDataPointResultById")
			.mockResolvedValueOnce(base as never);
		const updateSpy = jest
			.spyOn(DeepDiveRepository, "updateCompanyDataPointResult")
			.mockResolvedValueOnce(updated as never);

		const res = await callPatch("10", "173", "41", {
			scoreValue: 4,
			scoreTier: "Medium-High",
			reasoning: "Updated reasoning",
			sources: "https://example.com/new",
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		const updatePayload = updateSpy.mock.calls[0]?.[1];
		expect(updatePayload).toBeDefined();
		const updateData = updatePayload?.data as Record<string, unknown>;
		expect(updateData.Sources).toBe("https://example.com/new");
		expect(updateData).not.toHaveProperty("sources");
		expect(updateData.Score).toBe("4 Medium-High");
		expect(updateSpy).toHaveBeenCalledWith(
			41,
			expect.objectContaining({
				value: "4 Medium-High",
				data: expect.objectContaining({
					Score: "4 Medium-High",
					Reasoning: "Updated reasoning",
					Sources: "https://example.com/new",
				}),
			}),
		);
	});

	it("preserves structured sources array for kpi driver updates", async () => {
		const base = {
			id: 42,
			report_id: 10,
			company_id: 173,
			data_point_id: "kpi_driver_Automation",
			value: "3 Medium",
			manualValue: null,
			status: true,
			data: {
				"Metric (KPI Driver)": "Automation",
				Score: "3 Medium",
				Reasoning: "Old reasoning",
				Sources: "https://legacy.example/source",
			},
			updates_at: new Date("2026-02-24T10:00:00.000Z"),
			data_points: { type: "kpi_driver", name: "Automation" },
		};
		const structuredSources = [
			{
				reference_number: 1,
				url: "https://example.com/source-1",
				title: "Source one",
			},
			{
				reference_number: 2,
				url: "https://example.com/source-2",
				title: "Source two",
			},
		];
		const updated = {
			...base,
			data: {
				...base.data,
				Sources: structuredSources,
			},
		};

		jest
			.spyOn(DeepDiveRepository, "getCompanyDataPointResultById")
			.mockResolvedValueOnce(base as never);
		const updateSpy = jest
			.spyOn(DeepDiveRepository, "updateCompanyDataPointResult")
			.mockResolvedValueOnce(updated as never);

		const res = await callPatch("10", "173", "42", {
			sources: structuredSources,
			reasoning: "Old reasoning",
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		const updatePayload = updateSpy.mock.calls[0]?.[1];
		expect(updatePayload).toBeDefined();
		const updateData = updatePayload?.data as Record<string, unknown>;
		expect(updateData.Sources).toEqual(structuredSources);
		expect(updateData).not.toHaveProperty("sources");
	});

	it("updates raw datapoint and syncs manualValue + data.answer", async () => {
		const base = {
			id: 77,
			report_id: 10,
			company_id: 173,
			data_point_id: "raw_data_point_3",
			value: null,
			manualValue: "12",
			status: true,
			data: {
				raw_data_point: "Number of AI research papers (2023-2025)",
				answer: 12,
				explanation: "Old expl",
				sources: "https://openalex.org",
			},
			updates_at: new Date("2026-02-24T10:00:00.000Z"),
			data_points: {
				type: "raw_data_point",
				name: "Number of AI research papers (2023-2025)",
			},
		};
		const updated = {
			...base,
			manualValue: "27",
			data: {
				...base.data,
				answer: 27,
				explanation: "Updated expl",
				Reasoning: "Updated expl",
				sources: "https://openalex.org/r/1",
			},
		};

		jest
			.spyOn(DeepDiveRepository, "getCompanyDataPointResultById")
			.mockResolvedValueOnce(base as never);
		const updateSpy = jest
			.spyOn(DeepDiveRepository, "updateCompanyDataPointResult")
			.mockResolvedValueOnce(updated as never);

		const res = await callPatch("10", "173", "77", {
			score: "27",
			reasoning: "Updated expl",
			sources: "https://openalex.org/r/1",
			status: true,
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.data.manualValue).toBe("27");
		const updatePayload = updateSpy.mock.calls[0]?.[1];
		expect(updatePayload).toBeDefined();
		const updateData = updatePayload?.data as Record<string, unknown>;
		expect(updateData.sources).toBe("https://openalex.org/r/1");
		expect(updateData).not.toHaveProperty("Sources");
		expect(updateSpy).toHaveBeenCalledWith(
			77,
			expect.objectContaining({
				manualValue: "27",
				data: expect.objectContaining({
					answer: 27,
					explanation: "Updated expl",
					sources: "https://openalex.org/r/1",
				}),
			}),
		);
	});

	it("returns 400 for inconsistent kpi category score value/tier", async () => {
		const base = {
			id: 88,
			report_id: 10,
			company_id: 173,
			data_point_id: "kpi_category_Innovation",
			value: "3.0",
			manualValue: null,
			status: true,
			data: { "KPI Category": "Innovation", "KPI Score": 3 },
			updates_at: new Date("2026-02-24T10:00:00.000Z"),
			data_points: { type: "kpi_category", name: "Innovation" },
		};

		jest
			.spyOn(DeepDiveRepository, "getCompanyDataPointResultById")
			.mockResolvedValueOnce(base as never);
		const updateSpy = jest
			.spyOn(DeepDiveRepository, "updateCompanyDataPointResult")
			.mockResolvedValueOnce(base as never);

		const res = await callPatch("10", "173", "88", {
			scoreValue: 2,
			scoreTier: "High",
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toMatch(/scoreTier must be Low-Medium for scoreValue 2/);
		expect(updateSpy).not.toHaveBeenCalled();
	});

	it("returns 400 when only one kpi score field is provided", async () => {
		const base = {
			id: 89,
			report_id: 10,
			company_id: 173,
			data_point_id: "kpi_driver_Quality",
			value: "3 Medium",
			manualValue: null,
			status: true,
			data: { Score: "3 Medium" },
			updates_at: new Date("2026-02-24T10:00:00.000Z"),
			data_points: { type: "kpi_driver", name: "Quality" },
		};

		jest
			.spyOn(DeepDiveRepository, "getCompanyDataPointResultById")
			.mockResolvedValueOnce(base as never);
		const updateSpy = jest
			.spyOn(DeepDiveRepository, "updateCompanyDataPointResult")
			.mockResolvedValueOnce(base as never);

		const res = await callPatch("10", "173", "89", { scoreValue: 3 });
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toMatch(
			/scoreValue and scoreTier must be provided together/,
		);
		expect(updateSpy).not.toHaveBeenCalled();
	});

	it("returns 500 when repository throws", async () => {
		jest
			.spyOn(DeepDiveRepository, "getCompanyDataPointResultById")
			.mockRejectedValueOnce(new Error("DB down"));

		const res = await callPatch("10", "173", "1", { status: true });
		const body = await res.json();

		expect(res.status).toBe(500);
		expect(body.success).toBe(false);
	});

	it("creates manual raw datapoint result for a company", async () => {
		const modelItem = {
			data_point_id: "raw_data_point_110000001",
			data_points: {
				id: "raw_data_point_110000001",
				type: "raw_data_point",
				name: "Number of AI patents",
				settings: { raw_data_point: "Number of AI patents" },
				manual_method: true,
			},
		};
		const created = {
			id: 501,
			report_id: 110,
			company_id: 2798,
			data_point_id: "raw_data_point_110000001",
			value: "7",
			manualValue: "7",
			status: true,
			data: {
				raw_data_point: "Number of AI patents",
				answer: 7,
				explanation: "Manual patent count",
				Reasoning: "Manual patent count",
				sources: "WIPO PATENTSCOPE",
			},
			updates_at: new Date("2026-05-07T10:00:00.000Z"),
			data_points: modelItem.data_points,
		};

		jest
			.spyOn(DeepDiveRepository, "getCompany")
			.mockResolvedValueOnce({ id: 2798, name: "Company" } as never);
		jest
			.spyOn(DeepDiveRepository, "getReportModelItem")
			.mockResolvedValueOnce(modelItem as never);
		jest
			.spyOn(DeepDiveRepository, "getCompanyKpiResults")
			.mockResolvedValueOnce([]);
		const createSpy = jest
			.spyOn(DeepDiveRepository, "createCompanyDataPointResult")
			.mockResolvedValueOnce(created as never);

		const res = await callPost("110", "2798", {
			dataPointId: "raw_data_point_110000001",
			score: "7",
			reasoning: "Manual patent count",
			sources: "WIPO PATENTSCOPE",
			status: true,
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.data.id).toBe(501);
		expect(body.data.manualValue).toBe("7");
		expect(createSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				reportId: 110,
				companyId: 2798,
				dataPointId: "raw_data_point_110000001",
				value: "7",
				manualValue: "7",
				status: true,
				data: expect.objectContaining({
					answer: 7,
					explanation: "Manual patent count",
					sources: "WIPO PATENTSCOPE",
				}),
			}),
		);
	});

	it("creates manual kpi driver result with driver-specific fields", async () => {
		const modelItem = {
			data_point_id: "kpi_driver_Automation",
			data_points: {
				id: "kpi_driver_Automation",
				type: "kpi_driver",
				name: "Automation",
				settings: {
					"KPI Category": "Innovation",
					"Definition (KPI)": "AI maturity",
					"Metric (KPI Driver)": "Automation",
				},
				manual_method: true,
			},
		};
		const created = {
			id: 502,
			report_id: 110,
			company_id: 2798,
			data_point_id: "kpi_driver_Automation",
			value: "4 Medium-High",
			manualValue: null,
			status: true,
			data: {
				"KPI Category": "Innovation",
				"Definition (KPI)": "AI maturity",
				"Metric (KPI Driver)": "Automation",
				Score: "4 Medium-High",
				Reasoning: "Manual driver score",
				Sources: "https://example.com/driver",
			},
			updates_at: new Date("2026-05-07T10:00:00.000Z"),
			data_points: modelItem.data_points,
		};

		jest
			.spyOn(DeepDiveRepository, "getCompany")
			.mockResolvedValueOnce({ id: 2798, name: "Company" } as never);
		jest
			.spyOn(DeepDiveRepository, "getReportModelItem")
			.mockResolvedValueOnce(modelItem as never);
		jest
			.spyOn(DeepDiveRepository, "getCompanyKpiResults")
			.mockResolvedValueOnce([]);
		const createSpy = jest
			.spyOn(DeepDiveRepository, "createCompanyDataPointResult")
			.mockResolvedValueOnce(created as never);

		const res = await callPost("110", "2798", {
			dataPointId: "kpi_driver_Automation",
			scoreValue: 4,
			scoreTier: "Medium-High",
			reasoning: "Manual driver score",
			sources: "https://example.com/driver",
			status: true,
		});
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.data.value).toBe("4 Medium-High");
		expect(body.data.manualValue).toBeNull();
		expect(createSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				reportId: 110,
				companyId: 2798,
				dataPointId: "kpi_driver_Automation",
				value: "4 Medium-High",
				manualValue: null,
				data: expect.objectContaining({
					Score: "4 Medium-High",
					Reasoning: "Manual driver score",
					Sources: "https://example.com/driver",
				}),
			}),
		);
		const createPayload = createSpy.mock.calls[0]?.[0];
		expect(createPayload?.data).not.toHaveProperty("answer");
		expect(createPayload?.data).not.toHaveProperty("sources");
	});

	it("rejects non-manual model items on company result creation", async () => {
		jest
			.spyOn(DeepDiveRepository, "getCompany")
			.mockResolvedValueOnce({ id: 2798, name: "Company" } as never);
		jest.spyOn(DeepDiveRepository, "getReportModelItem").mockResolvedValueOnce({
			data_point_id: "raw_data_point_1",
			data_points: {
				id: "raw_data_point_1",
				type: "raw_data_point",
				name: "Auto item",
				settings: {},
				manual_method: false,
			},
		} as never);
		const createSpy = jest.spyOn(
			DeepDiveRepository,
			"createCompanyDataPointResult",
		);

		const res = await callPost("110", "2798", {
			dataPointId: "raw_data_point_1",
			score: "1",
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toMatch(/Only manual data points/);
		expect(createSpy).not.toHaveBeenCalled();
	});

	it("rejects manual model items when type and id prefix do not match", async () => {
		jest
			.spyOn(DeepDiveRepository, "getCompany")
			.mockResolvedValueOnce({ id: 2798, name: "Company" } as never);
		jest.spyOn(DeepDiveRepository, "getReportModelItem").mockResolvedValueOnce({
			data_point_id: "manual_patents",
			data_points: {
				id: "manual_patents",
				type: "raw_data_point",
				name: "Manual patents",
				settings: {},
				manual_method: true,
			},
		} as never);
		const createSpy = jest.spyOn(
			DeepDiveRepository,
			"createCompanyDataPointResult",
		);

		const res = await callPost("110", "2798", {
			dataPointId: "manual_patents",
			score: "1",
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toMatch(/raw_data_point_\* or kpi_driver_\*/);
		expect(createSpy).not.toHaveBeenCalled();
	});

	it("rejects empty manual datapoint create with only null/default fields", async () => {
		const createSpy = jest.spyOn(
			DeepDiveRepository,
			"createCompanyDataPointResult",
		);

		const res = await callPost("110", "2798", {
			dataPointId: "kpi_driver_Automation",
			reasoning: null,
			sources: null,
			status: true,
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.success).toBe(false);
		expect(body.error).toMatch(/At least one of reasoning, sources, or score/);
		expect(createSpy).not.toHaveBeenCalled();
	});

	it("rejects empty manual datapoint create with empty strings", async () => {
		const createSpy = jest.spyOn(
			DeepDiveRepository,
			"createCompanyDataPointResult",
		);

		const res = await callPost("110", "2798", {
			dataPointId: "kpi_driver_Automation",
			reasoning: "",
			sources: "",
			score: "",
			status: true,
		});
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.success).toBe(false);
		expect(createSpy).not.toHaveBeenCalled();
	});
});
