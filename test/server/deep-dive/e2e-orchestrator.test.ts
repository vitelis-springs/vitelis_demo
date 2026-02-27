/**
 * @jest-environment node
 *
 * E2E tests for orchestrator endpoint:
 *   GET /api/deep-dive/[id]/orchestrator
 *   PUT /api/deep-dive/[id]/orchestrator (ensure)
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

import { GET, PUT } from "../../../src/app/api/deep-dive/[id]/orchestrator/route";
import { extractAdminFromRequest } from "../../../src/lib/auth";
import { ReportStepsRepository } from "../../../src/app/server/modules/report-steps/report-steps.repository";

function makeRequest(path: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"), options);
}

function callGet(reportId: string): Promise<Response> {
  return GET(makeRequest(`/api/deep-dive/${reportId}/orchestrator`), {
    params: Promise.resolve({ id: reportId }),
  });
}

function callPut(reportId: string): Promise<Response> {
  return PUT(
    makeRequest(`/api/deep-dive/${reportId}/orchestrator`, { method: "PUT" }),
    { params: Promise.resolve({ id: reportId }) }
  );
}

describe("E2E: GET /api/deep-dive/[id]/orchestrator", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("returns 401 when auth fails", async () => {
    (extractAdminFromRequest as jest.Mock).mockReturnValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const res = await callGet("44");
    expect(res.status).toBe(401);
  });

  it("returns default PENDING when orchestrator row does not exist", async () => {
    jest
      .spyOn(ReportStepsRepository, "getOrchestratorByReportId")
      .mockResolvedValueOnce(null);

    const res = await callGet("44");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      reportId: 44,
      status: "PENDING",
      metadata: null,
    });
  });

  it("returns existing orchestrator status", async () => {
    jest.spyOn(ReportStepsRepository, "getOrchestratorByReportId").mockResolvedValueOnce({
      id: 1,
      report_id: 44,
      status: "PROCESSING",
      metadata: { parallel_limit: 2 },
    } as never);

    const res = await callGet("44");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe("PROCESSING");
    expect(body.data.metadata).toEqual({ parallel_limit: 2 });
  });
});

describe("E2E: PUT /api/deep-dive/[id]/orchestrator", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("returns 400 for invalid report id", async () => {
    const res = await callPut("abc");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Invalid report id/);
  });

  it("returns 404 when report does not exist", async () => {
    jest.spyOn(ReportStepsRepository, "reportExists").mockResolvedValueOnce(false);

    const res = await callPut("44");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/Report not found/);
  });

  it("creates orchestrator row on first ensure", async () => {
    jest.spyOn(ReportStepsRepository, "reportExists").mockResolvedValueOnce(true);
    jest.spyOn(ReportStepsRepository, "ensureOrchestrator").mockResolvedValueOnce({
      created: true,
      orchestrator: {
        id: 5,
        report_id: 44,
        status: "PENDING",
        metadata: {},
      },
    } as never);

    const res = await callPut("44");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.created).toBe(true);
    expect(body.data.status).toBe("PENDING");
  });

  it("is idempotent when orchestrator already exists", async () => {
    jest.spyOn(ReportStepsRepository, "reportExists").mockResolvedValueOnce(true);
    jest.spyOn(ReportStepsRepository, "ensureOrchestrator").mockResolvedValueOnce({
      created: false,
      orchestrator: {
        id: 6,
        report_id: 44,
        status: "DONE",
        metadata: { finished_at: "2026-02-24T10:00:00.000Z" },
      },
    } as never);

    const res = await callPut("44");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.created).toBe(false);
    expect(body.data.status).toBe("DONE");
  });

  it("returns 500 when repository throws", async () => {
    jest.spyOn(ReportStepsRepository, "reportExists").mockRejectedValueOnce(new Error("DB down"));

    const res = await callPut("44");
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
