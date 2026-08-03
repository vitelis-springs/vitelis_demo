import { NextRequest, NextResponse } from "next/server";

export const INTERNAL_CRON_SECRET_HEADER = "x-internal-cron-secret";

/**
 * Guards internal-only cron endpoints (triggered by src/instrumentation.ts).
 * Checked before any side effects run. Fails closed: if INTERNAL_CRON_SECRET
 * is not configured, every request is rejected rather than left open.
 */
export function verifyInternalCronSecret(
	request: NextRequest,
): NextResponse | null {
	const expected = process.env.INTERNAL_CRON_SECRET;
	const provided = request.headers.get(INTERNAL_CRON_SECRET_HEADER);

	if (!expected || !provided || provided !== expected) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	return null;
}
