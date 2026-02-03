/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

/* ─── mocks ─── */

// Must use jest.fn() inside factory to avoid TDZ hoisting issue
jest.mock("../../../src/lib/prisma", () => {
  const qr = jest.fn();
  const fu = jest.fn();
  return {
    __esModule: true,
    default: {
      $queryRaw: qr,
      report_companies: { findUnique: fu },
    },
    _mockQueryRaw: qr,
    _mockFindUnique: fu,
  };
});

jest.mock("../../../src/lib/auth", () => ({
  extractAdminFromRequest: jest.fn(() => ({
    success: true,
    user: { userId: "1", email: "admin@test.com", role: "admin" },
  })),
}));

import { DeepDiveController } from "../../../src/app/server/modules/deep-dive/deep-dive.controller";
import { DeepDiveService } from "../../../src/app/server/modules/deep-dive/deep-dive.service";
import { DeepDiveRepository } from "../../../src/app/server/modules/deep-dive/deep-dive.repository";
import { extractAdminFromRequest } from "../../../src/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { _mockQueryRaw: mockQueryRaw } = require("../../../src/lib/prisma") as {
  _mockQueryRaw: jest.Mock;
};

/* ─── helpers ─── */

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

const EMPTY_SCORES = {
  relevance: 0, authority: 0, freshness: 0,
  originality: 0, security: 0, extractability: 0,
};

const SAMPLE_ANALYTICS_RESULT = {
  totalUnfiltered: 100,
  totalFiltered: 42,
  vectorizedCount: 28,
  aggregations: {
    qualityClass: [{ value: "HIGH", count: 30 }, { value: "LOW", count: 12 }],
    queryIds: [{ query_id: "5", goal: "Find AI strategy", count: 25 }],
    agents: [{ value: "exa.search", count: 40 }],
    categories: [{ value: "Strategy", count: 35 }],
    tags: [{ value: "ai", count: 20 }],
    isValid: [{ value: true, count: 30 }, { value: false, count: 12 }],
    scores: { relevance: 3.5, authority: 4.0, freshness: 2.1, originality: 3.0, security: 4.5, extractability: 3.8 },
  },
  items: [
    { id: 1, url: "https://example.com", title: "Test", tier: 1, date: null, is_vectorized: true, metadata: { quality_class: "HIGH" }, created_at: new Date() },
  ],
};

const SAMPLE_COMPANY = {
  id: 173,
  name: "McKinsey",
  country_code: "US",
  countryCode: "US",
  url: "https://mckinsey.com",
  industry_id: 1,
};

/* ═══════════════════════════════════════════════
   CONTROLLER TESTS
   ═══════════════════════════════════════════════ */

