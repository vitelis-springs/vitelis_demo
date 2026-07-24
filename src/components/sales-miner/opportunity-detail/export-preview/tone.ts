import styles from "./export-preview.module.css";
import type { Tone } from "./export-preview.types";

/** Words that read as good / neutral / cautionary / bad in a status string. */
const TONE_WORDS: Record<Tone, string[]> = {
	win: ["strong", "complete", "confirmed", "keep", "high", "direct", "pass"],
	ok: ["acceptable", "good", "moderate", "medium", "partial", "complement"],
	warn: [
		"weak",
		"low",
		"missing",
		"review",
		"caution",
		"unknown",
		"not_researched",
		"pending",
	],
	risk: [
		"fail",
		"invalid",
		"poor",
		"error",
		"drop",
		"reject",
		"blocked",
		"overstated",
	],
	mute: [],
};

/** Map a status/action string to a semantic tone for badge coloring. */
export function statusTone(status: string | null | undefined): Tone {
	if (!status) return "mute";
	const key = status.toLowerCase().replace(/[\s-]+/g, "_");
	for (const tone of ["risk", "warn", "ok", "win"] as Tone[]) {
		if (TONE_WORDS[tone].some((word) => key.includes(word))) return tone;
	}
	return "mute";
}

/** CSS module class for a tone badge. */
export function toneClass(tone: Tone): string {
	const map: Record<Tone, string | undefined> = {
		win: styles.toneWin,
		ok: styles.toneOk,
		warn: styles.toneWarn,
		risk: styles.toneRisk,
		mute: undefined,
	};
	return `${styles.tone ?? ""} ${map[tone] ?? ""}`.trim();
}
