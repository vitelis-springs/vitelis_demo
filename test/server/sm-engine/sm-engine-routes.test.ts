/**
 * @jest-environment node
 *
 * E2E tests for the SM Engine run-control endpoints:
 *   GET  /api/orchestrator/controller
 *   GET  /api/deep-dive/[id]/run
 *   POST /api/deep-dive/[id]/run/start
 *   POST /api/deep-dive/[id]/run/pause
 *
 * Full route handler -> controller -> service chain, with the engine's HTTP
 * client mocked at the boundary. Nothing here reaches a network, a database,
 * or n8n: the n8n path is a live mechanism and must never be fired by a test.
 */
import { NextRequest } from "next/server";

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

jest.mock("../../../src/app/server/modules/sm-engine/sm-engine.client", () => {
	const actual = jest.requireActual(
		"../../../src/app/server/modules/sm-engine/sm-engine.client",
	);
	return {
		...actual,
		SmEngineClient: {
			listRuns: jest.fn(),
			triggerRun: jest.fn(),
			pauseRun: jest.fn(),
			resumeRun: jest.fn(),
		},
	};
});

import { GET as getController } from "../../../src/app/api/orchestrator/controller/route";
import { GET as getRun } from "../../../src/app/api/deep-dive/[id]/run/route";
import { POST as postPause } from "../../../src/app/api/deep-dive/[id]/run/pause/route";
import { POST as postStart } from "../../../src/app/api/deep-dive/[id]/run/start/route";
import {
	SmEngineClient,
	SmEngineNotConfiguredError,
	SmEngineRequestError,
	type SmEngineRun,
	SmEngineUnreachableError,
} from "../../../src/app/server/modules/sm-engine/sm-engine.client";
import {
	SmEngineControlRepository,
	SmEngineControlUnreadableError,
} from "../../../src/app/server/modules/sm-engine/sm-engine-control.repository";
import { extractAdminFromRequest } from "../../../src/lib/auth";

const client = SmEngineClient as jest.Mocked<typeof SmEngineClient>;
const control = SmEngineControlRepository as jest.Mocked<
	typeof SmEngineControlRepository
>;

function makeRequest(path: string, method = "GET"): NextRequest {
	return new NextRequest(new URL(path, "http://localhost:3000"), { method });
}

function run(overrides: Partial<SmEngineRun> = {}): SmEngineRun {
	return {
		id: 7,
		report_id: 9522,
		status: "active",
		max_parallel: 3,
		in_flight: 1,
		trigger_reason: "manual",
		triggered_by: null,
		started_at: "2026-08-20T10:00:00.000Z",
		finished_at: null,
		created_at: "2026-08-20T10:00:00.000Z",
		updated_at: "2026-08-20T10:00:00.000Z",
		execution_state: "running",
		requires_user_action: false,
		...overrides,
	};
}

const callController = () =>
	getController(makeRequest("/api/orchestrator/controller"));

const callGetRun = (reportId: string) =>
	getRun(makeRequest(`/api/deep-dive/${reportId}/run`), {
		params: Promise.resolve({ id: reportId }),
	});

const callStart = (reportId: string) =>
	postStart(makeRequest(`/api/deep-dive/${reportId}/run/start`, "POST"), {
		params: Promise.resolve({ id: reportId }),
	});

const callPause = (reportId: string) =>
	postPause(makeRequest(`/api/deep-dive/${reportId}/run/pause`, "POST"), {
		params: Promise.resolve({ id: reportId }),
	});

beforeEach(() => {
	jest.clearAllMocks();
	// Actions re-read the controller before doing anything; unless a test
	// says otherwise, the engine is the one driving.
	control.getController.mockResolvedValue("sm_engine");
});

describe("GET /api/orchestrator/controller", () => {
	it("returns 401 when auth fails", async () => {
		(extractAdminFromRequest as jest.Mock).mockReturnValueOnce({
			success: false,
			response: new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
			}),
		});

		expect((await callController()).status).toBe(401);
		expect(control.getController).not.toHaveBeenCalled();
	});

	it("reports the current orchestrator", async () => {
		control.getController.mockResolvedValueOnce("sm_engine");

		const res = await callController();

		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({
			success: true,
			data: { controller: "sm_engine" },
		});
	});

	/**
	 * The switch is read out of this app's own database, so it keeps
	 * answering while the engine is down — which is the whole reason the
	 * guard below can refuse an n8n action instead of guessing.
	 */
	it("does not need the engine to answer", async () => {
		control.getController.mockResolvedValueOnce("n8n");

		const res = await callController();

		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({
			success: true,
			data: { controller: "n8n" },
		});
		expect(client.listRuns).not.toHaveBeenCalled();
	});

	it("says so when even the database cannot answer", async () => {
		control.getController.mockRejectedValueOnce(
			new SmEngineControlUnreadableError(new Error("connection refused")),
		);

		const res = await callController();

		expect(res.status).toBe(503);
		await expect(res.json()).resolves.toMatchObject({
			success: false,
			code: "CONTROLLER_UNREADABLE",
		});
	});
});