describe("DeepDiveController.getSourcesAnalytics", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 for non-numeric report id", async () => {
    const req = makeRequest("/api/deep-dive/abc/companies/173/sources");
    const res = await DeepDiveController.getSourcesAnalytics(req, "abc", "173");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Invalid/);
  });

  it("returns 400 for non-numeric company id", async () => {
    const req = makeRequest("/api/deep-dive/10/companies/xyz/sources");
    const res = await DeepDiveController.getSourcesAnalytics(req, "10", "xyz");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 401 when auth fails", async () => {
    (extractAdminFromRequest as jest.Mock).mockReturnValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const req = makeRequest("/api/deep-dive/10/companies/173/sources");
    const res = await DeepDiveController.getSourcesAnalytics(req, "10", "173");

    expect(res.status).toBe(401);
  });

  it("parses all query params correctly and passes to service", async () => {
    const serviceSpy = jest.spyOn(DeepDiveService, "getSourcesAnalytics").mockResolvedValueOnce({
      success: true,
      data: {
        reportId: 10,
        company: SAMPLE_COMPANY,
        ...SAMPLE_ANALYTICS_RESULT,
      },
    });

    const url = "/api/deep-dive/10/companies/173/sources?limit=25&offset=10&tier=2&qualityClass=HIGH&isValid=true&agent=exa.search&category=Strategy&tag=ai&dateFrom=2024-01-01&dateTo=2024-12-31&search=test";
    const req = makeRequest(url);
    const res = await DeepDiveController.getSourcesAnalytics(req, "10", "173");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    const passedFilters = serviceSpy.mock.calls[0]![2];
    expect(passedFilters).toMatchObject({
      limit: 25,
      offset: 10,
      tier: 2,
      qualityClass: "HIGH",
      isValid: true,
      agent: "exa.search",
      category: "Strategy",
      tag: "ai",
      search: "test",
    });
    expect(passedFilters.dateFrom).toBeInstanceOf(Date);
    expect(passedFilters.dateTo).toBeInstanceOf(Date);

    serviceSpy.mockRestore();
  });

  it("applies default limit=50 and offset=0 when not provided", async () => {
    const serviceSpy = jest.spyOn(DeepDiveService, "getSourcesAnalytics").mockResolvedValueOnce({
      success: true,
      data: {
        reportId: 10,
        company: SAMPLE_COMPANY,
        ...SAMPLE_ANALYTICS_RESULT,
      },
    });

    const req = makeRequest("/api/deep-dive/10/companies/173/sources");
    await DeepDiveController.getSourcesAnalytics(req, "10", "173");

    const passedFilters = serviceSpy.mock.calls[0]![2];
    expect(passedFilters.limit).toBe(50);
    expect(passedFilters.offset).toBe(0);

    serviceSpy.mockRestore();
  });

  it("clamps limit to MAX_LIMIT=200", async () => {
    const serviceSpy = jest.spyOn(DeepDiveService, "getSourcesAnalytics").mockResolvedValueOnce({
      success: true,
      data: {
        reportId: 10,
        company: SAMPLE_COMPANY,
        ...SAMPLE_ANALYTICS_RESULT,
      },
    });

    const req = makeRequest("/api/deep-dive/10/companies/173/sources?limit=999");
    await DeepDiveController.getSourcesAnalytics(req, "10", "173");

    expect(serviceSpy.mock.calls[0]![2].limit).toBe(200);
    serviceSpy.mockRestore();
  });

  it("returns 404 when service returns null (company not found)", async () => {
    jest.spyOn(DeepDiveService, "getSourcesAnalytics").mockResolvedValueOnce(null);

    const req = makeRequest("/api/deep-dive/10/companies/999/sources");
    const res = await DeepDiveController.getSourcesAnalytics(req, "10", "999");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });
});

describe("DeepDiveController.getScrapeCandidates", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 for invalid ids", async () => {
    const req = makeRequest("/api/deep-dive/abc/companies/173/source_candidates");
    const res = await DeepDiveController.getScrapeCandidates(req, "abc", "173");

    expect(res.status).toBe(400);
  });

  it("parses search param and calls service", async () => {
    const serviceSpy = jest.spyOn(DeepDiveService, "getScrapeCandidates").mockResolvedValueOnce({
      success: true,
      data: {
        reportId: 10,
        company: SAMPLE_COMPANY,
        total: 50,
        totalFiltered: 10,
        aggregations: {
          agents: [],
          queryIds: [],
        },
        items: [],
      },
    });

    const req = makeRequest("/api/deep-dive/10/companies/173/source_candidates?search=mckinsey&limit=20");
    const res = await DeepDiveController.getScrapeCandidates(req, "10", "173");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    const passedFilters = serviceSpy.mock.calls[0]![2];
    expect(passedFilters.search).toBe("mckinsey");
    expect(passedFilters.limit).toBe(20);

    serviceSpy.mockRestore();
  });
});

/* ═══════════════════════════════════════════════
   SERVICE TESTS
   ═══════════════════════════════════════════════ */

