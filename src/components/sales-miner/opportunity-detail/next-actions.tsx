import { Typography } from "antd";
import styles from "./opportunity-detail.module.css";

const { Text } = Typography;

interface Action {
	sequence: number | null;
	action: string;
	who: string | null;
	due: string | null;
	rationale: string | null;
	toolSuggested: string | null;
}

function asText(v: unknown): string | null {
	if (typeof v !== "string") return null;
	const t = v.trim();
	return t.length ? t : null;
}

function parse(value: unknown): Action[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
		.map((a) => ({
			sequence: typeof a.sequence === "number" ? a.sequence : null,
			action: asText(a.action) ?? "",
			who: asText(a.who),
			due: asText(a.due),
			rationale: asText(a.rationale),
			toolSuggested: asText(a.toolSuggested),
		}))
		.filter((a) => a.action.length > 0)
		.sort((a, b) => (a.sequence ?? 1e9) - (b.sequence ?? 1e9));
}

/** Numbered play sequence — numbering is real information here (order matters). */
export default function NextActions({ value }: { value: unknown }) {
	const actions = parse(value);
	if (actions.length === 0)
		return <Text type="secondary">No actions captured.</Text>;

	return (
		<ol className={styles.plays}>
			{actions.map((a, i) => (
				<li
					className={styles.play}
					key={`${a.sequence ?? i}-${a.action.slice(0, 24)}`}
				>
					<span className={styles.playNum}>
						{String(a.sequence ?? i + 1).padStart(2, "0")}
					</span>
					<div className={styles.playBody}>
						<p className={styles.playAction}>{a.action}</p>
						<div className={styles.playMeta}>
							{a.who && <span className={styles.playChip}>{a.who}</span>}
							{a.due && <span className={styles.playChip}>{a.due}</span>}
							{a.toolSuggested && (
								<span className={styles.playChip}>{a.toolSuggested}</span>
							)}
						</div>
						{a.rationale && <p className={styles.playWhy}>{a.rationale}</p>}
					</div>
				</li>
			))}
		</ol>
	);
}
