/**
 * @jest-environment node
 *
 * Covers the one thing the route tests cannot: the URL this client actually
 * builds. Those tests mock the client at the module boundary, so a wrong path
 * passes them and then 404s against the running engine — which is exactly what
 * happened with the missing version segment.
 *
 * `fetch` is stubbed, so nothing leaves the process.
 */
import {
	SmEngineClient,
	SmEngineNotConfiguredError,
	SmEngineRequestError,
	SmEngineUnreachableError,
} from "../../../src/app/server/modules/sm-engine/sm-engine.client";

const ORIGINAL_ENV = process.env;

function mockFetch(response: Partial<Response> = {}): jest.Mock {
	const fn = jest.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: async () => [],
		text: async () => "",
		...response,
	});
	global.fetch = fn as unknown as typeof fetch;
	return fn;
}

function calledUrl(fn: jest.Mock): string {
	return fn.mock.calls[0][0] as string;
}

beforeEach(() => {
	process.env = {
		...ORIGINAL_ENV,
		SM_ENGINE_BASE_URL: "http://localhost:3008",
		SM_ENGINE_API_TOKEN: "test-token",
	};
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
});

describe("the address it calls", () => {
	/**
	 * The engine sets a global prefix *and* URI versioning with default
	 * version 1. Drop the version and every call 404s.
	 */
	it("includes the engine's version segment", async () => {
		const fetchMock = mockFetch();

		await SmEngineClient.listRuns(9522);

		expect(calledUrl(fetchMock)).toBe(
			"http://localhost:3008/api/v1/report-orchestration/reports/9522/runs",
		);
	});

	it.each([
		["pauseRun", (id: number) => SmEngineClient.pauseRun(id), "pause"],
		["resumeRun", (id: number) => SmEngineClient.resumeRun(id), "resume"],
	])("posts %s to the run's own path", async (_name, call, action) => {
		const fetchMock = mockFetch({ json: async () => ({}) });

		await call(42);

		expect(calledUrl(fetchMock)).toBe(
			`http://localhost:3008/api/v1/report-orchestration/runs/42/${action}`,
		);
		expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
	});

	it("tolerates a trailing slash on the configured origin", async () => {
		process.env.SM_ENGINE_BASE_URL = "http://localhost:3008/";
		const fetchMock = mockFetch();

		await SmEngineClient.listRuns(9522);

		expect(calledUrl(fetchMock)).toBe(
			"http://localhost:3008/api/v1/report-orchestration/reports/9522/runs",
		);
	});
});

describe("how it authenticates", () => {
	it("sends the token as a bearer header", async () => {
		const fetchMock = mockFetch();

		await SmEngineClient.listRuns(9522);

		expect(fetchMock.mock.calls[0][1]).toMatchObject({
			headers: expect.objectContaining({
				Authorization: "Bearer test-token",
			}),
		});
	});

	it.each([
		"SM_ENGINE_BASE_URL",
		"SM_ENGINE_API_TOKEN",
	])("refuses to call anything when %s is missing", async (setting) => {
		delete process.env[setting];
		const fetchMock = mockFetch();

		await expect(SmEngineClient.listRuns(9522)).rejects.toBeInstanceOf(
			SmEngineNotConfiguredError,
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe("how it reports failure", () => {
	it("keeps the engine's status on a rejection", async () => {
		mockFetch({ ok: false, status: 409, text: async () => "not paused" });

		await expect(SmEngineClient.pauseRun(42)).rejects.toMatchObject({
			status: 409,
			body: "not paused",
		});
	});

	it("still reports the status when the error body cannot be read", async () => {
		mockFetch({
			ok: false,
			status: 500,
			text: async () => {
				throw new Error("stream already consumed");
			},
		});

		await expect(SmEngineClient.listRuns(9522)).rejects.toBeInstanceOf(
			SmEngineRequestError,
		);
	});

	it("distinguishes an unreachable engine from a rejected request", async () => {
		global.fetch = jest
			.fn()
			.mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;

		await expect(SmEngineClient.listRuns(9522)).rejects.toBeInstanceOf(
			SmEngineUnreachableError,
		);
	});
});
