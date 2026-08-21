/**
 * HTTP client for the SM Engine orchestration API.
 *
 * Server-only. The engine authenticates with a bearer token from
 * API_AUTH_TOKENS, so this must never be reachable from the browser — every
 * caller goes through a Next route handler that authenticates the user first.
 */
import type { SmEngineRun } from "../../../../types/sm-engine.types";

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * The engine sets a global prefix (API_PREFIX, "api") *and* URI versioning
 * with a default version of 1, so every route lives one level deeper than the
 * prefix alone suggests. Calling it without the version returns 404, not 401.
 * SM_ENGINE_BASE_URL is the bare origin; this is appended here so no caller
 * has to remember it.
 */
const API_PREFIX = "/api/v1";

export type {
	SmEngineController,
	SmEngineExecutionState,
	SmEngineRun,
	SmEngineRunStatus,
} from "../../../../types/sm-engine.types";

/** The engine's address or token is missing — an operator problem, not a user one. */
export class SmEngineNotConfiguredError extends Error {
	constructor(setting: string) {
		super(`${setting} is not set`);
		this.name = "SmEngineNotConfiguredError";
	}
}

/** The engine answered, but not with success. `status` is its HTTP status. */
export class SmEngineRequestError extends Error {
	readonly status: number;
	readonly body: string;

	constructor(status: number, body: string) {
		super(`SM Engine responded ${status}`);
		this.name = "SmEngineRequestError";
		this.status = status;
		this.body = body;
	}
}

/** The engine could not be reached at all — down, wrong address, or timed out. */
export class SmEngineUnreachableError extends Error {
	constructor(cause: unknown) {
		super("SM Engine is unreachable");
		this.name = "SmEngineUnreachableError";
		this.cause = cause;
	}
}

function config(): { baseUrl: string; token: string } {
	const baseUrl = process.env.SM_ENGINE_BASE_URL;
	if (!baseUrl) throw new SmEngineNotConfiguredError("SM_ENGINE_BASE_URL");

	const token = process.env.SM_ENGINE_API_TOKEN;
	if (!token) throw new SmEngineNotConfiguredError("SM_ENGINE_API_TOKEN");

	return { baseUrl: baseUrl.replace(/\/+$/, ""), token };
}

async function request<T>(path: string, method: "GET" | "POST"): Promise<T> {
	const { baseUrl, token } = config();
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

	let response: Response;
	try {
		response = await fetch(`${baseUrl}${API_PREFIX}${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			signal: controller.signal,
			cache: "no-store",
		});
	} catch (error) {
		throw new SmEngineUnreachableError(error);
	} finally {
		clearTimeout(timeout);
	}

	if (!response.ok) {
		// Read the body for the message, but never let a parse failure mask the
		// status — the status is what the caller maps onto its own response.
		const body = await response.text().catch(() => "");
		throw new SmEngineRequestError(response.status, body);
	}

	return (await response.json()) as T;
}

export const SmEngineClient = {
	// The global n8n/sm_engine switch is deliberately absent: it is read from
	// the database instead, so it stays answerable while the engine is not.
	// See sm-engine-control.repository.ts.

	async listRuns(reportId: number): Promise<SmEngineRun[]> {
		return request<SmEngineRun[]>(
			`/report-orchestration/reports/${reportId}/runs`,
			"GET",
		);
	},

	/**
	 * Idempotent on the engine's side: if a run is already open for this
	 * report it comes back untouched, including when it is paused. That is
	 * why the service branches on state instead of always calling this.
	 */
	async triggerRun(reportId: number): Promise<SmEngineRun> {
		return request<SmEngineRun>(
			`/report-orchestration/reports/${reportId}/runs`,
			"POST",
		);
	},

	/** 409 if the run is not currently active. */
	async pauseRun(runId: number): Promise<SmEngineRun> {
		return request<SmEngineRun>(
			`/report-orchestration/runs/${runId}/pause`,
			"POST",
		);
	},

	/** 409 if the run is not currently paused. */
	async resumeRun(runId: number): Promise<SmEngineRun> {
		return request<SmEngineRun>(
			`/report-orchestration/runs/${runId}/resume`,
			"POST",
		);
	},
};
