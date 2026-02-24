/**
 * @jest-environment node
 *
 * E2E tests for:
 *   GET   /api/deep-dive/[id]/settings
 *   PATCH /api/deep-dive/[id]/settings
 *
 * Full route handler -> controller -> service -> repository chain.
 * Auth and Prisma are mocked; repository methods are spied.
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

import { GET, PATCH } from "../../../src/app/api/deep-dive/[id]/settings/route";
import { extractAdminFromRequest } from "../../../src/lib/auth";
import { DeepDiveRepository } from "../../../src/app/server/modules/deep-dive/deep-dive.repository";

function makeRequest(path: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"), options);
}

function callGetSettings(id: string): Promise<Response> {
  return GET(makeRequest(`/api/deep-dive/${id}/settings`), {
    params: Promise.resolve({ id }),
  });
}

function callPatchSettings(id: string, body: unknown): Promise<Response> {
  return PATCH(
    makeRequest(`/api/deep-dive/${id}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  );
}

const REPORT_OPTIONS = [
  { id: 1, name: "Base Report", masterFileId: "master-1", prefix: 7, settings: { temp: 0.4 } },
  { id: 2, name: "Fallback", masterFileId: "master-2", prefix: null, settings: { temp: 0.2 } },
];

const VALIDATOR_OPTIONS = [
  { id: 10, name: "Provision v1", settings: { minScore: 0.7 } },
  { id: 11, name: "Strict", settings: { minScore: 0.9 } },
];

const SNAPSHOT_INITIAL = {
  reportId: 44,
  reportName: "Deep Dive 44",
  reportSettingsId: 1,
  sourceValidationSettingsId: 10,
  reportSettings: REPORT_OPTIONS[0]!,
  validatorSettings: VALIDATOR_OPTIONS[0]!,
};

const SNAPSHOT_UPDATED = {
  reportId: 44,
  reportName: "Deep Dive 44",
  reportSettingsId: 2,
  sourceValidationSettingsId: 11,
  reportSettings: REPORT_OPTIONS[1]!,
  validatorSettings: VALIDATOR_OPTIONS[1]!,
};

describe("E2E: GET /api/deep-dive/[id]/settings", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("returns 401 when auth fails", async () => {
    (extractAdminFromRequest as jest.Mock).mockReturnValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const res = await callGetSettings("44");
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid report id", async () => {
    const res = await callGetSettings("abc");
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Invalid report id/);
  });

  it("returns 404 when report does not exist", async () => {
    jest.spyOn(DeepDiveRepository, "getReportSettingsSnapshot").mockResolvedValueOnce(null);
    jest.spyOn(DeepDiveRepository, "listReportSettings").mockResolvedValueOnce(REPORT_OPTIONS);
    jest.spyOn(DeepDiveRepository, "listValidatorSettings").mockResolvedValueOnce(VALIDATOR_OPTIONS);

    const res = await callGetSettings("44");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it("returns current settings and available options", async () => {
    jest
      .spyOn(DeepDiveRepository, "getReportSettingsSnapshot")
      .mockResolvedValueOnce(SNAPSHOT_INITIAL);
    jest.spyOn(DeepDiveRepository, "listReportSettings").mockResolvedValueOnce(REPORT_OPTIONS);
    jest.spyOn(DeepDiveRepository, "listValidatorSettings").mockResolvedValueOnce(VALIDATOR_OPTIONS);

    const res = await callGetSettings("44");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.report).toEqual({ id: 44, name: "Deep Dive 44" });
    expect(body.data.current.reportSettings.id).toBe(1);
    expect(body.data.current.validatorSettings.id).toBe(10);
    expect(body.data.options.reportSettings).toHaveLength(2);
    expect(body.data.options.validatorSettings).toHaveLength(2);
  });
});

describe("E2E: PATCH /api/deep-dive/[id]/settings", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("returns 400 when body is not an object", async () => {
    const res = await callPatchSettings("44", []);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Body must be an object/);
  });

  it("returns 400 when action format is invalid", async () => {
    const res = await callPatchSettings("44", {
      reportSettingsAction: { mode: "create", strategy: "clone" },
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Invalid reportSettingsAction format/);
  });

  it("returns 404 when report does not exist", async () => {
    jest.spyOn(DeepDiveRepository, "getReportSettingsSnapshot").mockResolvedValueOnce(null);

    const res = await callPatchSettings("44", {
      reportSettingsAction: { mode: "reuse", id: 1 },
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/Deep dive not found/);
  });

  it("updates settings in reuse mode", async () => {
    const snapshotSpy = jest
      .spyOn(DeepDiveRepository, "getReportSettingsSnapshot")
      .mockResolvedValueOnce(SNAPSHOT_INITIAL)
      .mockResolvedValueOnce(SNAPSHOT_UPDATED);

    const reportByIdSpy = jest
      .spyOn(DeepDiveRepository, "getReportSettingsById")
      .mockResolvedValueOnce(REPORT_OPTIONS[1]!);

    const validatorByIdSpy = jest
      .spyOn(DeepDiveRepository, "getValidatorSettingsById")
      .mockResolvedValueOnce(VALIDATOR_OPTIONS[1]!);

    const updateRefsSpy = jest
      .spyOn(DeepDiveRepository, "updateReportSettingsReferences")
      .mockResolvedValueOnce(true);

    jest.spyOn(DeepDiveRepository, "listReportSettings").mockResolvedValueOnce(REPORT_OPTIONS);
    jest.spyOn(DeepDiveRepository, "listValidatorSettings").mockResolvedValueOnce(VALIDATOR_OPTIONS);

    const res = await callPatchSettings("44", {
      reportSettingsAction: { mode: "reuse", id: 2 },
      validatorSettingsAction: { mode: "reuse", id: 11 },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.current.reportSettings.id).toBe(2);
    expect(body.data.current.validatorSettings.id).toBe(11);

    expect(reportByIdSpy).toHaveBeenCalledWith(2);
    expect(validatorByIdSpy).toHaveBeenCalledWith(11);
    expect(updateRefsSpy).toHaveBeenCalledWith(44, 2, 11);
    expect(snapshotSpy).toHaveBeenCalledTimes(2);
  });

  it("creates new settings using clone + blank flows", async () => {
    const snapshotAfter = {
      ...SNAPSHOT_INITIAL,
      reportSettingsId: 77,
      sourceValidationSettingsId: 88,
      reportSettings: {
        id: 77,
        name: "Base Report (Report #44 copy)",
        masterFileId: "master-1",
        prefix: 7,
        settings: { temp: 0.55 },
      },
      validatorSettings: {
        id: 88,
        name: "New Validator",
        settings: { minScore: 0.75 },
      },
    };

    jest
      .spyOn(DeepDiveRepository, "getReportSettingsSnapshot")
      .mockResolvedValueOnce(SNAPSHOT_INITIAL)
      .mockResolvedValueOnce(snapshotAfter);

    jest
      .spyOn(DeepDiveRepository, "getReportSettingsById")
      .mockResolvedValueOnce(REPORT_OPTIONS[0]!);

    const createReportSpy = jest
      .spyOn(DeepDiveRepository, "createReportSettings")
      .mockResolvedValueOnce({
        id: 77,
        name: "Base Report (Report #44 copy)",
        masterFileId: "master-1",
        prefix: 7,
        settings: { temp: 0.55 },
      });

    const createValidatorSpy = jest
      .spyOn(DeepDiveRepository, "createValidatorSettings")
      .mockResolvedValueOnce({
        id: 88,
        name: "New Validator",
        settings: { minScore: 0.75 },
      });

    const updateRefsSpy = jest
      .spyOn(DeepDiveRepository, "updateReportSettingsReferences")
      .mockResolvedValueOnce(true);

    jest.spyOn(DeepDiveRepository, "listReportSettings").mockResolvedValueOnce(REPORT_OPTIONS);
    jest.spyOn(DeepDiveRepository, "listValidatorSettings").mockResolvedValueOnce(VALIDATOR_OPTIONS);

    const res = await callPatchSettings("44", {
      reportSettingsAction: {
        mode: "create",
        strategy: "clone",
        baseId: 1,
        settings: { temp: 0.55 },
      },
      validatorSettingsAction: {
        mode: "create",
        strategy: "blank",
        name: "New Validator",
        settings: { minScore: 0.75 },
      },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.current.reportSettings.id).toBe(77);
    expect(body.data.current.validatorSettings.id).toBe(88);

    expect(createReportSpy).toHaveBeenCalledTimes(1);
    expect(createValidatorSpy).toHaveBeenCalledTimes(1);
    expect(updateRefsSpy).toHaveBeenCalledWith(44, 77, 88);
  });
});
