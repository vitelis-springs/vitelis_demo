import type {
	SmEngineController,
	SmEngineRun,
	SmEngineStartResult,
} from "../../../../types/sm-engine.types";
import { SmEngineClient } from "./sm-engine.client";
import { SmEngineControlRepository } from "./sm-engine-control.repository";

/**
 * Orchestration actions expressed the way the UI thinks about them — "start
 * this report", "pause it" — on top of the engine's lower-level run API.
 *
 * The branching lives here rather than in the browser for two reasons: the
 * engine's token must not leave the server, and picking trigger-vs-resume
 * from a state the browser fetched earlier is a race. Every action re-reads
 * the current run first.
 */
export const SmEngineService = {
	/**
	 * Read from the database rather than from the engine's own endpoint, so
	 * the answer survives the engine being down. See the repository for why
	 * that matters more than it looks.
	 */
	getController(): Promise<SmEngineController> {
		return SmEngineControlRepository.getController();
	},

	/**
	 * The run an action can still touch — active or paused — or null when the
	 * report has none. At most one run is ever in either state per report (the
	 * engine enforces it with a partial unique index), so this never has to
	 * guess between candidates.
	 *
	 * Deliberately blind to finished runs: `start` and `pause` care only about
	 * what they can act on. For showing the report's state, use `getLatestRun`.
	 */
	async getCurrentRun(reportId: number): Promise<SmEngineRun | null> {
		const runs = await SmEngineClient.listRuns(reportId);
		return findActionable(runs);
	},

	/**
	 * What the report's state actually is, finished runs included.
	 *
	 * Reading through `getCurrentRun` instead would erase every terminal state:
	 * a completed report would come back as null and read on screen as one that
	 * was never started, offering a Start button that quietly opens a second
	 * run. The engine lists runs newest-first, so the head is the latest one.
	 */
	async getLatestRun(reportId: number): Promise<SmEngineRun | null> {
		const runs = await SmEngineClient.listRuns(reportId);
		return findActionable(runs) ?? runs[0] ?? null;
	},

	/**
	 * Start, meaning whatever start means for the run that exists right now,
	 * and say which of the three it turned out to be.
	 *
	 * A paused run must be resumed, not triggered: triggering is idempotent
	 * and would hand back the paused run unchanged, so the click would report
	 * success and do nothing. An already-running run is left alone for the
	 * same reason — nothing to do is not an error, but the caller is told, so
	 * it does not announce a start that never happened.
	 */
	async start(reportId: number): Promise<SmEngineStartResult> {
		const current = await this.getCurrentRun(reportId);

		if (current?.status === "paused") {
			return {
				run: await SmEngineClient.resumeRun(current.id),
				action: "resumed",
			};
		}
		if (current?.status === "active") {
			return { run: current, action: "already_running" };
		}

		return {
			run: await SmEngineClient.triggerRun(reportId),
			action: "triggered",
		};
	},

	/**
	 * Pause the report's current run. Returns null when there is nothing to
	 * pause, which the route turns into a 409 — the button should not have
	 * offered Pause in that state, so it means the UI is looking at a stale
	 * run.
	 */
	async pause(reportId: number): Promise<SmEngineRun | null> {
		const current = await this.getCurrentRun(reportId);
		if (current?.status !== "active") return null;

		return SmEngineClient.pauseRun(current.id);
	},
};

function findActionable(runs: SmEngineRun[]): SmEngineRun | null {
	return (
		runs.find((run) => run.status === "active" || run.status === "paused") ??
		null
	);
}
