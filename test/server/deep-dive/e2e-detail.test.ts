/**
 * @jest-environment node
 *
 * E2E tests for GET /api/deep-dive/[id]
 * Full route handler → controller → service → repository chain.
 */
import { NextRequest } from "next/server";

/* ─── mocks ─── */

jest.mock("../../../src/lib/prisma", () => {
  const fu = jest.fn();
  const fm = jest.fn();
  const rfm = jest.fn();
  const gb = jest.fn();
  const cnt = jest.fn();
  const qr = jest.fn();
  return {
    __esModule: true,
    default: {
      reports: { findUnique: fu },
      report_companies: { findMany: fm },
      report_steps: { findMany: rfm },
      report_step_statuses: { groupBy: gb },
      report_data_collection_queries: { count: cnt },
      $queryRaw: qr,
    },
    _fu: fu, _fm: fm, _rfm: rfm, _gb: gb, _cnt: cnt, _qr: qr,
  };
});

jest.mock("../../../src/lib/auth", () => ({
  extractAdminFromRequest: jest.fn(() => ({
    success: true,
    user: { userId: "1", email: "admin@test.com", role: "admin" },
  })),
}));

import { GET } from "../../../src/app/api/deep-dive/[id]/route";
import { extractAdminFromRequest } from "../../../src/lib/auth";

const {
  _fu: mockFindUnique,
  _fm: mockFindMany,
  _rfm: mockReportStepsFindMany,
  _gb: mockGroupBy,
  _cnt: mockCount,
  _qr: mockQueryRaw,
} =
  require("../../../src/lib/prisma") as Record<string, jest.Mock>;

/* ─── fixtures ─── */

const SAMPLE_REPORT = {
  id: 10,
  name: "Market Report",
  description: "Full analysis",
  created_at: new Date("2024-06-01"),
  updates_at: new Date("2024-06-15"),
  report_orhestrator: { status: "PROCESSING" },
  report_settings: { id: 1, name: "Custom Settings" },
  use_cases: { id: 2, name: "Competitive Intel" },
};

const SAMPLE_COMPANIES = [
  { company_id: 100, companies: { id: 100, name: "Acme Corp", country_code: "US", url: "https://acme.com" } },
  { company_id: 200, companies: { id: 200, name: "Beta Inc", country_code: "DE", url: "https://beta.de" } },
];

const SAMPLE_KPI_SCORES = [
  { company_id: 100, company_name: "Acme Corp", category: "Innovation", avg_score: 4.2 },
  { company_id: 100, company_name: "Acme Corp", category: "Growth", avg_score: 3.5 },
  { company_id: 200, company_name: "Beta Inc", category: "Innovation", avg_score: 3.8 },
  { company_id: 200, company_name: "Beta Inc", category: "Growth", avg_score: 4.0 },
];

const SAMPLE_STATUS_SUMMARY = [
  { company_id: 100, status: "DONE", _count: { _all: 5 } },
  { company_id: 100, status: "PROCESSING", _count: { _all: 2 } },
  { company_id: 200, status: "DONE", _count: { _all: 7 } },
];

/* ─── helpers ─── */

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function callGET(id: string): Promise<Response> {
  return GET(makeRequest(`/api/deep-dive/${id}`), {
    params: Promise.resolve({ id }),
  });
}

function setupDetailMocks(report = SAMPLE_REPORT) {
  mockFindUnique.mockResolvedValueOnce(report);
  mockFindMany.mockResolvedValueOnce(SAMPLE_COMPANIES);
  mockReportStepsFindMany.mockResolvedValueOnce([]);
  // First $queryRaw: getSourceCountingContext, then KPI/count queries
  mockQueryRaw
    .mockResolvedValueOnce([{ source_validation_settings_id: null, use_new_model: false }])
    .mockResolvedValueOnce(SAMPLE_KPI_SCORES)       // getKpiCategoryScoresByCompany
    .mockResolvedValueOnce([{ total: 150 }])         // getReportSourcesCount
    .mockResolvedValueOnce([{ total: 70 }])          // getReportUsedSourcesCount
    .mockResolvedValueOnce([{ total: 42 }]);         // getReportScrapeCandidatesCount
  mockCount.mockResolvedValueOnce(8);                // getReportQueriesCount
  mockGroupBy.mockResolvedValueOnce(SAMPLE_STATUS_SUMMARY);
}

/* ─── tests ─── */

describe("E2E: GET /api/deep-dive/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when auth fails", async () => {
    (extractAdminFromRequest as jest.Mock).mockReturnValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const res = await callGET("10");
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric id", async () => {
    const res = await callGET("abc");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Invalid/);
  });

  it("returns 404 when report not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await callGET("999");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it("returns full report detail with KPI chart data", async () => {
    setupDetailMocks();

    const res = await callGET("10");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    // Report metadata
    expect(body.data.report.id).toBe(10);
    expect(body.data.report.name).toBe("Market Report");
    expect(body.data.report.status).toBe("PROCESSING");
    expect(body.data.report.useCase).toEqual({ id: 2, name: "Competitive Intel" });

    // Summary
    expect(body.data.summary.companiesCount).toBe(2);
    expect(body.data.summary.totalSources).toBe(150);
    expect(body.data.summary.usedSources).toBe(70);
    expect(body.data.summary.totalScrapeCandidates).toBe(42);
    expect(body.data.summary.totalQueries).toBe(8);

    // KPI chart — categories discovered dynamically from data
    expect(body.data.categories).toEqual(["Growth", "Innovation"]);
    expect(body.data.kpiChart).toHaveLength(2);

    // Companies with derived status
    expect(body.data.companies).toHaveLength(2);
    const acme = body.data.companies.find((c: { name: string }) => c.name === "Acme Corp");
    expect(acme.status).toBe("PROCESSING"); // has PROCESSING steps → dominant status
    const beta = body.data.companies.find((c: { name: string }) => c.name === "Beta Inc");
    expect(beta.status).toBe("DONE"); // only DONE steps
  });

  it("derives PENDING status when report has no orchestrator", async () => {
    setupDetailMocks({ ...SAMPLE_REPORT, report_orhestrator: null });

    const res = await callGET("10");
    const body = await res.json();

    expect(body.data.report.status).toBe("PENDING");
    expect(body.data.summary.orchestratorStatus).toBe("PENDING");
  });

  it("handles report with no companies", async () => {
    mockFindUnique.mockResolvedValueOnce(SAMPLE_REPORT);
    mockFindMany.mockResolvedValueOnce([]);
    mockReportStepsFindMany.mockResolvedValueOnce([]);
    mockQueryRaw
      .mockResolvedValueOnce([{ source_validation_settings_id: null, use_new_model: false }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 0 }]);
    mockCount.mockResolvedValueOnce(0);
    mockGroupBy.mockResolvedValueOnce([]);

    const res = await callGET("10");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.companies).toHaveLength(0);
    expect(body.data.kpiChart).toHaveLength(0);
    expect(body.data.categories).toHaveLength(0);
  });

  it("returns 500 when repository throws", async () => {
    mockFindUnique.mockRejectedValueOnce(new Error("Connection lost"));

    const res = await callGET("10");
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });

  it("handles NaN id like 'Infinity'", async () => {
    const res = await callGET("Infinity");
    // Number("Infinity") is Infinity, Number.isFinite(Infinity) = false
    expect(res.status).toBe(400);
  });
});