describe("DeepDiveService.getSourcesAnalytics", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null when company not found in report", async () => {
    jest.spyOn(DeepDiveRepository, "getCompany").mockResolvedValueOnce(null);

    const result = await DeepDiveService.getSourcesAnalytics(10, 999, { limit: 50, offset: 0 });
    expect(result).toBeNull();
  });

  it("returns correctly shaped response on success", async () => {
    jest.spyOn(DeepDiveRepository, "getCompany").mockResolvedValueOnce(SAMPLE_COMPANY as never);
    jest.spyOn(DeepDiveRepository, "getSourcesAnalytics").mockResolvedValueOnce(SAMPLE_ANALYTICS_RESULT);

    const result = await DeepDiveService.getSourcesAnalytics(10, 173, { limit: 50, offset: 0 });

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.data.reportId).toBe(10);
    expect(result!.data.company.id).toBe(173);
    expect(result!.data.company.name).toBe("McKinsey");
    expect(result!.data.totalUnfiltered).toBe(100);
    expect(result!.data.totalFiltered).toBe(42);
    expect(result!.data.aggregations.qualityClass).toHaveLength(2);
    expect(result!.data.aggregations.scores.relevance).toBe(3.5);
    expect(result!.data.items).toHaveLength(1);
  });

  it("passes filters through to repository", async () => {
    jest.spyOn(DeepDiveRepository, "getCompany").mockResolvedValueOnce(SAMPLE_COMPANY as never);
    const repoSpy = jest.spyOn(DeepDiveRepository, "getSourcesAnalytics").mockResolvedValueOnce(SAMPLE_ANALYTICS_RESULT);

    const filters = { limit: 25, offset: 10, tier: 2, qualityClass: "HIGH" as const, search: "test" };
    await DeepDiveService.getSourcesAnalytics(10, 173, filters);

    expect(repoSpy).toHaveBeenCalledWith(173, filters);
    repoSpy.mockRestore();
  });
});

describe("DeepDiveService.getScrapeCandidates", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null when company not found", async () => {
    jest.spyOn(DeepDiveRepository, "getCompany").mockResolvedValueOnce(null);

    const result = await DeepDiveService.getScrapeCandidates(10, 999, { limit: 50, offset: 0 });
    expect(result).toBeNull();
  });

  it("returns correctly shaped response on success", async () => {
    jest.spyOn(DeepDiveRepository, "getCompany").mockResolvedValueOnce(SAMPLE_COMPANY as never);
    jest.spyOn(DeepDiveRepository, "getScrapeCandidatesList").mockResolvedValueOnce({
      total: 50,
      totalFiltered: 50,
      aggregations: {
        agents: [{ value: "firecrawl.map", count: 50 }],
        queryIds: [{ query_id: "3", goal: "Discover pages", count: 50 }],
      },
      items: [
        { id: 1, url: "https://example.com/page", title: "Page", description: "desc", status: "pending", metadata: { agents: ["firecrawl.map"] }, created_at: new Date() },
      ],
    });

    const result = await DeepDiveService.getScrapeCandidates(10, 173, { limit: 50, offset: 0 });

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.data.total).toBe(50);
    expect(result!.data.items).toHaveLength(1);
    expect(result!.data.company.name).toBe("McKinsey");
  });
});

/* ═══════════════════════════════════════════════
   REPOSITORY TESTS (SQL building via mock)
   ═══════════════════════════════════════════════ */

