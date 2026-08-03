import { Typography } from "antd";
import styles from "./opportunity-detail.module.css";

const { Text } = Typography;

interface Proof {
	claim: string;
	evidence: string | null;
	sourceUrl: string | null;
	applicability: string | null;
}

function asText(v: unknown): string | null {
	if (typeof v !== "string") return null;
	const t = v.trim();
	return t.length ? t : null;
}

function hostOf(url: string): string {
	try {
		return new URL(url).host.replace(/^www\./, "");
	} catch {
		return url;
	}
}

function parse(value: unknown): Proof[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
		.map((p) => ({
			claim: asText(p.claim) ?? "",
			evidence: asText(p.evidence),
			sourceUrl: asText(p.sourceUrl),
			applicability: asText(p.applicability),
		}))
		.filter((p) => p.claim.length > 0);
}

/** Evidence backing the deal thesis: claim → support → cited source. */
export default function ProofPoints({ value }: { value: unknown }) {
	const points = parse(value);
	if (points.length === 0)
		return <Text type="secondary">No proof points captured.</Text>;

	return (
		<div className={styles.proofList}>
			{points.map((p) => (
				<article className={styles.proof} key={p.claim}>
					<p className={styles.proofClaim}>{p.claim}</p>
					{p.evidence && <p className={styles.proofEvidence}>{p.evidence}</p>}
					{p.sourceUrl && (
						<a
							className={styles.proofSource}
							href={p.sourceUrl}
							target="_blank"
							rel="noreferrer"
						>
							{hostOf(p.sourceUrl)}
						</a>
					)}
				</article>
			))}
		</div>
	);
}
