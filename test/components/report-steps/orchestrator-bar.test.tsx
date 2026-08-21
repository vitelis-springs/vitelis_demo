/**
 * The bar is the second place run actions are offered, and it used to decide
 * on its own when Start and Pause were available. It disagreed with the
 * button on the report cards, and nothing caught it because the bar had no
 * test at all.
 *
 * Every hook is mocked: nothing here reaches the network, and the n8n path is
 * a live mechanism that must never be fired by a test.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { EngineRun } from "../../../src/hooks/api/useReportStepsService";

const mockStartMutate = jest.fn();
const mockPauseMutate = jest.fn();
const mockTickMutate = jest.fn();

let controllerQuery: Record<string, unknown>;
let runQuery: Record<string, unknown>;

jest.mock("../../../src/hooks/api/useReportStepsService", () => ({
	useGetOrchestratorController: jest.fn(() => controllerQuery),
	useGetEngineRun: jest.fn(() => runQuery),
	useGetOrchestratorStatus: jest.fn(() => ({
		isLoading: false,
		data: { data: { status: "PROCESSING", metadata: { max_parallel: 3 } } },
	})),
	useUpdateOrchestrator: jest.fn(() => ({
		mutate: jest.fn(),
		isPending: false,
	})),
	useTriggerEngineTick: jest.fn(() => ({
		mutate: mockTickMutate,
		isPending: false,
		variables: undefined,
	})),
	useStartEngineRun: jest.fn(() => ({
		mutate: mockStartMutate,
		isPending: false,
	})),
	usePauseEngineRun: jest.fn(() => ({
		mutate: mockPauseMutate,
		isPending: false,
	})),
}));

import OrchestratorBar from "../../../src/components/report-steps/steps-dashboard/OrchestratorBar";

function run(overrides: Partial<EngineRun> = {}): EngineRun {
	return {
		id: 7,
		report_id: 9522,
		status: "active",
		max_parallel: 3,
		in_flight: 1,
		trigger_reason: "manual",
		triggered_by: null,
		started_at: null,
		finished_at: null,
		created_at: "2026-08-20T10:00:00.000Z",
		updated_at: "2026-08-20T10:00:00.000Z",
		execution_state: "running",
		requires_user_action: false,
		...overrides,
	};
}

function underEngine(current: EngineRun | null) {
	controllerQuery = {
		isLoading: false,
		isError: false,
		data: { data: { controller: "sm_engine" } },
	};
	runQuery = {
		isLoading: false,
		isError: false,
		data: { data: { run: current } },
	};
}

describe("OrchestratorBar", () => {
	let container: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		controllerQuery = {
			isLoading: false,
			isError: false,
			data: { data: { controller: "n8n" } },
		};
		runQuery = {
			isLoading: false,
			isError: false,
			data: { data: { run: null } },
		};

		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
	});

	const render = async () => {
		await act(async () => {
			root.render(<OrchestratorBar reportId={9522} />);
		});
	};

	const buttonLabelled = (label: string): HTMLButtonElement | undefined =>
		Array.from(container.querySelectorAll("button")).find((button) =>
			button.textContent?.includes(label),
		);

	describe("under n8n", () => {
		it("keeps the clickable status pill and the manual engine ticks", async () => {
			await render();

			// Under n8n the status is set by hand, so the pill is a real button.
			expect(container.querySelector("button.pill")).not.toBeNull();
			expect(buttonLabelled("1")).toBeDefined();
			expect(buttonLabelled("2")).toBeDefined();
			expect(buttonLabelled("Pause")).toBeUndefined();
		});
	});

	describe("under sm_engine", () => {
		it("replaces the ticks with Start and Pause and freezes the pill", async () => {
			underEngine(run());
			await render();

			expect(buttonLabelled("Start")).toBeDefined();
			expect(buttonLabelled("Pause")).toBeDefined();
			// The manual ticks are an n8n mechanism and have no meaning here.
			expect(buttonLabelled("1")).toBeUndefined();

			// The engine owns the status: the pill stops being a control, and
			// stops looking like one.
			expect(container.querySelector("button.pill")).toBeNull();
			expect(container.querySelector(".pillStatic")?.textContent).toContain(
				"Active",
			);
		});

		it("offers Pause and not Start while the run is going", async () => {
			underEngine(run());
			await render();

			expect(buttonLabelled("Start")?.disabled).toBe(true);
			expect(buttonLabelled("Pause")?.disabled).toBe(false);
		});

		it("labels the action Resume on a paused run", async () => {
			underEngine(run({ status: "paused", execution_state: "paused" }));
			await render();

			expect(buttonLabelled("Resume")?.disabled).toBe(false);
			expect(buttonLabelled("Pause")?.disabled).toBe(true);
		});

		/**
		 * The regression this file exists for: the bar used to enable Start
		 * here, and the click could only be a no-op the UI called a start.
		 */
		it("offers neither action while the run waits on a person", async () => {
			underEngine(
				run({
					execution_state: "waiting_for_user",
					requires_user_action: true,
				}),
			);
			await render();

			expect(buttonLabelled("Start")?.disabled).toBe(true);
			expect(buttonLabelled("Pause")?.disabled).toBe(true);
			expect(container.textContent).toContain("Waiting on you");
		});

		it("shows a finished run instead of calling it not started", async () => {
			underEngine(run({ status: "completed", execution_state: "completed" }));
			await render();

			expect(container.textContent).toContain("Done");
			expect(container.textContent).not.toContain("Not started");
			expect(buttonLabelled("Start")?.disabled).toBe(true);
		});

		it("says a moving run has failed work behind it", async () => {
			underEngine(run({ requires_user_action: true }));
			await render();

			expect(container.textContent).toContain("has errors");
			// Still running, so pausing is still on offer.
			expect(buttonLabelled("Pause")?.disabled).toBe(false);
		});

		it("starts the run when Start is clicked", async () => {
			underEngine(null);
			await render();

			await act(async () => {
				buttonLabelled("Start")?.dispatchEvent(
					new MouseEvent("click", { bubbles: true }),
				);
			});

			expect(mockStartMutate).toHaveBeenCalled();
			expect(mockPauseMutate).not.toHaveBeenCalled();
		});
	});

	describe("when the controller cannot be read", () => {
		beforeEach(() => {
			controllerQuery = {
				isLoading: false,
				isError: true,
				error: { response: { data: { code: "ENGINE_UNREACHABLE" } } },
				data: undefined,
			};
		});

		it("explains why, without claiming a report was not started", async () => {
			await render();

			expect(container.textContent).toContain("SM Engine did not respond");
			expect(container.textContent).not.toContain("was not started");
		});

		it("offers no run actions, since it does not know who is driving", async () => {
			await render();

			expect(buttonLabelled("Start")).toBeUndefined();
			expect(buttonLabelled("Pause")).toBeUndefined();
			expect(buttonLabelled("1")).toBeUndefined();
		});

		/** The settings live on the same row under either orchestrator. */
		it("keeps the per-report settings reachable", async () => {
			await render();

			expect(container.textContent).toContain("max_parallel");
			expect(buttonLabelled("Edit")).toBeDefined();
		});
	});
});