describe("GET /api/deep-dive/[id]/run", () => {
	it("rejects an invalid report id before calling the engine", async () => {
		const res = await callGetRun("not-a-number");

		expect(res.status).toBe(400);
		expect(client.listRuns).not.toHaveBeenCalled();
	});

	it("returns the active run", async () => {
		client.listRuns.mockResolvedValueOnce([run()]);

		const res = await callGetRun("9522");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.run).toMatchObject({ id: 7, execution_state: "running" });
	});

	it("returns null for a report that was never started", async () => {
		client.listRuns.mockResolvedValueOnce([]);

		const body = await (await callGetRun("9522")).json();

		expect(body.data.run).toBeNull();
	});

	it("prefers the run an action can still touch", async () => {
		client.listRuns.mockResolvedValueOnce([
			run({ id: 1, status: "completed", execution_state: "completed" }),
			run({ id: 2, status: "paused", execution_state: "paused" }),
		]);

		const body = await (await callGetRun("9522")).json();

		expect(body.data.run.id).toBe(2);
	});

	/**
	 * Dropping finished runs would render a completed report as one that was
	 * never started — with a Start button that quietly opens a second run.
	 */
	it("still reports a report whose only run has finished", async () => {
		client.listRuns.mockResolvedValueOnce([
			run({ id: 3, status: "completed", execution_state: "completed" }),
		]);

		const body = await (await callGetRun("9522")).json();

		expect(body.data.run).toMatchObject({
			id: 3,
			execution_state: "completed",
		});
	});

	it("takes the newest run when every one of them has finished", async () => {
		// The engine lists runs newest-first.
		client.listRuns.mockResolvedValueOnce([
			run({ id: 9, status: "failed", execution_state: "failed" }),
			run({ id: 8, status: "completed", execution_state: "completed" }),
		]);

		const body = await (await callGetRun("9522")).json();

		expect(body.data.run.id).toBe(9);
	});
});

describe("POST /api/deep-dive/[id]/run/start", () => {
	it("triggers a new run when the report has none", async () => {
		client.listRuns.mockResolvedValueOnce([]);
		client.triggerRun.mockResolvedValueOnce(run());

		const res = await callStart("9522");

		expect(res.status).toBe(200);
		expect(client.triggerRun).toHaveBeenCalledWith(9522);
		expect(client.resumeRun).not.toHaveBeenCalled();
		await expect(res.json()).resolves.toMatchObject({
			data: { action: "triggered" },
		});
	});

	/**
	 * The whole reason start is a server-side branch. Triggering is idempotent
	 * on the engine, so calling it here would return the paused run untouched
	 * and the click would silently do nothing.
	 */
	it("resumes a paused run instead of triggering a new one", async () => {
		client.listRuns.mockResolvedValueOnce([
			run({ id: 42, status: "paused", execution_state: "paused" }),
		]);
		client.resumeRun.mockResolvedValueOnce(run({ id: 42 }));

		const res = await callStart("9522");

		expect(res.status).toBe(200);
		expect(client.resumeRun).toHaveBeenCalledWith(42);
		expect(client.triggerRun).not.toHaveBeenCalled();
		await expect(res.json()).resolves.toMatchObject({
			data: { action: "resumed" },
		});
	});

	/**
	 * Nothing happened, and the response says so: the UI would otherwise pop
	 * "Report started" over a run that has been going for an hour.
	 */
	it("leaves an already-running run alone and admits it did nothing", async () => {
		client.listRuns.mockResolvedValueOnce([run({ id: 42 })]);

		const res = await callStart("9522");

		expect(res.status).toBe(200);
		expect(client.triggerRun).not.toHaveBeenCalled();
		expect(client.resumeRun).not.toHaveBeenCalled();
		await expect(res.json()).resolves.toMatchObject({
			data: { action: "already_running" },
		});
	});

	it("passes a rejection from the engine through with its own status", async () => {
		client.listRuns.mockResolvedValueOnce([]);
		client.triggerRun.mockRejectedValueOnce(
			new SmEngineRequestError(404, "Report 9522 not found"),
		);

		const res = await callStart("9522");

		expect(res.status).toBe(404);
		await expect(res.json()).resolves.toMatchObject({
			code: "ENGINE_REJECTED",
		});
	});

	it("says the engine is unreachable rather than half-starting", async () => {
		client.listRuns.mockRejectedValueOnce(
			new SmEngineUnreachableError(new Error("ECONNREFUSED")),
		);

		const res = await callStart("9522");

		expect(res.status).toBe(503);
		await expect(res.json()).resolves.toMatchObject({
			code: "ENGINE_UNREACHABLE",
		});
	});

	it("says so when the engine address is not configured", async () => {
		client.listRuns.mockRejectedValueOnce(
			new SmEngineNotConfiguredError("SM_ENGINE_BASE_URL"),
		);

		const res = await callStart("9522");

		expect(res.status).toBe(503);
		await expect(res.json()).resolves.toMatchObject({
			code: "ENGINE_NOT_CONFIGURED",
		});
	});

	it("turns an engine-side failure into a 502", async () => {
		client.listRuns.mockResolvedValueOnce([]);
		client.triggerRun.mockRejectedValueOnce(
			new SmEngineRequestError(500, "boom"),
		);

		expect((await callStart("9522")).status).toBe(502);
	});
});

