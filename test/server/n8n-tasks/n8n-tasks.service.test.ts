/**
 * @jest-environment node
 */

jest.mock("../../../src/lib/prisma", () => {
	const findMany = jest.fn();
	const findUnique = jest.fn();
	const create = jest.fn();
	const update = jest.fn();
	const remove = jest.fn();

	return {
		prisma: {
			n8n_tasks: {
				findMany,
				findUnique,
				create,
				update,
				delete: remove,
			},
		},
		_mocks: {
			findMany,
			findUnique,
			create,
			update,
			remove,
		},
	};
});

import { N8NService } from "../../../src/app/server/modules/n8n/n8n.service";
import { N8NTasksRepository } from "../../../src/app/server/modules/n8n-tasks/n8n-tasks.repository";
import { N8NTasksService } from "../../../src/app/server/modules/n8n-tasks/n8n-tasks.service";
import { prisma } from "../../../src/lib/prisma";

type RepoTask = NonNullable<
	Awaited<ReturnType<typeof N8NTasksRepository.findById>>
>;

function makeTask(overrides: Partial<RepoTask> = {}): RepoTask {
	return {
		id: 1,
		work_flow_id: "wf-1",
		work_flow_name: "company-level-report",
		work_flow_url: "https://example.com/webhook",
		status: "PROCESSING",
		execution_id: "exec-1",
		last_seen_execution_status: null,
		last_checked_at: null,
		metadata: { report_id: 101 },
		report_id: 101,
		created_at: new Date("2026-04-20T10:00:00.000Z"),
		updated_at: new Date("2026-04-20T10:00:00.000Z"),
		...overrides,
	} as RepoTask;
}

describe("N8NTasksRepository", () => {
	const prismaClient = prisma as typeof prisma & {
		n8n_tasks: {
			findMany: jest.Mock;
			update: jest.Mock;
		};
	};

	beforeEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
		jest.spyOn(console, "error").mockImplementation(() => undefined);
		jest.spyOn(console, "log").mockImplementation(() => undefined);
	});

	it("findProcessing queries only processing tasks with execution ids", async () => {
		prismaClient.n8n_tasks.findMany.mockResolvedValueOnce([]);

		await N8NTasksRepository.findProcessing(77);

		expect(prismaClient.n8n_tasks.findMany).toHaveBeenCalledWith({
			where: {
				status: "PROCESSING",
				execution_id: { not: null },
				report_id: 77,
			},
			orderBy: { created_at: "desc" },
		});
	});

	it("updateSyncState writes sync fields without dropping updated_at", async () => {
		prismaClient.n8n_tasks.update.mockResolvedValueOnce({});
		const checkedAt = new Date("2026-04-21T09:30:00.000Z");

		await N8NTasksRepository.updateSyncState(5, {
			status: "ERROR",
			executionId: "exec-5",
			lastSeenExecutionStatus: "canceled",
			lastCheckedAt: checkedAt,
		});

		expect(prismaClient.n8n_tasks.update).toHaveBeenCalledWith({
			where: { id: 5 },
			data: expect.objectContaining({
				status: "ERROR",
				execution_id: "exec-5",
				last_seen_execution_status: "canceled",
				last_checked_at: checkedAt,
				updated_at: expect.any(Date),
			}),
		});
	});
});

