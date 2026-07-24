import type {
	OpportunityQa,
	OpportunityQaDimension,
} from "../../../../types/sales-miner-opportunity-detail.types";
import { humanize } from "./export-preview.utils";
import styles from "./qa-tab.module.css";
import { statusTone, toneClass } from "./tone";

function QaCard({ dim }: { dim: OpportunityQaDimension }) {
	const pct =
		dim.score != null
			? Math.max(0, Math.min(100, Math.round(dim.score)))
			: null;
	return (
		<article className={styles.qaCard}>
			<div className={styles.qaCardHead}>
				<span className={styles.qaDim}>{dim.label}</span>
				{dim.score != null && <span className={styles.qaScore}>{pct}</span>}
			</div>
			{pct != null && (
				<div className={styles.qaMeter}>
					<div className={styles.qaMeterFill} style={{ width: `${pct}%` }} />
				</div>
			)}
			<div className={styles.qaBadges}>
				{dim.status && (
					<span className={toneClass(statusTone(dim.status))}>
						{humanize(dim.status)}
					</span>
				)}
				{dim.warningCount > 0 && (
					<span className={toneClass("warn")}>
						{dim.warningCount} warning{dim.warningCount > 1 ? "s" : ""}
					</span>
				)}
			</div>
			{dim.explanation && <p className={styles.qaExplain}>{dim.explanation}</p>}
		</article>
	);
}

export default function QaTab({ data }: { data: OpportunityQa }) {
	return (
		<div>
			<div className={styles.qaSummary}>
				<span className={toneClass(data.humanReviewRequired ? "risk" : "win")}>
					{data.humanReviewRequired
						? "Human review required"
						: "No human review flagged"}
				</span>
				<span
					className={toneClass(data.unsupportedClaimCount > 0 ? "warn" : "win")}
				>
					{data.unsupportedClaimCount} unsupported claim
					{data.unsupportedClaimCount === 1 ? "" : "s"}
				</span>
				{data.overstatedClaimCount > 0 && (
					<span className={toneClass("warn")}>
						{data.overstatedClaimCount} overstated
					</span>
				)}
			</div>

			<div className={styles.qaGrid}>
				{data.dimensions.map((dim) => (
					<QaCard dim={dim} key={dim.key} />
				))}
			</div>
		</div>
	);
}
