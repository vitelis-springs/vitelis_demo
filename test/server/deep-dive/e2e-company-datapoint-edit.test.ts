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
import { extractAdminFromRequest } from "../../../src/lib/auth";
import { DeepDiveRepository } from "../../../src/app/server/modules/deep-dive/deep-dive.repository";

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
  resultId: string,
  body: unknown,
): Promise<Response> {
  return PATCH(
    makeRequest(
      `/api/deep-dive/${reportId}/companies/${companyId}/data-points/${resultId}`,
      body,
    ),
    { params: Promise.resolve({ id: reportId, companyId, resultId }) },
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
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
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
        sources: "https://example.com/a",
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
      data_points: { type: "raw_data_point", name: "Number of AI research papers (2023-2025)" },
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
        Sources: "https://openalex.org/r/1",
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

    const res = await callPatch("10", "173", "88", { scoreValue: 2, scoreTier: "High" });
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
    expect(body.error).toMatch(/scoreValue and scoreTier must be provided together/);
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
});