describe("POST /api/deep-dive/[id]/run/pause", () => {
	it("pauses the active run", async () => {
		client.listRuns.mockResolvedValueOnce([run({ id: 42 })]);
		client.pauseRun.mockResolvedValueOnce(
			run({ id: 42, status: "paused", execution_state: "paused" }),
		);

		const res = await callPause("9522");

		expect(res.status).toBe(200);
		expect(client.pauseRun).toHaveBeenCalledWith(42);
	});

	it("refuses when there is no active run to pause", async () => {
		client.listRuns.mockResolvedValueOnce([]);

		const res = await callPause("9522");

		expect(res.status).toBe(409);
		await expect(res.json()).resolves.toMatchObject({ code: "NO_ACTIVE_RUN" });
		expect(client.pauseRun).not.toHaveBeenCalled();
	});

	it("refuses to pause a run that is already paused", async () => {
		client.listRuns.mockResolvedValueOnce([
			run({ id: 42, status: "paused", execution_state: "paused" }),
		]);

		expect((await callPause("9522")).status).toBe(409);
		expect(client.pauseRun).not.toHaveBeenCalled();
	});
});

/**
 * The browser's axios interceptor logs the user out and redirects to /login on
 * *any* 401 it sees. The engine answers 401 when this server's own token is
 * wrong, and the controller check runs on every report page — relaying that
 * status would throw whoever opened the page back to the login screen over a
 * server-side misconfiguration, with no sign of what went wrong.
 */
describe("how the engine's own auth failures are relayed", () => {
	it.each([
		401, 403,
	])("never answers %s when the engine rejects this server's token", async (status) => {
		control.getController.mockRejectedValueOnce(
			new SmEngineRequestError(status, "Missing or invalid API token"),
		);

		const res = await callController();

		expect(res.status).toBe(502);
		await expect(res.json()).resolves.toMatchObject({
			success: false,
			code: "ENGINE_UNAUTHORIZED",
		});
	});

	it("relays it as a server-side failure on an action too", async () => {
		client.listRuns.mockRejectedValueOnce(
			new SmEngineRequestError(401, "Missing or invalid API token"),
		);

		const res = await callStart("9522");

		expect(res.status).toBe(502);
		await expect(res.json()).resolves.toMatchObject({
			code: "ENGINE_UNAUTHORIZED",
		});
	});

	it("still passes through a 404 and a 409, which are about the request", async () => {
		client.listRuns.mockResolvedValueOnce([]);
		client.triggerRun.mockRejectedValueOnce(
			new SmEngineRequestError(409, "conflict"),
		);

		expect((await callStart("9522")).status).toBe(409);
	});
});
/**
 * The controller is a global switch an operator can flip at any moment, and
 * the browser caches which one it saw. A tab left open across the flip still
 * renders the engine's Start and Pause — and firing them would start or stop
 * a job in an orchestrator that no longer owns the report, silently. Only the
 * server can see the current value, so it checks on every action.
 */
describe("acting for an orchestrator that no longer drives reports", () => {
	it("refuses to start a run once the switch says n8n", async () => {
		control.getController.mockResolvedValue("n8n");

		const res = await callStart("9522");

		expect(res.status).toBe(409);
		await expect(res.json()).resolves.toMatchObject({
			success: false,
			code: "CONTROLLER_CHANGED",
			data: { controller: "n8n" },
		});
	});

	it("checks before touching the engine at all", async () => {
		control.getController.mockResolvedValue("n8n");

		await callStart("9522");

		expect(client.listRuns).not.toHaveBeenCalled();
		expect(client.triggerRun).not.toHaveBeenCalled();
		expect(client.resumeRun).not.toHaveBeenCalled();
	});

	it("refuses to pause a run once the switch says n8n", async () => {
		control.getController.mockResolvedValue("n8n");

		const res = await callPause("9522");

		expect(res.status).toBe(409);
		await expect(res.json()).resolves.toMatchObject({
			code: "CONTROLLER_CHANGED",
		});
		expect(client.pauseRun).not.toHaveBeenCalled();
	});

	/** An unreadable setting authorises nothing. */
	it("does not act when the setting itself cannot be read", async () => {
		control.getController.mockRejectedValueOnce(
			new SmEngineControlUnreadableError(new Error("connection refused")),
		);

		const res = await callStart("9522");

		expect(res.status).toBe(503);
		await expect(res.json()).resolves.toMatchObject({
			code: "CONTROLLER_UNREADABLE",
		});
		expect(client.triggerRun).not.toHaveBeenCalled();
	});

	it("still reads the run while the engine drives", async () => {
		client.listRuns.mockResolvedValueOnce([run()]);

		expect((await callGetRun("9522")).status).toBe(200);
	});
});
