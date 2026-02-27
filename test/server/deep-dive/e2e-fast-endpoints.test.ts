/**
 * @jest-environment node
 *
 * E2E tests for split deep-dive endpoints:
 *   GET /api/deep-dive/[id]/overview
 *   GET /api/deep-dive/[id]/metric/[metric]
 *   GET /api/deep-dive/[id]/kpi-chart
 *   GET /api/deep-dive/[id]/companies
 */
import { NextRequest } from "next/server";

jest.mock("../../../src/lib/prisma", () => {
  const fu = jest.fn();
  const fm = jest.fn();
  const rcc = jest.fn();
  const rdcqc = jest.fn();
  const rssg = jest.fn();
  const rsc = jest.fn();
  const qr = jest.fn();

  return {
    __esModule: true,
    default: {
      reports: { findUnique: fu },
      report_companies: { findMany: fm, count: rcc },
      report_data_collection_queries: { count: rdcqc },
      report_step_statuses: { groupBy: rssg },
      report_steps: { count: rsc },
      $queryRaw: qr,
    },
    _fu: fu,
    _fm: fm,
    _rcc: rcc,
    _rdcqc: rdcqc,
    _rssg: rssg,
    _rsc: rsc,
    _qr: qr,
  };
});

jest.mock("../../../src/lib/auth", () => ({
  extractAdminFromRequest: jest.fn(() => ({
    success: true,
    user: { userId: "1", email: "admin@test.com", role: "admin" },
  })),
}));

import { GET as GET_OVERVIEW } from "../../../src/app/api/deep-dive/[id]/overview/route";
import { GET as GET_METRIC } from "../../../src/app/api/deep-dive/[id]/metric/[metric]/route";
import { GET as GET_KPI_CHART } from "../../../src/app/api/deep-dive/[id]/kpi-chart/route";
import { GET as GET_COMPANIES } from "../../../src/app/api/deep-dive/[id]/companies/route";
import { extractAdminFromRequest } from "../../../src/lib/auth";

const {
  _fu: mockFindUnique,
  _fm: mockFindMany,
  _rcc: mockReportCompaniesCount,
  _rdcqc: mockReportQueriesCount,
  _rssg: mockStatusesGroupBy,
  _rsc: mockReportStepsCount,
  _qr: mockQueryRaw,
} = require("../../../src/lib/prisma") as Record<string, jest.Mock>;

const SAMPLE_REPORT = {
  id: 35,
  name: "Fast Deep Dive",
  description: "Split endpoint test",
  created_at: new Date("2025-01-01T00:00:00.000Z"),
  updates_at: new Date("2025-01-05T00:00:00.000Z"),
  report_orhestrator: { status: "PROCESSING" },
  report_settings: { id: 9, name: "Settings v9" },
  use_cases: { id: 3, name: "Strategy" },
};

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function callOverview(id: string): Promise<Response> {
  return GET_OVERVIEW(makeRequest(`/api/deep-dive/${id}/overview`), {
    params: Promise.resolve({ id }),
  });
}

function callMetric(id: string, metric: string): Promise<Response> {
  return GET_METRIC(makeRequest(`/api/deep-dive/${id}/metric/${metric}`), {
    params: Promise.resolve({ id, metric }),
  });
}

function callKpiChart(id: string): Promise<Response> {
  return GET_KPI_CHART(makeRequest(`/api/deep-dive/${id}/kpi-chart`), {
    params: Promise.resolve({ id }),
  });
}

function callCompanies(id: string): Promise<Response> {
  return GET_COMPANIES(makeRequest(`/api/deep-dive/${id}/companies`), {
    params: Promise.resolve({ id }),
  });
}

describe("E2E: GET /api/deep-dive/[id]/overview", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when auth fails", async () => {
    (extractAdminFromRequest as jest.Mock).mockReturnValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const res = await callOverview("35");
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid report id", async () => {
    const res = await callOverview("abc");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 404 when report not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await callOverview("999");
    expect(res.status).toBe(404);
  });

  it("returns lightweight overview payload", async () => {
    mockFindUnique.mockResolvedValueOnce(SAMPLE_REPORT);

    const res = await callOverview("35");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.report.id).toBe(35);
    expect(body.data.report.name).toBe("Fast Deep Dive");
    expect(body.data.report.status).toBe("PROCESSING");
    expect(body.data.report.settings).toEqual({ id: 9, name: "Settings v9" });
  });
});