describe("N8NTasksService", () => {
	beforeEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	it("start sets processing state, execution id, and clears sync fields", async () => {
		jest.spyOn(N8NTasksRepository, "findById").mockResolvedValueOnce(
			makeTask({
				status: "PENDING",
				execution_id: null,
				last_seen_execution_status: "failed",
				last_checked_at: new Date("2026-04-20T10:30:00.000Z"),
			}),
		);
		jest.spyOn(N8NService, "getPublicBizMinerConfig").mockReturnValue({
			url: "https://example.com/",
			apiKey: "secret",
		});
		jest.spyOn(N8NService, "fetchWithTimeoutPublic").mockResolvedValueOnce({
			ok: true,
			json: async () => ({ executionId: 987 }),
		} as Response);
		const updateSpy = jest
			.spyOn(N8NTasksRepository, "updateSyncState")
			.mockResolvedValueOnce(makeTask());

		const result = await N8NTasksService.start(1);

		expect(result).toEqual({ executionId: "987" });
		expect(updateSpy).toHaveBeenCalledWith(
			1,
			expect.objectContaining({
				status: "PROCESSING",
				executionId: "987",
				lastSeenExecutionStatus: null,
				lastCheckedAt: null,
			}),
		);
	});

	it("stop marks task as canceled terminal state", async () => {
		jest
			.spyOn(N8NTasksRepository, "findById")
			.mockResolvedValueOnce(makeTask());
		const stopSpy = jest
			.spyOn(N8NService, "stopExecution")
			.mockResolvedValueOnce(undefined);
		const updateSpy = jest
			.spyOn(N8NTasksRepository, "updateSyncState")
			.mockResolvedValueOnce(makeTask());

		await N8NTasksService.stop(1);

		expect(stopSpy).toHaveBeenCalledWith("exec-1", "bizminer");
		expect(updateSpy).toHaveBeenCalledWith(
			1,
			expect.objectContaining({
				status: "ERROR",
				lastSeenExecutionStatus: "canceled",
				lastCheckedAt: expect.any(Date),
			}),
		);
	});

	it("list syncs eligible processing tasks and leaves running as PROCESSING", async () => {
		jest.spyOn(N8NTasksRepository, "findProcessing").mockResolvedValueOnce([
			makeTask({
				id: 1,
				execution_id: "exec-running",
				last_checked_at: new Date(Date.now() - 31_000),
			}),
		]);
		jest
			.spyOn(N8NTasksRepository, "findAll")
			.mockResolvedValueOnce([makeTask()]);
		jest.spyOn(N8NService, "getExecutionDetails").mockResolvedValueOnce({
			status: "running",
		});
		const updateSpy = jest
			.spyOn(N8NTasksRepository, "updateSyncState")
			.mockResolvedValueOnce(makeTask());

		await N8NTasksService.list(101);

		expect(N8NTasksRepository.findProcessing).toHaveBeenCalledWith(101);
		expect(N8NService.getExecutionDetails).toHaveBeenCalledWith(
			"exec-running",
			"bizminer",
		);
		expect(updateSpy).toHaveBeenCalledWith(
			1,
			expect.objectContaining({
				lastSeenExecutionStatus: "running",
				lastCheckedAt: expect.any(Date),
			}),
		);
		expect(updateSpy.mock.calls[0]?.[1]).not.toHaveProperty("status");
	});

	it.each([
		["completed", "DONE"],
		["failed", "ERROR"],
		["error", "ERROR"],
		["crashed", "ERROR"],
		["canceled", "ERROR"],
	])("list maps raw status %s to local status %s", async (rawStatus, expectedStatus) => {
		jest.spyOn(N8NTasksRepository, "findProcessing").mockResolvedValueOnce([
			makeTask({
				id: 3,
				execution_id: `exec-${rawStatus}`,
				last_checked_at: null,
			}),
		]);
		jest.spyOn(N8NTasksRepository, "findAll").mockResolvedValueOnce([]);
		jest.spyOn(N8NService, "getExecutionDetails").mockResolvedValueOnce({
			status: rawStatus,
		});
		const updateSpy = jest
			.spyOn(N8NTasksRepository, "updateSyncState")
			.mockResolvedValueOnce(makeTask());

		await N8NTasksService.list();

		expect(updateSpy).toHaveBeenCalledWith(
			3,
			expect.objectContaining({
				status: expectedStatus,
				lastSeenExecutionStatus: rawStatus,
				lastCheckedAt: expect.any(Date),
			}),
		);
	});

	it("list skips tasks inside cooldown window", async () => {
		jest.spyOn(N8NTasksRepository, "findProcessing").mockResolvedValueOnce([
			makeTask({
				id: 4,
				last_checked_at: new Date(),
			}),
		]);
		jest.spyOn(N8NTasksRepository, "findAll").mockResolvedValueOnce([]);
		const detailsSpy = jest.spyOn(N8NService, "getExecutionDetails");
		const updateSpy = jest.spyOn(N8NTasksRepository, "updateSyncState");

		await N8NTasksService.list();

		expect(detailsSpy).not.toHaveBeenCalled();
		expect(updateSpy).not.toHaveBeenCalled();
	});

	it("list continues when one execution sync fails", async () => {
		jest.spyOn(N8NTasksRepository, "findProcessing").mockResolvedValueOnce([
			makeTask({
				id: 10,
				execution_id: "exec-fail",
				last_checked_at: null,
			}),
			makeTask({
				id: 11,
				execution_id: "exec-done",
				last_checked_at: null,
			}),
		]);
		jest.spyOn(N8NTasksRepository, "findAll").mockResolvedValueOnce([]);
		jest
			.spyOn(N8NService, "getExecutionDetails")
			.mockRejectedValueOnce(new Error("n8n unavailable"))
			.mockResolvedValueOnce({ status: "completed" });
		const updateSpy = jest
			.spyOn(N8NTasksRepository, "updateSyncState")
			.mockResolvedValue(makeTask());

		await expect(N8NTasksService.list()).resolves.toEqual([]);
		expect(updateSpy).toHaveBeenNthCalledWith(
			1,
			10,
			expect.objectContaining({
				lastCheckedAt: expect.any(Date),
			}),
		);
		expect(updateSpy).toHaveBeenNthCalledWith(
			2,
			11,
			expect.objectContaining({
				status: "DONE",
				lastSeenExecutionStatus: "completed",
				lastCheckedAt: expect.any(Date),
			}),
		);
	});
});