describe("DeepDiveRepository.getSourcesAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock returns for all 11 parallel queries
    mockQueryRaw
      .mockResolvedValueOnce([{ count: 100 }])       // totalUnfiltered
      .mockResolvedValueOnce([{ count: 42 }])         // totalFiltered
      .mockResolvedValueOnce([{ value: "HIGH", count: 30 }])  // qualityClass
      .mockResolvedValueOnce([{ count: 28 }])         // vectorizedCount
      .mockResolvedValueOnce([{ query_id: "5", goal: "Find AI strategy", count: 25 }]) // queryIds
      .mockResolvedValueOnce([{ value: "exa.search", count: 40 }])  // agents
      .mockResolvedValueOnce([{ value: "Strategy", count: 35 }])    // categories
      .mockResolvedValueOnce([{ value: "ai", count: 20 }])          // tags
      .mockResolvedValueOnce([{ value: true, count: 30 }])          // isValid
      .mockResolvedValueOnce([EMPTY_SCORES])                        // scores
      .mockResolvedValueOnce([]);                                    // items
  });

  it("executes 11 parallel queries and returns structured result", async () => {
    const result = await DeepDiveRepository.getSourcesAnalytics(173, { limit: 50, offset: 0 });

    expect(mockQueryRaw).toHaveBeenCalledTimes(11);
    expect(result.totalUnfiltered).toBe(100);
    expect(result.totalFiltered).toBe(42);
    expect(result.vectorizedCount).toBe(28);
    expect(result.aggregations.qualityClass).toEqual([{ value: "HIGH", count: 30 }]);
    expect(result.aggregations.queryIds).toEqual([{ query_id: "5", goal: "Find AI strategy", count: 25 }]);
    expect(result.aggregations.scores).toEqual(EMPTY_SCORES);
    expect(result.items).toEqual([]);
  });

  it("returns zero defaults when queries return empty arrays", async () => {
    mockQueryRaw.mockReset();
    mockQueryRaw
      .mockResolvedValueOnce([])   // totalUnfiltered — empty
      .mockResolvedValueOnce([])   // totalFiltered — empty
      .mockResolvedValueOnce([])   // qualityClass
      .mockResolvedValueOnce([])   // vectorizedCount — empty
      .mockResolvedValueOnce([])   // queryIds
      .mockResolvedValueOnce([])   // agents
      .mockResolvedValueOnce([])   // categories
      .mockResolvedValueOnce([])   // tags
      .mockResolvedValueOnce([])   // isValid
      .mockResolvedValueOnce([])   // scores — empty triggers default
      .mockResolvedValueOnce([]);  // items

    const result = await DeepDiveRepository.getSourcesAnalytics(173, { limit: 50, offset: 0 });

    expect(result.totalUnfiltered).toBe(0);
    expect(result.totalFiltered).toBe(0);
    expect(result.vectorizedCount).toBe(0);
    expect(result.aggregations.scores).toEqual(EMPTY_SCORES);
  });
});

describe("DeepDiveRepository.getScrapeCandidatesList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryRaw
      .mockResolvedValueOnce([{ count: 50 }])   // total
      .mockResolvedValueOnce([{ count: 50 }])   // totalFiltered
      .mockResolvedValueOnce([{ value: "firecrawl.map", count: 50 }])  // agents
      .mockResolvedValueOnce([{ query_id: "3", goal: "Discover pages", count: 50 }])  // queryIds
      .mockResolvedValueOnce([                    // items
        { id: 1, url: "https://example.com", title: "T", description: "D", status: "pending", metadata: null, created_at: new Date() },
      ]);
  });

  it("executes 5 parallel queries and returns structured result", async () => {
    const result = await DeepDiveRepository.getScrapeCandidatesList(173, { limit: 50, offset: 0 });

    expect(mockQueryRaw).toHaveBeenCalledTimes(5);
    expect(result.total).toBe(50);
    expect(result.totalFiltered).toBe(50);
    expect(result.aggregations.agents).toEqual([{ value: "firecrawl.map", count: 50 }]);
    expect(result.aggregations.queryIds).toEqual([{ query_id: "3", goal: "Discover pages", count: 50 }]);
    expect(result.items).toHaveLength(1);
  });

  it("returns zero defaults for empty results", async () => {
    mockQueryRaw.mockReset();
    mockQueryRaw
      .mockResolvedValueOnce([])   // total
      .mockResolvedValueOnce([])   // totalFiltered
      .mockResolvedValueOnce([])   // agents
      .mockResolvedValueOnce([])   // queryIds
      .mockResolvedValueOnce([]);  // items

    const result = await DeepDiveRepository.getScrapeCandidatesList(173, { limit: 50, offset: 0 });

    expect(result.total).toBe(0);
    expect(result.totalFiltered).toBe(0);
    expect(result.aggregations.agents).toEqual([]);
    expect(result.aggregations.queryIds).toEqual([]);
    expect(result.items).toEqual([]);
  });
});
