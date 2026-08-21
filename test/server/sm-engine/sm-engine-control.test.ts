/**
 * @jest-environment node
 *
 * Where "who is driving reports" comes from. Every action refuses on a
 * mismatch, so what this returns — and, more importantly, when it refuses to
 * return anything — decides whether a stale tab can drive the wrong
 * orchestrator.
 */
// The spy is created inside the factory: jest hoists the mock above
// everything else in the file, so it cannot close over a const declared here.
jest.mock("../../../src/lib/prisma", () => {
	const queryRaw = jest.fn();
	return {
		__esModule: true,
		default: { $queryRaw: queryRaw },
		prisma: { $queryRaw: queryRaw },
	};
});

import {
	SmEngineControlRepository,
	SmEngineControlUnreadableError,
} from "../../../src/app/server/modules/sm-engine/sm-engine-control.repository";
import prisma from "../../../src/lib/prisma";

const mockQueryRaw = prisma.$queryRaw as unknown as jest.Mock;

beforeEach(() => {
	jest.clearAllMocks();
});

describe("reading the orchestrator switch", () => {
	it("reports the engine when the row says so", async () => {
		mockQueryRaw.mockResolvedValueOnce([{ controller: "sm_engine" }]);

		await expect(SmEngineControlRepository.getController()).resolves.toBe(
			"sm_engine",
		);
	});

	it("reports n8n when the row says so", async () => {
		mockQueryRaw.mockResolvedValueOnce([{ controller: "n8n" }]);

		await expect(SmEngineControlRepository.getController()).resolves.toBe(
			"n8n",
		);
	});

	/** The engine was installed but never switched on. */
	it("reports n8n when there is no row", async () => {
		mockQueryRaw.mockResolvedValueOnce([]);

		await expect(SmEngineControlRepository.getController()).resolves.toBe(
			"n8n",
		);
	});

	/**
	 * No table means the engine's migration has never run here, so nothing it
	 * owns can be driving. Failing instead would break n8n on databases that
	 * have never heard of the engine.
	 */
	it("reports n8n when the table does not exist", async () => {
		mockQueryRaw.mockRejectedValueOnce(
			Object.assign(new Error('relation "sm_engine_control" does not exist'), {
				meta: { code: "42P01" },
			}),
		);

		await expect(SmEngineControlRepository.getController()).resolves.toBe(
			"n8n",
		);
	});

	it("recognises the missing table from the error text alone", async () => {
		mockQueryRaw.mockRejectedValueOnce(
			new Error("Raw query failed. Code: `42P01`. Message: does not exist"),
		);

		await expect(SmEngineControlRepository.getController()).resolves.toBe(
			"n8n",
		);
	});

	/**
	 * The one that matters: an answer nobody could read must not be turned
	 * into "n8n, then". That guess is what let a tab opened before the switch
	 * was flipped keep driving the losing orchestrator.
	 */
	it("refuses to guess when the read fails for any other reason", async () => {
		mockQueryRaw.mockRejectedValueOnce(new Error("connection refused"));

		await expect(
			SmEngineControlRepository.getController(),
		).rejects.toBeInstanceOf(SmEngineControlUnreadableError);
	});

	it("reads one column of one row, and nothing else", async () => {
		mockQueryRaw.mockResolvedValueOnce([{ controller: "n8n" }]);

		await SmEngineControlRepository.getController();

		const sql = String(mockQueryRaw.mock.calls[0]?.[0]);
		expect(sql).toContain("SELECT controller FROM sm_engine_control");
		expect(sql).toContain("WHERE id = 1");
	});
});
