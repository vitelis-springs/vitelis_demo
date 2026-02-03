/**
 * @jest-environment node
 *
 * E2E tests for GET /api/deep-dive/[id]/companies/[companyId]
 * Full route handler → controller → service → repository chain.
 * Uses jest.spyOn on repository to avoid complex Prisma mock setup.
 */
import { NextRequest } from "next/server";

/* ─── mocks ─── */

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

import { GET } from "../../../src/app/api/deep-dive/[id]/companies/[companyId]/route";
import { extractAdminFromRequest } from "../../../src/lib/auth";
import { DeepDiveRepository } from "../../../src/app/server/modules/deep-dive/deep-dive.repository";

/* ─── fixtures ─── */

const SAMPLE_COMPANY = {
  id: 173,
  name: "McKinsey",
  country_code: "US",
  url: "https://mckinsey.com",
  industry_id: 1,
};

const SAMPLE_STEPS = [
  {
    step_id: 1, step_order: 1, report_id: 10,
    report_generation_steps: { id: 1, name: "Scrape URLs", url: "http://n8n/1", dependency: "url", settings: {} },
  },
  {
    step_id: 2, step_order: 2, report_id: 10,
    report_generation_steps: { id: 2, name: "Extract KPIs", url: "http://n8n/2", dependency: "kpi", settings: {} },
  },
];

const SAMPLE_STEP_STATUSES = [
  { step_id: 1, status: "DONE", updated_at: new Date(), metadata: null },
  { step_id: 2, status: "PROCESSING", updated_at: new Date(), metadata: null },
];

const SAMPLE_KPI_RESULTS = [
  {
    id: 1, data_point_id: "kpi_category_innovation", value: "4.2",
    manualValue: null, data: { "KPI Category": "Innovation" }, status: "DONE",
    updates_at: new Date(),
    data_points: { name: "Innovation", type: "kpi_category" },
  },
];

const SAMPLE_CANDIDATES = [
  {
    id: 1, title: "Page 1", description: "desc", url: "https://example.com/1",
    status: "scraped", metadata: { agents: ["firecrawl"] },
    created_at: new Date(), updated_at: new Date(),
  },
];

const SAMPLE_KPI_ALL_SCORES = [
  { company_id: 173, company_name: "McKinsey", category: "Innovation", avg_score: 4.2 },
  { company_id: 173, company_name: "McKinsey", category: "Growth", avg_score: 3.5 },
  { company_id: 200, company_name: "Bain", category: "Innovation", avg_score: 4.8 },
  { company_id: 200, company_name: "Bain", category: "Growth", avg_score: 4.5 },
];

/* ─── helpers ─── */

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function callGET(reportId: string, companyId: string, query = ""): Promise<Response> {
  return GET(
    makeRequest(`/api/deep-dive/${reportId}/companies/${companyId}${query}`),
    { params: Promise.resolve({ id: reportId, companyId }) },
  );
}

function setupCompanyMocks() {
  jest.spyOn(DeepDiveRepository, "getCompany").mockResolvedValueOnce(SAMPLE_COMPANY as never);
  jest.spyOn(DeepDiveRepository, "getReportSteps").mockResolvedValueOnce(SAMPLE_STEPS as never);
  jest.spyOn(DeepDiveRepository, "getCompanyStepStatuses").mockResolvedValueOnce(SAMPLE_STEP_STATUSES as never);
  jest.spyOn(DeepDiveRepository, "getCompanyKpiResults").mockResolvedValueOnce(SAMPLE_KPI_RESULTS as never);
  jest.spyOn(DeepDiveRepository, "getCompanyScrapCandidates").mockResolvedValueOnce(SAMPLE_CANDIDATES as never);
  jest.spyOn(DeepDiveRepository, "getCompanyScrapCandidatesCount").mockResolvedValueOnce(10);
  jest.spyOn(DeepDiveRepository, "getCompanySources").mockResolvedValueOnce({
    items: [], total: 25, byTier: [], byVectorized: [], metadataGroups: null,
  } as never);
  jest.spyOn(DeepDiveRepository, "getKpiCategoryScoresByCompany").mockResolvedValueOnce(SAMPLE_KPI_ALL_SCORES);
}

/* ─── tests ─── */

