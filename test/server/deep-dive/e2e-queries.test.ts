/**
 * @jest-environment node
 *
 * E2E tests for:
 *   GET  /api/deep-dive/[id]/queries
 *   PUT  /api/deep-dive/[id]/queries/[queryId]
 *
 * Full route handler → controller → service → repository chain.
 */
import { NextRequest } from "next/server";

/* ─── mocks ─── */

jest.mock("../../../src/lib/prisma", () => {
  const fu = jest.fn();
  const ff = jest.fn();
  const up = jest.fn();
  const qr = jest.fn();
  return {
    __esModule: true,
    default: {
      reports: { findUnique: fu },
      report_data_collection_queries: { findFirst: ff },
      data_collection_queries: { update: up },
      $queryRaw: qr,
    },
    _fu: fu, _ff: ff, _up: up, _qr: qr,
  };
});

jest.mock("../../../src/lib/auth", () => ({
  extractAdminFromRequest: jest.fn(() => ({
    success: true,
    user: { userId: "1", email: "admin@test.com", role: "admin" },
  })),
}));

import { GET } from "../../../src/app/api/deep-dive/[id]/queries/route";
import { PUT } from "../../../src/app/api/deep-dive/[id]/queries/[queryId]/route";
import { extractAdminFromRequest } from "../../../src/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { _fu: mockFindUnique, _ff: mockFindFirst, _up: mockUpdate, _qr: mockQueryRaw } =
  require("../../../src/lib/prisma") as Record<string, jest.Mock>;

/* ─── fixtures ─── */

const SAMPLE_REPORT = {
  id: 10,
  name: "AI Market Report",
  description: "Report desc",
  created_at: new Date(),
  updates_at: new Date(),
  report_orhestrator: { status: "DONE" },
  report_settings: null,
  use_cases: null,
};

const SAMPLE_QUERY_ROWS = [
  {
    id: BigInt(1),
    goal: "Find AI adoption rates",
    search_queries: ["AI adoption rate 2024", "enterprise AI statistics"],
    sources_count: 15,
    candidates_count: 42,
    completed_companies: 3,
    total_companies: 5,
    data_points: [
      { id: "dp_1", name: "AI Market Size", type: "raw_data_point" },
    ],
  },
  {
    id: BigInt(2),
    goal: "Competitive landscape analysis",
    search_queries: ["AI competitors market share"],
    sources_count: 8,
    candidates_count: 20,
    completed_companies: 5,
    total_companies: 5,
    data_points: null,
  },
];

/* ─── helpers ─── */

function mockContextThenRows(rows: unknown) {
  mockQueryRaw
    .mockResolvedValueOnce([{ source_validation_settings_id: null, use_new_model: false }])
    .mockResolvedValueOnce(rows);
}

function makeRequest(path: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"), options);
}

function callGetQueries(id: string): Promise<Response> {
  return GET(makeRequest(`/api/deep-dive/${id}/queries`), {
    params: Promise.resolve({ id }),
  });
}

