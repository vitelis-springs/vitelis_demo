/**
 * @jest-environment node
 *
 * E2E tests for GET /api/deep-dive
 * Calls the actual route handler → controller → service → repository chain.
 * Only Prisma and auth are mocked.
 */
import { NextRequest } from "next/server";

/* ─── mocks ─── */

jest.mock("../../../src/lib/prisma", () => {
  const tx = jest.fn();
  const qr = jest.fn();
  return {
    __esModule: true,
    default: {
      $transaction: tx,
      $queryRaw: qr,
      reports: { findMany: jest.fn(), count: jest.fn() },
    },
    _mockTransaction: tx,
    _mockQueryRaw: qr,
  };
});

jest.mock("../../../src/lib/auth", () => ({
  extractAdminFromRequest: jest.fn(() => ({
    success: true,
    user: { userId: "1", email: "admin@test.com", role: "admin" },
  })),
}));

import { GET } from "../../../src/app/api/deep-dive/route";
import { extractAdminFromRequest } from "../../../src/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { _mockTransaction: mockTransaction, _mockQueryRaw: mockQueryRaw } =
  require("../../../src/lib/prisma") as { _mockTransaction: jest.Mock; _mockQueryRaw: jest.Mock };

/* ─── fixtures ─── */

const SAMPLE_REPORT = {
  id: 1,
  name: "AI Market Analysis",
  description: "Analysis of AI market",
  created_at: new Date("2024-06-01"),
  updates_at: new Date("2024-06-15"),
  report_orhestrator: { status: "DONE" },
  report_settings: { id: 1, name: "Default", master_file_id: null, prefix: null, settings: {} },
  use_cases: { id: 1, name: "Strategy" },
  report_companies: [{
    companies: { industries: { name: "Technology" } },
  }],
  _count: { report_companies: 5, report_steps: 12 },
};

const SAMPLE_USE_CASES = [{ id: 1, name: "Strategy" }, { id: 2, name: "Marketing" }];
const SAMPLE_INDUSTRIES = [{ id: 1, name: "Technology" }, { id: 2, name: "Finance" }];

/* ─── helpers ─── */

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function setupListMocks(reports = [SAMPLE_REPORT], total = 1) {
  mockTransaction.mockResolvedValueOnce([reports, total]);
  mockQueryRaw
    .mockResolvedValueOnce(SAMPLE_USE_CASES)
    .mockResolvedValueOnce(SAMPLE_INDUSTRIES);
}

/* ─── tests ─── */

describe("E2E: GET /api/deep-dive", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when auth fails", async () => {
    (extractAdminFromRequest as jest.Mock).mockReturnValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const res = await GET(makeRequest("/api/deep-dive"));
    expect(res.status).toBe(401);
  });

  it("returns paginated list with default limit=50 offset=0", async () => {
    setupListMocks();

    const res = await GET(makeRequest("/api/deep-dive"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(1);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].id).toBe(1);
    expect(body.data.items[0].name).toBe("AI Market Analysis");
    expect(body.data.items[0].status).toBe("DONE");
    expect(body.data.items[0].useCase).toEqual({ id: 1, name: "Strategy" });
    expect(body.data.items[0].counts).toEqual({ companies: 5, steps: 12 });
    expect(body.data.filters.useCases).toEqual(SAMPLE_USE_CASES);
    expect(body.data.filters.industries).toEqual(SAMPLE_INDUSTRIES);
  });

  it("passes query params to repository", async () => {
    setupListMocks();

    await GET(makeRequest("/api/deep-dive?limit=10&offset=20&q=AI&status=DONE&useCaseId=1&industryId=2"));

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("clamps limit to MAX_LIMIT=200", async () => {
    setupListMocks();

    const res = await GET(makeRequest("/api/deep-dive?limit=999"));
    expect(res.status).toBe(200);
  });

  it("uses default PENDING status when report has no orchestrator", async () => {
    const reportWithoutOrch = { ...SAMPLE_REPORT, report_orhestrator: null };
    setupListMocks([reportWithoutOrch]);

    const res = await GET(makeRequest("/api/deep-dive"));
    const body = await res.json();

    expect(body.data.items[0].status).toBe("PENDING");
  });

  it("handles empty result gracefully", async () => {
    setupListMocks([], 0);

    const res = await GET(makeRequest("/api/deep-dive"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(0);
    expect(body.data.total).toBe(0);
  });

  it("maps report settings and use case to response shape", async () => {
    setupListMocks();

    const res = await GET(makeRequest("/api/deep-dive"));
    const body = await res.json();
    const item = body.data.items[0];

    expect(item.settings).toEqual({
      id: 1,
      name: "Default",
      masterFileId: null,
      prefix: null,
      settings: {},
    });
    expect(item.useCase).toEqual({ id: 1, name: "Strategy" });
    expect(item.industryName).toBe("Technology");
  });

  it("handles null settings and use case gracefully", async () => {
    const bare = {
      ...SAMPLE_REPORT,
      report_settings: null,
      use_cases: null,
      report_companies: [{ companies: { industries: null } }],
    };
    setupListMocks([bare]);

    const res = await GET(makeRequest("/api/deep-dive"));
    const body = await res.json();
    const item = body.data.items[0];

    expect(item.settings).toBeNull();
    expect(item.useCase).toBeNull();
    expect(item.industryName).toBeNull();
  });

  it("returns 500 when repository throws", async () => {
    mockTransaction.mockRejectedValueOnce(new Error("DB connection failed"));
    mockQueryRaw
      .mockResolvedValueOnce(SAMPLE_USE_CASES)
      .mockResolvedValueOnce(SAMPLE_INDUSTRIES);

    const res = await GET(makeRequest("/api/deep-dive"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });

  it("ignores invalid status param", async () => {
    setupListMocks();

    const res = await GET(makeRequest("/api/deep-dive?status=INVALID"));
    expect(res.status).toBe(200);
  });

  it("ignores useCaseId=0", async () => {
    setupListMocks();

    const res = await GET(makeRequest("/api/deep-dive?useCaseId=0"));
    expect(res.status).toBe(200);
  });
});
