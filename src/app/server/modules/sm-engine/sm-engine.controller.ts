import { type NextRequest, NextResponse } from "next/server";

import { extractAdminFromRequest } from "../../../../lib/auth";
import type { SmEngineController as SmEngineControllerValue } from "../../../../types/sm-engine.types";
import {
	SmEngineNotConfiguredError,
	SmEngineRequestError,
	SmEngineUnreachableError,
} from "./sm-engine.client";
import { SmEngineControlUnreadableError } from "./sm-engine-control.repository";
import { SmEngineService } from "./sm-engine.service";

/**
 * Failures are reported with a code the UI can act on, because "the engine is
 * down" and "this run is not pausable" call for different words on screen. A
 * silent fallback to the n8n path would be worse than any of them: it would
 * start a report on the wrong orchestrator, and nobody would notice.
 */
function fail(error: unknown, action: string): NextResponse {
	if (error instanceof SmEngineControlUnreadableError) {
		console.error(`❌ SmEngineController.${action}:`, error.cause);
		return NextResponse.json(
			{
				success: false,
				code: "CONTROLLER_UNREADABLE",
				error: "Could not read which orchestrator is driving reports",
			},
			{ status: 503 },
		);
	}

	if (error instanceof SmEngineNotConfiguredError) {
		console.error(`❌ SmEngineController.${action}:`, error.message);
		return NextResponse.json(
			{
				success: false,
				code: "ENGINE_NOT_CONFIGURED",
				error: "SM Engine is not configured on this server",
			},
			{ status: 503 },
		);
	}

	if (error instanceof SmEngineUnreachableError) {
		console.error(`❌ SmEngineController.${action}:`, error.cause);
		return NextResponse.json(
			{
				success: false,
				code: "ENGINE_UNREACHABLE",
				error: "SM Engine did not respond",
			},
			{ status: 503 },
		);
	}

	if (error instanceof SmEngineRequestError) {
		console.error(
			`❌ SmEngineController.${action}: engine responded ${error.status}`,
			error.body,
		);

		/**
		 * The engine refusing *this server's* token is an operator problem, and
		 * it must not be relayed as 401. The browser's axios interceptor logs
		 * the user out and redirects to /login on any 401, so passing it
		 * through would eject whoever opened the page over a missing
		 * SM_ENGINE_API_TOKEN — and they would never see the real reason.
		 */
		if (error.status === 401 || error.status === 403) {
			return NextResponse.json(
				{
					success: false,
					code: "ENGINE_UNAUTHORIZED",
					error: "SM Engine rejected this server's token",
				},
				{ status: 502 },
			);
		}

		// Any other 4xx is about this request, so it is passed through;
		// a 5xx is the engine failing, which is a 502 from here.
		const status =
			error.status >= 400 && error.status < 500 ? error.status : 502;
		return NextResponse.json(
			{
				success: false,
				code: "ENGINE_REJECTED",
				error: "SM Engine rejected the request",
			},
			{ status },
		);
	}

	console.error(`❌ SmEngineController.${action}:`, error);
	return NextResponse.json(
		{ success: false, code: "UNKNOWN", error: `Failed to ${action}` },
		{ status: 500 },
	);
}

function parseReportId(value: string): number | null {
	const reportId = Number(value);
	return Number.isInteger(reportId) && reportId > 0 ? reportId : null;
}

type ControllerGuard = { ok: true } | { ok: false; response: NextResponse };

/**
 * Refuses an action that belongs to the *other* orchestrator.
 *
 * The browser learns who is driving once and caches it, so a tab left open
 * across an operator's n8n/sm_engine flip will happily fire the actions it
 * rendered ten minutes ago — starting a run in an engine that no longer owns
 * the report, or poking n8n for one it does. The check has to be here, on
 * every action, because only the server can see the current value.
 *
 * Closed on both sides: an action that changes state does not proceed on a
 * setting nobody could read. That costs nothing in availability only because
 * the setting comes out of this app's own database rather than the engine's
 * API — see sm-engine-control.repository.ts, which is what makes refusing
 * safe for the n8n half too.
 */
export async function requireController(
	expected: SmEngineControllerValue,
	action: string,
): Promise<ControllerGuard> {
	let current: SmEngineControllerValue;

	try {
		current = await SmEngineService.getController();
	} catch (error) {
		return { ok: false, response: fail(error, action) };
	}

	if (current === expected) return { ok: true };

	return {
		ok: false,
		response: NextResponse.json(
			{
				success: false,
				code: "CONTROLLER_CHANGED",
				error: `Reports are driven by ${current} now, not ${expected}`,
				data: { controller: current },
			},
			{ status: 409 },
		),
	};
}

export class SmEngineController {
	/** Which orchestrator is driving reports right now. */
	static async getController(request: NextRequest): Promise<NextResponse> {
		const auth = extractAdminFromRequest(request);
		if (!auth.success) return auth.response;

		try {
			const controller = await SmEngineService.getController();
			return NextResponse.json({ success: true, data: { controller } });
		} catch (error) {
			return fail(error, "read the orchestrator setting");
		}
	}

	/**
	 * The report's latest run — finished ones included — or null when it has
	 * never been started. The UI needs the difference between "no run" and "a
	 * run that ended" to know whether Start means anything.
	 */
	static async getLatestRun(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		const auth = extractAdminFromRequest(request);
		if (!auth.success) return auth.response;

		const reportId = parseReportId(reportIdParam);
		if (reportId === null) {
			return NextResponse.json(
				{ success: false, error: "Invalid report id" },
				{ status: 400 },
			);
		}

		try {
			const run = await SmEngineService.getLatestRun(reportId);
			return NextResponse.json({ success: true, data: { run } });
		} catch (error) {
			return fail(error, "read the run");
		}
	}

	static async start(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		const auth = extractAdminFromRequest(request);
		if (!auth.success) return auth.response;

		const reportId = parseReportId(reportIdParam);
		if (reportId === null) {
			return NextResponse.json(
				{ success: false, error: "Invalid report id" },
				{ status: 400 },
			);
		}

		const mandate = await requireController("sm_engine", "start the report");
		if (!mandate.ok) return mandate.response;

		try {
			const { run, action } = await SmEngineService.start(reportId);
			return NextResponse.json({ success: true, data: { run, action } });
		} catch (error) {
			return fail(error, "start the report");
		}
	}

	static async pause(
		request: NextRequest,
		reportIdParam: string,
	): Promise<NextResponse> {
		const auth = extractAdminFromRequest(request);
		if (!auth.success) return auth.response;

		const reportId = parseReportId(reportIdParam);
		if (reportId === null) {
			return NextResponse.json(
				{ success: false, error: "Invalid report id" },
				{ status: 400 },
			);
		}

		const mandate = await requireController("sm_engine", "pause the report");
		if (!mandate.ok) return mandate.response;

		try {
			const run = await SmEngineService.pause(reportId);
			if (!run) {
				return NextResponse.json(
					{
						success: false,
						code: "NO_ACTIVE_RUN",
						error: "This report has no running job to pause",
					},
					{ status: 409 },
				);
			}
			return NextResponse.json({ success: true, data: { run } });
		} catch (error) {
			return fail(error, "pause the report");
		}
	}
}
