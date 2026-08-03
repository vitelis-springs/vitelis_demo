/**
 * Pure duration derivation for a step run. Kept free of React and of the
 * clock (pass `now`) so every rule is unit-testable: end-before-start clamps
 * to 0, a PROCESSING run keeps ticking even if it carries an end_time, and
 * long runs format in days/hours.
 */

export interface RunTiming {
	status: string | null;
	startTime: string | null;
	endTime: string | null;
}

export interface RunDuration {
	seconds: number | null;
	running: boolean;
}

export function runDuration(
	t: RunTiming,
	now: number = Date.now(),
): RunDuration {
	const running = t.status === "PROCESSING";
	if (!t.startTime) return { seconds: null, running };

	const start = Date.parse(t.startTime);
	if (Number.isNaN(start)) return { seconds: null, running };

	// A running step ignores any end_time and ticks from its start.
	if (running) {
		return { seconds: Math.max(0, (now - start) / 1000), running: true };
	}

	if (t.endTime) {
		const end = Date.parse(t.endTime);
		if (Number.isNaN(end)) return { seconds: null, running: false };
		// Clamp: an end before the start reads as 0, never negative.
		return { seconds: Math.max(0, (end - start) / 1000), running: false };
	}

	return { seconds: null, running: false };
}

/** "2s", "5m 12s", "2h 15m", "1d 3h", or "—" when unknown. */
export function formatDuration(seconds: number | null): string {
	if (seconds == null) return "—";
	const total = Math.round(seconds);
	if (total < 60) return `${total}s`;

	const minutes = Math.floor(total / 60);
	if (minutes < 60) {
		const rem = total % 60;
		return rem ? `${minutes}m ${rem}s` : `${minutes}m`;
	}

	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		const rem = minutes % 60;
		return rem ? `${hours}h ${rem}m` : `${hours}h`;
	}

	const days = Math.floor(hours / 24);
	const rem = hours % 24;
	return rem ? `${days}d ${rem}h` : `${days}d`;
}
