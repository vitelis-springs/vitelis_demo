/**
 * Turns a failed engine call into something worth reading on screen.
 *
 * Each code says what went wrong and what would fix it, because these
 * failures need different people: a missing setting or a rejected server
 * token is for whoever deploys, an unreachable engine is for whoever runs it,
 * and a stale run is for the person looking at the page.
 */
const MESSAGES: Record<string, string> = {
	ENGINE_NOT_CONFIGURED:
		"SM Engine is not configured on this server — set SM_ENGINE_BASE_URL and SM_ENGINE_API_TOKEN",
	ENGINE_UNAUTHORIZED:
		"SM Engine rejected this server's token — check SM_ENGINE_API_TOKEN",
	ENGINE_UNREACHABLE: "SM Engine did not respond",
	ENGINE_REJECTED: "SM Engine rejected the request",
	NO_ACTIVE_RUN: "This report has no running job to pause — refresh the page",
	CONTROLLER_UNREADABLE:
		"Could not read which orchestrator is driving reports — nothing was changed",
	CONTROLLER_CHANGED:
		"The orchestrator was switched while this page was open — refresh before starting or pausing",
};

const FALLBACK = "Could not reach SM Engine";

/**
 * Added only when the failure interrupted an action, so the reader knows
 * nothing happened. Codes that already describe a no-op — there was no run to
 * pause in the first place — say enough on their own.
 */
const NOT_STARTED = " — the report was not started";
const SPEAKS_FOR_ITSELF = new Set([
	"NO_ACTIVE_RUN",
	"CONTROLLER_CHANGED",
	"CONTROLLER_UNREADABLE",
]);

/** For a failed Start or Pause: says what broke *and* that nothing ran. */
export function engineErrorMessage(error: unknown): string {
	const code = extractCode(error);
	const text = (code && MESSAGES[code]) || FALLBACK;

	return code && SPEAKS_FOR_ITSELF.has(code) ? text : text + NOT_STARTED;
}

/**
 * For a failed read — the controller setting, a run's state. Nothing was
 * being started, so claiming otherwise would just be wrong.
 */
export function engineReadErrorMessage(error: unknown): string {
	const code = extractCode(error);
	return (code && MESSAGES[code]) || FALLBACK;
}

/**
 * For the n8n actions, which have their own wording for their own failures
 * but still have to explain the one answer they now share with the engine
 * path: the orchestrator changed under this page.
 */
export function orchestratorErrorMessage(
	error: unknown,
	fallback: string,
): string {
	const code = extractCode(error);
	return (code && MESSAGES[code]) || fallback;
}

/** The server refused because this page is acting for the wrong orchestrator. */
export function isControllerChanged(error: unknown): boolean {
	return extractCode(error) === "CONTROLLER_CHANGED";
}

function extractCode(error: unknown): string | null {
	if (typeof error !== "object" || error === null) return null;

	const data = (error as { response?: { data?: unknown } }).response?.data;
	if (typeof data !== "object" || data === null) return null;

	const code = (data as { code?: unknown }).code;
	return typeof code === "string" ? code : null;
}