describe("E2E: GET /api/deep-dive/[id]/companies/[companyId]", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("returns 401 when auth fails", async () => {
    (extractAdminFromRequest as jest.Mock).mockReturnValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const res = await callGET("10", "173");
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric report id", async () => {
    const res = await callGET("abc", "173");
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-numeric company id", async () => {
    const res = await callGET("10", "xyz");
    expect(res.status).toBe(400);
  });

  it("returns 404 when company not found in report", async () => {
    jest.spyOn(DeepDiveRepository, "getCompany").mockResolvedValueOnce(null);

    const res = await callGET("10", "999");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Company not found/);
  });

  it("returns full company detail with steps, KPIs, sources, candidates", async () => {
    setupCompanyMocks();

    const res = await callGET("10", "173");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    // Company info
    expect(body.data.company.id).toBe(173);
    expect(body.data.company.name).toBe("McKinsey");
    expect(body.data.company.countryCode).toBe("US");

    // Steps with merged statuses
    expect(body.data.steps).toHaveLength(2);
    expect(body.data.steps[0].status).toBe("DONE");
    expect(body.data.steps[0].definition.name).toBe("Scrape URLs");
    expect(body.data.steps[1].status).toBe("PROCESSING");

    // KPI results
    expect(body.data.kpiResults).toHaveLength(1);
    expect(body.data.kpiResults[0].name).toBe("Innovation");
    expect(body.data.kpiResults[0].type).toBe("kpi_category");

    // Scrape candidates
    expect(body.data.scrapCandidates).toHaveLength(1);
    expect(body.data.scrapCandidatesTotal).toBe(10);

    // Sources
    expect(body.data.sources.total).toBe(25);
  });

  it("computes KPI averages (report-wide and top-5)", async () => {
    setupCompanyMocks();

    const res = await callGET("10", "173");
    const body = await res.json();

    // Report average: Innovation = (4.2 + 4.8) / 2 = 4.5, Growth = (3.5 + 4.5) / 2 = 4.0
    expect(body.data.kpiAverages.reportAverage.Innovation).toBe(4.5);
    expect(body.data.kpiAverages.reportAverage.Growth).toBe(4);

    // Top-5 (only 2 companies, both in top-5)
    expect(body.data.kpiAverages.top5Average.Innovation).toBe(4.5);
    expect(body.data.kpiAverages.top5Companies).toHaveLength(2);
  });

  it("parses query params for source filtering", async () => {
    const sourcesSpy = jest.spyOn(DeepDiveRepository, "getCompanySources").mockResolvedValueOnce({
      items: [], total: 0, byTier: [], byVectorized: [], metadataGroups: null,
    } as never);

    jest.spyOn(DeepDiveRepository, "getCompany").mockResolvedValueOnce(SAMPLE_COMPANY as never);
    jest.spyOn(DeepDiveRepository, "getReportSteps").mockResolvedValueOnce([]);
    jest.spyOn(DeepDiveRepository, "getCompanyStepStatuses").mockResolvedValueOnce([]);
    jest.spyOn(DeepDiveRepository, "getCompanyKpiResults").mockResolvedValueOnce([]);
    jest.spyOn(DeepDiveRepository, "getCompanyScrapCandidates").mockResolvedValueOnce([]);
    jest.spyOn(DeepDiveRepository, "getCompanyScrapCandidatesCount").mockResolvedValueOnce(0);
    jest.spyOn(DeepDiveRepository, "getKpiCategoryScoresByCompany").mockResolvedValueOnce([]);

    await callGET("10", "173", "?sourcesLimit=20&sourcesOffset=5&tier=2&isVectorized=true");

    const filters = sourcesSpy.mock.calls[0]![1];
    expect(filters.limit).toBe(20);
    expect(filters.offset).toBe(5);
    expect(filters.tier).toBe(2);
    expect(filters.isVectorized).toBe(true);
  });

  it("assigns PENDING status to steps without a status record", async () => {
    jest.spyOn(DeepDiveRepository, "getCompany").mockResolvedValueOnce(SAMPLE_COMPANY as never);
    jest.spyOn(DeepDiveRepository, "getReportSteps").mockResolvedValueOnce(SAMPLE_STEPS as never);
    jest.spyOn(DeepDiveRepository, "getCompanyStepStatuses").mockResolvedValueOnce([]); // no statuses
    jest.spyOn(DeepDiveRepository, "getCompanyKpiResults").mockResolvedValueOnce([]);
    jest.spyOn(DeepDiveRepository, "getCompanyScrapCandidates").mockResolvedValueOnce([]);
    jest.spyOn(DeepDiveRepository, "getCompanyScrapCandidatesCount").mockResolvedValueOnce(0);
    jest.spyOn(DeepDiveRepository, "getCompanySources").mockResolvedValueOnce({
      items: [], total: 0, byTier: [], byVectorized: [], metadataGroups: null,
    } as never);
    jest.spyOn(DeepDiveRepository, "getKpiCategoryScoresByCompany").mockResolvedValueOnce([]);

    const res = await callGET("10", "173");
    const body = await res.json();

    // All steps should default to PENDING when no status record exists
    expect(body.data.steps[0].status).toBe("PENDING");
    expect(body.data.steps[1].status).toBe("PENDING");
  });

  it("returns 500 when service throws", async () => {
    jest.spyOn(DeepDiveRepository, "getCompany").mockRejectedValueOnce(new Error("DB error"));

    const res = await callGET("10", "173");
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
