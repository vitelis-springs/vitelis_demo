import {
	engineRunControls,
	startButtonState,
	startFeedback,
} from "../../../src/lib/orchestrator/run-controls";
import type { SmEngineRun } from "../../../src/types/sm-engine.types";

function run(overrides: Partial<SmEngineRun> = {}): SmEngineRun {
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

describe("startButtonState — n8n", () => {
	it("offers Pause while the report is processing", () => {
		expect(startButtonState({ kind: "n8n", status: "PROCESSING" })).toEqual({
			mode: "pause",
			label: "Pause",
			tooltip: "Pause report",
		});
	});

	it("locks the button on a finished report", () => {
		expect(startButtonState({ kind: "n8n", status: "DONE" }).mode).toBe(
			"disabled",
		);
	});

	it.each(["PENDING", "ERROR"] as const)("offers Start on %s", (status) => {
		expect(startButtonState({ kind: "n8n", status }).mode).toBe("start");
	});
});

describe("startButtonState — sm_engine", () => {
	it("offers Start when the report has never been run", () => {
		expect(startButtonState({ kind: "sm_engine", run: null })).toEqual({
			mode: "start",
			label: "Start",
			tooltip: "Start report",
		});
	});

	it("offers Pause on a running run", () => {
		const state = startButtonState({
			kind: "sm_engine",
			run: run({ execution_state: "running" }),
		});

		expect(state.mode).toBe("pause");
		expect(state.label).toBe("Pause");
	});

	it("calls the paused case Resume so the click is not mistaken for a new run", () => {
		const state = startButtonState({
			kind: "sm_engine",
			run: run({ status: "paused", execution_state: "paused" }),
		});

		expect(state.mode).toBe("start");
		expect(state.tooltip).toBe("Resume report");
	});

	/**
	 * Nothing in this app can unblock those steps yet — the engine's
	 * retry/invalidate calls are not proxied — so the tooltip has to send the
	 * reader to the engine rather than to a screen that cannot help.
	 */
	it("locks the button while the run waits on a person, and says where to go", () => {
		const state = startButtonState({
			kind: "sm_engine",
			run: run({
				execution_state: "waiting_for_user",
				requires_user_action: true,
			}),
		});

		expect(state.mode).toBe("disabled");
		expect(state.tooltip).toContain("Waiting on you");
		expect(state.tooltip).toContain("SM Engine");
	});

	it("locks the button on a completed run", () => {
		expect(
			startButtonState({
				kind: "sm_engine",
				run: run({ status: "completed", execution_state: "completed" }),
			}).mode,
		).toBe("disabled");
	});

	it.each([
		"failed",
		"partially_failed",
		"cancelled",
	] as const)("offers a fresh run after %s", (execution_state) => {
		const state = startButtonState({
			kind: "sm_engine",
			run: run({ execution_state }),
		});

		expect(state.mode).toBe("start");
		expect(state.tooltip).toBe("Start a new run");
	});
});

describe("startButtonState — the orchestrator is not known", () => {
	it("waits rather than guessing while the controller is loading", () => {
		expect(startButtonState({ kind: "loading" }).mode).toBe("loading");
	});

	/**
	 * The important one. Falling back to the n8n path here would fire a live
	 * mechanism for a report the engine owns, and nothing on screen would say so.
	 */
	it("locks the button and shows the reason when the engine cannot be reached", () => {
		const state = startButtonState({
			kind: "unavailable",
			reason: "SM Engine did not respond",
		});

		expect(state.mode).toBe("disabled");
		expect(state.tooltip).toBe("SM Engine did not respond");
	});
});

/**
 * The bar shows Start and Pause side by side rather than one toggle, and used
 * to decide their disabled state on its own. It disagreed with the button:
 * on a run waiting for a person it offered Start, and the click was a no-op
 * the UI still reported as a start.
 */
describe("engineRunControls", () => {
	it("offers Start and not Pause when there is no run", () => {
		expect(engineRunControls(null)).toEqual({
			canStart: true,
			canPause: false,
			startLabel: "Start",
			hint: "",
		});
	});

	it("offers Pause and not Start while the run is going", () => {
		const controls = engineRunControls(run());

		expect(controls.canPause).toBe(true);
		expect(controls.canStart).toBe(false);
	});

	it("labels the start button Resume on a paused run", () => {
		const controls = engineRunControls(
			run({ status: "paused", execution_state: "paused" }),
		);

		expect(controls.canStart).toBe(true);
		expect(controls.startLabel).toBe("Resume");
	});

	it("offers neither action while the run waits on a person", () => {
		const controls = engineRunControls(
			run({ execution_state: "waiting_for_user", requires_user_action: true }),
		);

		expect(controls.canStart).toBe(false);
		expect(controls.canPause).toBe(false);
		expect(controls.hint).toContain("Waiting on you");
	});

	it("offers neither action on a completed run", () => {
		const controls = engineRunControls(
			run({ status: "completed", execution_state: "completed" }),
		);

		expect(controls.canStart).toBe(false);
		expect(controls.canPause).toBe(false);
	});

	it("agrees with the button on every state", () => {
		const states = [
			"running",
			"waiting_for_user",
			"paused",
			"completed",
			"failed",
			"partially_failed",
			"cancelled",
		] as const;

		for (const execution_state of states) {
			const current = run({ execution_state });
			const button = startButtonState({ kind: "sm_engine", run: current });
			const controls = engineRunControls(current);

			expect(controls.canStart).toBe(button.mode === "start");
			expect(controls.canPause).toBe(button.mode === "pause");
		}
	});
});

describe("startFeedback", () => {
	it("reports a triggered run as started", () => {
		expect(startFeedback("triggered")).toEqual({
			tone: "success",
			text: "Report started",
		});
	});

	it("distinguishes a resumed run from a new one", () => {
		expect(startFeedback("resumed").text).toBe("Report resumed");
	});

	/** The engine returned the run untouched; calling that a start is a lie. */
	it("does not claim a start when the run was already going", () => {
		expect(startFeedback("already_running")).toEqual({
			tone: "info",
			text: "Report is already running",
		});
	});

	it("falls back to the plain wording when the server sent no action", () => {
		expect(startFeedback(undefined).text).toBe("Report started");
	});
});
