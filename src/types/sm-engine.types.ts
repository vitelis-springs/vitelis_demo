/**
 * The SM Engine's run vocabulary, in one place.
 *
 * Both sides of the app speak it — the server-side HTTP client that talks to
 * the engine and the browser hooks that render the result — and a field that
 * exists on one side but not the other is a bug nobody sees until runtime, so
 * neither side declares its own copy.
 */

/** The global n8n / sm_engine switch. */
export type SmEngineController = "n8n" | "sm_engine";

/** The run's stored status. At most one active-or-paused run exists per report. */
export type SmEngineRunStatus =
	| "active"
	| "paused"
	| "completed"
	| "partially_failed"
	| "failed"
	| "cancelled";

/**
 * How far along the engine considers a run. Computed per request, never
 * stored. `waiting_for_user` is a live run with nothing it can do on its own —
 * every remaining step is blocked behind a person.
 */
export type SmEngineExecutionState =
	| "running"
	| "waiting_for_user"
	| "paused"
	| "completed"
	| "failed"
	| "partially_failed"
	| "cancelled";

export interface SmEngineRun {
	id: number;
	report_id: number;
	status: SmEngineRunStatus;
	max_parallel: number;
	in_flight: number;
	trigger_reason: string;
	triggered_by: string | null;
	started_at: string | null;
	finished_at: string | null;
	created_at: string;
	updated_at: string;
	execution_state: SmEngineExecutionState;
	/** True while some step needs a person, whether or not other work can still move. */
	requires_user_action: boolean;
}

/**
 * What a start click actually did. The engine's trigger endpoint is
 * idempotent, so "start" on a run that is already going returns it untouched;
 * without this the UI would report that it started something when it did not.
 */
export type SmEngineStartAction = "triggered" | "resumed" | "already_running";

export interface SmEngineStartResult {
	run: SmEngineRun;
	action: SmEngineStartAction;
}
