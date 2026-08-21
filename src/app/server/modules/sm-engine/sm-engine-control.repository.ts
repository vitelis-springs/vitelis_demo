import prisma from "../../../../lib/prisma";
import type { SmEngineController } from "../../../../types/sm-engine.types";

/**
 * Reads the global n8n/sm_engine switch straight out of Postgres.
 *
 * The engine exposes the same value over HTTP, and asking it there was the
 * obvious thing — but it makes knowing *who is driving* depend on the engine
 * being up. That is exactly backwards for the n8n half: an engine that is
 * down or timing out would leave the server unable to tell whether an n8n
 * action is still legitimate, and it would have to either refuse it (handing
 * the engine a veto over an orchestrator it has nothing to do with) or wave
 * it through (letting a tab opened before the flip drive a report the engine
 * now owns).
 *
 * The row is in the same database this app already reads, so the question
 * has an answer whenever the app can serve a request at all, and every
 * action can refuse on a genuine mismatch instead of guessing.
 *
 * `sm_engine_control` belongs to the engine — it is created, written and
 * migrated there. This is a read of one column, and it must stay one.
 */

/** Postgres: relation does not exist. */
const UNDEFINED_TABLE = "42P01";

/** The switch could not be read at all — the database, not the engine. */
export class SmEngineControlUnreadableError extends Error {
	constructor(cause: unknown) {
		super("Could not read the orchestrator setting");
		this.name = "SmEngineControlUnreadableError";
		this.cause = cause;
	}
}

export const SmEngineControlRepository = {
	async getController(): Promise<SmEngineController> {
		let rows: Array<{ controller: string }>;

		try {
			rows = await prisma.$queryRaw<Array<{ controller: string }>>`
				SELECT controller FROM sm_engine_control WHERE id = 1
			`;
		} catch (error) {
			/**
			 * No table means the engine's migration has never run against this
			 * database, so no engine has ever driven anything here and n8n is
			 * the answer by definition. Every other failure is unknown, and an
			 * unknown answer must not authorise an action.
			 */
			if (isUndefinedTable(error)) return "n8n";
			throw new SmEngineControlUnreadableError(error);
		}

		// The column is constrained to the two values, and an absent row means
		// the engine was installed but never switched on.
		return rows[0]?.controller === "sm_engine" ? "sm_engine" : "n8n";
	},
};

function isUndefinedTable(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;

	const meta = (error as { meta?: { code?: unknown } }).meta;
	if (meta?.code === UNDEFINED_TABLE) return true;

	const message = (error as { message?: unknown }).message;
	return typeof message === "string" && message.includes(UNDEFINED_TABLE);
}
