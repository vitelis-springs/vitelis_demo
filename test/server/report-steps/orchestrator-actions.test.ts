/**
 * @jest-environment node
 *
 * The n8n half of the controller check:
 *   PATCH /api/deep-dive/[id]/orchestrator        (set the status)
 *   POST  /api/deep-dive/[id]/orchestrator/trigger (engine tick)
 *
 * A tab opened while n8n was driving keeps offering n8n's controls after an
 * operator flips the switch to sm_engine. Firing them then would drive a
 * report the engine owns — the tick especially, which is a live pg_notify to
 * the n8n orchestrators. Nothing here reaches n8n: the service is stubbed.
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

jest.mock(
	"../../../src/app/server/modules/sm-engine/sm-engine-control.repository",
	() => {
		const actual = jest.requireActual(
			"../../../src/app/server/modules/sm-engine/sm-engine-control.repository",
		);
		return {
			...actual,
			SmEngineControlRepository: { getController: jest.fn() },
		};
	},
);

import {
	PATCH,
	POST as postStart,
} from "../../../src/app/api/deep-dive/[id]/orchestrator/route";
import { POST as postTick } from "../../../src/app/api/deep-dive/[id]/orchestrator/trigger/route";
import {
	SmEngineControlRepository,
	SmEngineControlUnreadableError,
} from "../../../src/app/server/modules/sm-engine/sm-engine-control.repository";
import { ReportStepsService } from "../../../src/app/server/modules/report-steps/report-steps.service";

const control = SmEngineControlRepository as jest.Mocked<
	typeof SmEngineControlRepository
>;

function makeRequest(path: string, body?: unknown): NextRequest {
	return new NextRequest(new URL(path, "http://localhost:3000"), {
		method: "POST",
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

const callPatch = (body: unknown) =>
	PATCH(makeRequest("/api/deep-dive/44/orchestrator", body), {
		params: Promise.resolve({ id: "44" }),
	});

const callTick = (body: unknown) =>
	postTick(makeRequest("/api/deep-dive/44/orchestrator/trigger", body), {
		params: Promise.resolve({ id: "44" }),
	});

const callStartOrchestrator = () =>
	postStart(makeRequest("/api/deep-dive/44/orchestrator", {}), {
		params: Promise.resolve({ id: "44" }),
	});

let updateOrchestrator: jest.SpyInstance;
let triggerEngineTick: jest.SpyInstance;
let startOrchestrator: jest.SpyInstance;

beforeEach(() => {
	jest.clearAllMocks();

	updateOrchestrator = jest
		.spyOn(ReportStepsService, "updateOrchestrator")
		.mockResolvedValue({ success: true, data: {} } as never);
	triggerEngineTick = jest
		.spyOn(ReportStepsService, "triggerEngineTick")
		.mockResolvedValue({ success: true } as never);
	startOrchestrator = jest
		.spyOn(ReportStepsService, "startOrchestrator")
		.mockResolvedValue({ success: true } as never);
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe("while n8n is still the one driving", () => {
	beforeEach(() => {
		control.getController.mockResolvedValue("n8n");
	});

	it("sets the status", async () => {
		const res = await callPatch({ status: "PROCESSING" });

		expect(res.status).toBe(200);
		expect(updateOrchestrator).toHaveBeenCalled();
	});

	it("sends the engine tick", async () => {
		const res = await callTick({ instance: 1 });

		expect(res.status).toBe(200);
		expect(triggerEngineTick).toHaveBeenCalledWith(44, 1);
	});

	it("starts the orchestrator", async () => {
		expect((await callStartOrchestrator()).status).toBe(200);
		expect(startOrchestrator).toHaveBeenCalled();
	});
});

describe("once the switch says sm_engine", () => {
	beforeEach(() => {
		control.getController.mockResolvedValue("sm_engine");
	});

	it("refuses to set the status by hand", async () => {
		const res = await callPatch({ status: "PROCESSING" });

		expect(res.status).toBe(409);
		await expect(res.json()).resolves.toMatchObject({
			success: false,
			code: "CONTROLLER_CHANGED",
			data: { controller: "sm_engine" },
		});
		expect(updateOrchestrator).not.toHaveBeenCalled();
	});

	/** The tick is a live pg_notify to the n8n orchestrators. */
	it("refuses to fire an engine tick", async () => {
		const res = await callTick({ instance: 1 });

		expect(res.status).toBe(409);
		expect(triggerEngineTick).not.toHaveBeenCalled();
	});

	it("refuses to start the orchestrator", async () => {
		expect((await callStartOrchestrator()).status).toBe(409);
		expect(startOrchestrator).not.toHaveBeenCalled();
	});

	/**
	 * The metadata on that row is the per-report parallel limit, which the
	 * engine reads too — editing it is not an n8n action, and the settings
	 * editor stays usable under either orchestrator.
	 */
	it("still allows a metadata-only edit", async () => {
		const res = await callPatch({ metadata: { max_parallel: 5 } });

		expect(res.status).toBe(200);
		expect(updateOrchestrator).toHaveBeenCalledWith(44, undefined, {
			max_parallel: 5,
		});
	});
});

/**
 * Closed, not open. Waving n8n actions through on an unreadable setting is
 * what let a tab opened before the flip drive a report the engine owns, and
 * "the engine is down" is precisely when that tab is most likely to still be
 * showing n8n's controls. The switch is read from this app's own database, so
 * refusing here costs n8n nothing that was not already broken.
 */
describe("when the setting cannot be read at all", () => {
	beforeEach(() => {
		control.getController.mockRejectedValue(
			new SmEngineControlUnreadableError(new Error("connection refused")),
		);
	});

	it("refuses the status change instead of assuming n8n", async () => {
		const res = await callPatch({ status: "PROCESSING" });

		expect(res.status).toBe(503);
		await expect(res.json()).resolves.toMatchObject({
			code: "CONTROLLER_UNREADABLE",
		});
		expect(updateOrchestrator).not.toHaveBeenCalled();
	});

	it("refuses the tick too", async () => {
		expect((await callTick({ instance: 1 })).status).toBe(503);
		expect(triggerEngineTick).not.toHaveBeenCalled();
	});

	/** Still not an action, so it is still allowed. */
	it("keeps a metadata-only edit working", async () => {
		const res = await callPatch({ metadata: { max_parallel: 5 } });

		expect(res.status).toBe(200);
		expect(updateOrchestrator).toHaveBeenCalled();
	});
});