function callPutQuery(
  reportId: string,
  queryId: string,
  body: unknown,
): Promise<Response> {
  return PUT(
    makeRequest(`/api/deep-dive/${reportId}/queries/${queryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: reportId, queryId }) },
  );
}

/* ═══════════════════════════════════════════════
   GET /api/deep-dive/[id]/queries
   ═══════════════════════════════════════════════ */

describe("E2E: GET /api/deep-dive/[id]/queries", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when auth fails", async () => {
    (extractAdminFromRequest as jest.Mock).mockReturnValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const res = await callGetQueries("10");
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric report id", async () => {
    const res = await callGetQueries("abc");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Invalid/);
  });

  it("returns 404 when report not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await callGetQueries("999");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/not found/);
  });

  it("returns queries with stats and computed completion percent", async () => {
    mockFindUnique.mockResolvedValueOnce(SAMPLE_REPORT);
    mockContextThenRows(SAMPLE_QUERY_ROWS);

    const res = await callGetQueries("10");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.reportName).toBe("AI Market Report");
    expect(body.data.queries).toHaveLength(2);

    // First query — partial completion
    const q1 = body.data.queries[0];
    expect(q1.id).toBe(1);
    expect(q1.goal).toBe("Find AI adoption rates");
    expect(q1.searchQueries).toEqual(["AI adoption rate 2024", "enterprise AI statistics"]);
    expect(q1.sourcesCount).toBe(15);
    expect(q1.completedCompanies).toBe(3);
    expect(q1.totalCompanies).toBe(5);
    expect(q1.completionPercent).toBe(60); // 3/5 * 100
    expect(q1.dataPoints).toHaveLength(1);
    expect(q1.dataPoints[0].name).toBe("AI Market Size");

    // Second query — full completion
    const q2 = body.data.queries[1];
    expect(q2.completionPercent).toBe(100); // 5/5 * 100
    expect(q2.dataPoints).toEqual([]); // null data_points → empty array
  });

  it("handles empty queries list", async () => {
    mockFindUnique.mockResolvedValueOnce(SAMPLE_REPORT);
    mockContextThenRows([]);

    const res = await callGetQueries("10");
    const body = await res.json();

    expect(body.data.queries).toHaveLength(0);
  });

  it("computes 0% completion when total_companies is 0", async () => {
    mockFindUnique.mockResolvedValueOnce(SAMPLE_REPORT);
    mockContextThenRows([{
      ...SAMPLE_QUERY_ROWS[0],
      completed_companies: 0,
      total_companies: 0,
    }]);

    const res = await callGetQueries("10");
    const body = await res.json();

    expect(body.data.queries[0].completionPercent).toBe(0);
  });

  it("returns 500 when repository throws", async () => {
    mockFindUnique.mockRejectedValueOnce(new Error("DB error"));

    const res = await callGetQueries("10");
    expect(res.status).toBe(500);
  });
});

/* ═══════════════════════════════════════════════
   PUT /api/deep-dive/[id]/queries/[queryId]
   ═══════════════════════════════════════════════ */

describe("E2E: PUT /api/deep-dive/[id]/queries/[queryId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when auth fails", async () => {
    (extractAdminFromRequest as jest.Mock).mockReturnValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const res = await callPutQuery("10", "1", { goal: "test", searchQueries: [] });
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric report id", async () => {
    const res = await callPutQuery("abc", "1", { goal: "test", searchQueries: [] });
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-numeric query id", async () => {
    const res = await callPutQuery("10", "abc", { goal: "test", searchQueries: [] });
    expect(res.status).toBe(400);
  });

  it("returns 400 when goal is missing", async () => {
    const res = await callPutQuery("10", "1", { searchQueries: ["q1"] });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/goal.*searchQueries/i);
  });

  it("returns 400 when searchQueries is not an array", async () => {
    const res = await callPutQuery("10", "1", { goal: "test", searchQueries: "not-an-array" });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/goal.*searchQueries/i);
  });

  it("returns 404 when query does not belong to report", async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await callPutQuery("10", "1", { goal: "Updated goal", searchQueries: [] });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/not found/);
  });

  it("returns 400 when goal is empty (whitespace only)", async () => {
    mockFindFirst.mockResolvedValueOnce({ report_id: 10, data_collection_query_id: BigInt(1) });

    const res = await callPutQuery("10", "1", { goal: "   ", searchQueries: [] });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/empty/i);
  });

  it("updates query successfully — trims goal and filters empty search queries", async () => {
    mockFindFirst.mockResolvedValueOnce({ report_id: 10, data_collection_query_id: BigInt(1) });
    mockUpdate.mockResolvedValueOnce({});

    const res = await callPutQuery("10", "1", {
      goal: "  Updated goal with spaces  ",
      searchQueries: ["valid query", "", "  ", "another valid"],
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    // Verify update was called with trimmed/filtered values
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updateArgs = mockUpdate.mock.calls[0]![0];
    expect(updateArgs.data.query.goal).toBe("Updated goal with spaces");
    expect(updateArgs.data.query.search_queries).toEqual(["valid query", "another valid"]);
  });

  it("returns 500 when repository throws during update", async () => {
    mockFindFirst.mockResolvedValueOnce({ report_id: 10, data_collection_query_id: BigInt(1) });
    mockUpdate.mockRejectedValueOnce(new Error("Write failed"));

    const res = await callPutQuery("10", "1", { goal: "test", searchQueries: [] });
    expect(res.status).toBe(500);
  });

  it("returns 400 when goal is a number (not string)", async () => {
    const res = await callPutQuery("10", "1", { goal: 123, searchQueries: [] });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/goal.*string/i);
  });
});