describe("E2E: GET /api/deep-dive/[id]/metric/[metric]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 for invalid metric", async () => {
    const res = await callMetric("35", "not-valid");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Invalid metric key/);
  });

  it("returns companies-count metric", async () => {
    mockFindUnique.mockResolvedValueOnce(SAMPLE_REPORT);
    mockReportCompaniesCount.mockResolvedValueOnce(20);

    const res = await callMetric("35", "companies-count");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.metric).toBe("companies-count");
    expect(body.data.value).toBe(20);
  });

  it("returns orchestrator-status and falls back to PENDING", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...SAMPLE_REPORT, report_orhestrator: null });

    const res = await callMetric("35", "orchestrator-status");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.metric).toBe("orchestrator-status");
    expect(body.data.value).toBe("PENDING");
  });

  it("returns used-sources metric from heavy query branch", async () => {
    mockFindUnique.mockResolvedValueOnce(SAMPLE_REPORT);
    mockQueryRaw
      .mockResolvedValueOnce([{ source_validation_settings_id: null, use_new_model: false }])
      .mockResolvedValueOnce([{ total: 77 }]);

    const res = await callMetric("35", "used-sources");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.metric).toBe("used-sources");
    expect(body.data.value).toBe(77);
  });

  it("returns total-queries metric", async () => {
    mockFindUnique.mockResolvedValueOnce(SAMPLE_REPORT);
    mockReportQueriesCount.mockResolvedValueOnce(12);

    const res = await callMetric("35", "total-queries");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.metric).toBe("total-queries");
    expect(body.data.value).toBe(12);
  });
});

describe("E2E: GET /api/deep-dive/[id]/kpi-chart", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns kpi chart payload with dynamic categories", async () => {
    mockFindUnique.mockResolvedValueOnce(SAMPLE_REPORT);
    mockQueryRaw.mockResolvedValueOnce([
      { company_id: 100, company_name: "Acme", category: "Innovation", avg_score: 4.23 },
      { company_id: 100, company_name: "Acme", category: "Growth", avg_score: 3.47 },
      { company_id: 200, company_name: "Beta", category: "Growth", avg_score: 4.01 },
    ]);

    const res = await callKpiChart("35");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.categories).toEqual(["Growth", "Innovation"]);
    expect(body.data.kpiChart).toHaveLength(2);
    expect(body.data.kpiChart[0].company).toBe("Acme");
  });
});

describe("E2E: GET /api/deep-dive/[id]/companies", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns companies table independently from summary endpoint", async () => {
    mockFindUnique.mockResolvedValueOnce(SAMPLE_REPORT);
    mockFindMany.mockResolvedValueOnce([
      {
        company_id: 100,
        companies: { id: 100, name: "Acme", country_code: "US", url: "https://acme.com" },
      },
      {
        company_id: 200,
        companies: { id: 200, name: "Beta", country_code: "DE", url: "https://beta.de" },
      },
    ]);

    mockQueryRaw
      .mockResolvedValueOnce([{ source_validation_settings_id: null, use_new_model: false }])
      .mockResolvedValueOnce([
        { company_id: 100, total: 30, valid_count: 20 },
        { company_id: 200, total: 10, valid_count: 4 },
      ])
      .mockResolvedValueOnce([
        { company_id: 100, total: 9 },
        { company_id: 200, total: 1 },
      ])
      .mockResolvedValueOnce([
        { company_id: 100, total: 14 },
        { company_id: 200, total: 3 },
      ]);

    mockStatusesGroupBy.mockResolvedValueOnce([
      { company_id: 100, status: "PROCESSING", _count: { _all: 2 } },
      { company_id: 100, status: "DONE", _count: { _all: 3 } },
      { company_id: 200, status: "DONE", _count: { _all: 5 } },
    ]);

    mockReportStepsCount.mockResolvedValueOnce(5);

    const res = await callCompanies("35");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.reportId).toBe(35);
    expect(body.data.companies).toHaveLength(2);

    const acme = body.data.companies.find((c: { id: number }) => c.id === 100);
    expect(acme.status).toBe("PROCESSING");
    expect(acme.sourcesCount).toBe(30);
    expect(acme.validSourcesCount).toBe(20);
    expect(acme.usedSourcesCount).toBe(9);
    expect(acme.candidatesCount).toBe(14);
    expect(acme.stepsTotal).toBe(5);
  });

  it("returns 404 when report not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await callCompanies("777");
    expect(res.status).toBe(404);
  });
});
