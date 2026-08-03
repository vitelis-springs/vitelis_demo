import type { OpportunityStructuredBlock } from "../../../types/deep-dive.types";

/** One MEDDPICC gate, reduced to what the dossier renders. */
export interface MeddpiccGate {
	key: string;
	label: string;
	/** Four qualification states, strongest → weakest. */
	state: "confirmed" | "likely" | "partial" | "open";
	statusWord: string;
	score: number;
	populated: boolean;
}

const GATE_ORDER: Array<{ key: string; label: string }> = [
	{ key: "identifyPain", label: "Pain" },
	{ key: "metrics", label: "Metrics" },
	{ key: "economicBuyer", label: "Economic buyer" },
	{ key: "champion", label: "Champion" },
	{ key: "decisionCriteria", label: "Decision criteria" },
	{ key: "decisionProcess", label: "Decision process" },
	{ key: "paperProcess", label: "Paper process" },
	{ key: "competition", label: "Competition" },
];

function gateState(
	populated: boolean,
	score: number,
	key: string,
): MeddpiccGate {
	const label = GATE_ORDER.find((g) => g.key === key)?.label ?? key;
	if (!populated) {
		return {
			key,
			label,
			state: "open",
			statusWord: key === "champion" ? "Hypothesis" : "Open",
			score,
			populated,
		};
	}
	if (score >= 0.8)
		return {
			key,
			label,
			state: "confirmed",
			statusWord: "Confirmed",
			score,
			populated,
		};
	if (score >= 0.6)
		return {
			key,
			label,
			state: "likely",
			statusWord: "Likely",
			score,
			populated,
		};
	if (score >= 0.4)
		return {
			key,
			label,
			state: "partial",
			statusWord: "Partial",
			score,
			populated,
		};
	return { key, label, state: "open", statusWord: "Tracked", score, populated };
}

/**
 * Pull the 8 MEDDPICC gates out of the `meddpiccStructured` block, in a fixed
 * order. Returns null when the block is absent, so the spine can hide.
 */
export function parseMeddpicc(
	blocks: OpportunityStructuredBlock[],
): MeddpiccGate[] | null {
	const block = blocks.find((b) => b.key === "meddpiccStructured");
	if (!block?.value || typeof block.value !== "object") return null;
	const root = block.value as Record<string, unknown>;

	const gates = GATE_ORDER.map(({ key }) => {
		const gate =
			root[key] && typeof root[key] === "object"
				? (root[key] as Record<string, unknown>)
				: {};
		const populated = gate.populated === true;
		const score =
			typeof gate.llmJudgeScore === "number" ? gate.llmJudgeScore : 0;
		return gateState(populated, score, key);
	});

	return gates;
}

/** Count of gates that read as qualified (confirmed or likely). */
export function qualifiedCount(gates: MeddpiccGate[]): number {
	return gates.filter((g) => g.state === "confirmed" || g.state === "likely")
		.length;
}
