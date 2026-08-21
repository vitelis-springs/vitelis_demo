import type {
	SmEngineRun,
	SmEngineStartAction,
} from "../../types/sm-engine.types";
import type { StepStatus } from "../../hooks/api/useReportStepsService";

/**
 * What the run controls look like right now, decided in one place so the two
 * orchestrators cannot drift apart in a component and so every state is
 * testable without rendering anything.
 *
 * Two components read this: the play/pause button on the report cards and the
 * Start/Pause pair in the orchestrator bar. They used to decide separately,
 * and disagreed — the bar offered Start on a run that was waiting on a person,
 * where the click could only be a no-op.
 */
export type StartButtonMode = "start" | "pause" | "disabled" | "loading";

export interface StartButtonState {
	mode: StartButtonMode;
	label: string;
	tooltip: string;
}

/**
 * `unavailable` is deliberately not "assume n8n". Falling back to the old path
 * when the engine cannot be reached would start a report on the wrong
 * orchestrator, and the mistake would be invisible.
 */
export type StartButtonInput =
	| { kind: "loading" }
	| { kind: "unavailable"; reason: string }
	| { kind: "n8n"; status: StepStatus }
	| { kind: "sm_engine"; run: SmEngineRun | null };

const START: StartButtonState = {
	mode: "start",
	label: "Start",
	tooltip: "Start report",
};

export function startButtonState(input: StartButtonInput): StartButtonState {
	switch (input.kind) {
		case "loading":
			return {
				mode: "loading",
				label: "Start",
				tooltip: "Checking which orchestrator is running reports",
			};

		case "unavailable":
			return { mode: "disabled", label: "Start", tooltip: input.reason };

		case "n8n":
			if (input.status === "PROCESSING") {
				return { mode: "pause", label: "Pause", tooltip: "Pause report" };
			}
			if (input.status === "DONE") {
				return {
					mode: "disabled",
					label: "Start",
					tooltip: "Report completed",
				};
			}
			return START;

		case "sm_engine":
			return engineState(input.run);
	}
}

function engineState(run: SmEngineRun | null): StartButtonState {
	if (!run) return START;

	switch (run.execution_state) {
		case "running":
			return { mode: "pause", label: "Pause", tooltip: "Pause report" };

		case "paused":
			return { mode: "start", label: "Start", tooltip: "Resume report" };

		/**
		 * The run is alive but every remaining step is blocked behind a person,
		 * so there is nothing for Start to start and nothing for Pause to stop.
		 * The tooltip names SM Engine rather than a screen in this app:
		 * unblocking a step is the engine's retry/invalidate call, which the UI
		 * does not expose yet.
		 */
		case "waiting_for_user":
			return {
				mode: "disabled",
				label: "Start",
				tooltip:
					"Waiting on you — blocked steps have to be resolved in SM Engine before the run continues",
			};

		case "completed":
			return { mode: "disabled", label: "Start", tooltip: "Report completed" };

		case "failed":
		case "partially_failed":
		case "cancelled":
			return { mode: "start", label: "Start", tooltip: "Start a new run" };
	}
}

export interface EngineRunControls {
	canStart: boolean;
	canPause: boolean;
	/** Resume reads differently from Start, and the difference is the point. */
	startLabel: "Start" | "Resume";
	/** Why both are unavailable, when they are. Empty when one of them is. */
	hint: string;
}

/**
 * The same decision as `startButtonState`, shaped for a bar that shows Start
 * and Pause side by side instead of one toggle.
 */
export function engineRunControls(run: SmEngineRun | null): EngineRunControls {
	const state = startButtonState({ kind: "sm_engine", run });

	return {
		canStart: state.mode === "start",
		canPause: state.mode === "pause",
		startLabel: run?.execution_state === "paused" ? "Resume" : "Start",
		hint: state.mode === "disabled" ? state.tooltip : "",
	};
}

/**
 * What to say after a start succeeded. `already_running` is not a success
 * story — the engine returned the run untouched — so it is worded as the
 * observation it is, and callers show it as info rather than a green tick.
 */
export function startFeedback(action: SmEngineStartAction | undefined): {
	tone: "success" | "info";
	text: string;
} {
	switch (action) {
		case "resumed":
			return { tone: "success", text: "Report resumed" };
		case "already_running":
			return { tone: "info", text: "Report is already running" };
		default:
			return { tone: "success", text: "Report started" };
	}
}
