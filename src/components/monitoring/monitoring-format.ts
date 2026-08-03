export function formatDateTime(value: string | null): string {
	if (!value) return "—";
	return new Date(value).toLocaleString();
}

/** Time of day only — runs are read within a session, the date is noise. */
export function formatTime(value: string | null): string {
	if (!value) return "—";
	return new Date(value).toLocaleTimeString();
}

export function formatDuration(ms: number | null): string {
	if (ms === null || ms < 0) return "—";

	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return `${seconds}s`;

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ${seconds % 60}s`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ${minutes % 60}m`;

	return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function formatSince(value: string | null): string {
	if (!value) return "—";
	const elapsed = Date.now() - new Date(value).getTime();
	if (elapsed < 0) return "just now";
	return `${formatDuration(elapsed)} ago`;
}
