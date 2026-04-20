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

const USE_CASES = [
  { id: 1, name: "Sales" },
  { id: 2, name: "Research" },
];

const SNAPSHOT_INITIAL = {
  reportId: 44,
  reportName: "Deep Dive 44",
  reportDescription: null,
  reportUseCaseId: null,
  reportUseCaseName: null,
  reportSettingsId: 1,
  sourceValidationSettingsId: 10,
  reportSettings: {
    id: 1,
    name: "Base Report",
    masterFileId: "master-1",
    prefix: 7,
    settings: { temp: 0.4 },
  },
  validatorSettings: {
    id: 10,
    name: "Provision v1",
    settings: { minScore: 0.7 },
  },
};

const VALID_PATCH_BODY = {
  reportInfo: { name: "Updated Name", description: null, useCaseId: null },
  reportSettings: { name: "RS Name", masterFileId: "file-id", prefix: null, settings: { k: 1 } },
  validatorSettings: { name: "VS Name", settings: { minScore: 0.8 } },
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
    jest.spyOn(DeepDiveRepository, "listAllUseCases").mockResolvedValueOnce(USE_CASES);

    const res = await callGetSettings("44");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it("returns current settings and available options", async () => {
    jest
      .spyOn(DeepDiveRepository, "getReportSettingsSnapshot")
      .mockResolvedValueOnce(SNAPSHOT_INITIAL);
    jest.spyOn(DeepDiveRepository, "listAllUseCases").mockResolvedValueOnce(USE_CASES);

    const res = await callGetSettings("44");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.report.id).toBe(44);
    expect(body.data.report.name).toBe("Deep Dive 44");
    expect(body.data.current.reportSettings.id).toBe(1);
    expect(body.data.current.validatorSettings.id).toBe(10);
    expect(body.data.options.useCases).toHaveLength(2);
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

  it("returns 400 when payload is missing required fields", async () => {
    const res = await callPatchSettings("44", { reportInfo: { name: "X" } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Invalid payload/);
  });

  it("returns 404 when report does not exist", async () => {
    jest.spyOn(DeepDiveRepository, "getReportSettingsSnapshot").mockResolvedValueOnce(null);

    const res = await callPatchSettings("44", VALID_PATCH_BODY);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/Deep dive not found/);
  });

  it("updates existing settings in place", async () => {
    const snapshotAfter = {
      ...SNAPSHOT_INITIAL,
      reportName: "Updated Name",
      reportSettings: { ...SNAPSHOT_INITIAL.reportSettings, settings: { k: 1 } },
      validatorSettings: { ...SNAPSHOT_INITIAL.validatorSettings, settings: { minScore: 0.8 } },
    };

    jest
      .spyOn(DeepDiveRepository, "getReportSettingsSnapshot")
      .mockResolvedValueOnce(SNAPSHOT_INITIAL)
      .mockResolvedValueOnce(snapshotAfter);

    const updateBasicSpy = jest
      .spyOn(DeepDiveRepository, "updateReportBasicInfo")
      .mockResolvedValueOnce({ id: 44, name: "Updated Name", description: null, use_case_id: null });

    const updateRsSpy = jest
      .spyOn(DeepDiveRepository, "updateReportSettingsData")
      .mockResolvedValueOnce({} as never);

    const updateVsSpy = jest
      .spyOn(DeepDiveRepository, "updateValidatorSettingsData")
      .mockResolvedValueOnce({} as never);

    jest.spyOn(DeepDiveRepository, "listAllUseCases").mockResolvedValueOnce(USE_CASES);

    const res = await callPatchSettings("44", VALID_PATCH_BODY);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.current.reportSettings.id).toBe(1);
    expect(body.data.current.validatorSettings.id).toBe(10);

    expect(updateBasicSpy).toHaveBeenCalledWith(44, expect.objectContaining({ name: "Updated Name" }));
    expect(updateRsSpy).toHaveBeenCalledWith(1, expect.objectContaining({ settings: { k: 1 } }));
    expect(updateVsSpy).toHaveBeenCalledWith(10, expect.objectContaining({ settings: { minScore: 0.8 } }));
  });

  it("creates new settings records when report has none", async () => {
    const snapshotNoSettings = {
      ...SNAPSHOT_INITIAL,
      reportSettingsId: null,
      sourceValidationSettingsId: null,
      reportSettings: null,
      validatorSettings: null,
    };

    const snapshotAfter = {
      ...SNAPSHOT_INITIAL,
      reportSettingsId: 99,
      sourceValidationSettingsId: 88,
      reportSettings: { id: 99, name: "RS Name", masterFileId: "file-id", prefix: null, settings: { k: 1 } },
      validatorSettings: { id: 88, name: "VS Name", settings: { minScore: 0.8 } },
    };

    jest
      .spyOn(DeepDiveRepository, "getReportSettingsSnapshot")
      .mockResolvedValueOnce(snapshotNoSettings)
      .mockResolvedValueOnce(snapshotAfter);

    jest
      .spyOn(DeepDiveRepository, "updateReportBasicInfo")
      .mockResolvedValueOnce({ id: 44, name: "Updated Name", description: null, use_case_id: null });

    const createRsSpy = jest
      .spyOn(DeepDiveRepository, "createReportSettings")
      .mockResolvedValueOnce({ id: 99, name: "RS Name", masterFileId: "file-id", prefix: null, settings: { k: 1 } });

    const createVsSpy = jest
      .spyOn(DeepDiveRepository, "createValidatorSettings")
      .mockResolvedValueOnce({ id: 88, name: "VS Name", settings: { minScore: 0.8 } });

    const updateRefsSpy = jest
      .spyOn(DeepDiveRepository, "updateReportSettingsReferences")
      .mockResolvedValueOnce(true);

    jest.spyOn(DeepDiveRepository, "listAllUseCases").mockResolvedValueOnce(USE_CASES);

    const res = await callPatchSettings("44", VALID_PATCH_BODY);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.current.reportSettings.id).toBe(99);
    expect(body.data.current.validatorSettings.id).toBe(88);

    expect(createRsSpy).toHaveBeenCalledTimes(1);
    expect(createVsSpy).toHaveBeenCalledTimes(1);
    expect(updateRefsSpy).toHaveBeenCalledWith(44, 99, 88);
  });
});
