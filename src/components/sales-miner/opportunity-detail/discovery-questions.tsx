import { Typography } from "antd";
import styles from "./opportunity-detail.module.css";

const { Text } = Typography;

interface Question {
	layer: string;
	question: string;
}

function asText(v: unknown): string | null {
	if (typeof v !== "string") return null;
	const t = v.trim();
	return t.length ? t : null;
}

function parse(value: unknown): Array<{ layer: string; items: string[] }> {
	if (!Array.isArray(value)) return [];
	const rows: Question[] = value
		.filter((q): q is Record<string, unknown> => !!q && typeof q === "object")
		.map((q) => ({
			layer: asText(q.layer) ?? "General",
			question: asText(q.question) ?? "",
		}))
		.filter((q) => q.question.length > 0);

	const groups: Array<{ layer: string; items: string[] }> = [];
	for (const q of rows) {
		const existing = groups.find((g) => g.layer === q.layer);
		if (existing) existing.items.push(q.question);
		else groups.push({ layer: q.layer, items: [q.question] });
	}
	return groups;
}

/** Discovery prompts grouped by conversation layer. */
export default function DiscoveryQuestions({ value }: { value: unknown }) {
	const groups = parse(value);
	if (groups.length === 0)
		return <Text type="secondary">No discovery questions captured.</Text>;

	return (
		<div className={styles.discovery}>
			{groups.map((group) => (
				<div className={styles.discoveryGroup} key={group.layer}>
					<span className={styles.discoveryLayer}>{group.layer}</span>
					<ul className={styles.discoveryList}>
						{group.items.map((q) => (
							<li className={styles.discoveryItem} key={q}>
								{q}
							</li>
						))}
					</ul>
				</div>
			))}
		</div>
	);
}
