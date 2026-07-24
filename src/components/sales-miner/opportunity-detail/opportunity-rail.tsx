import styles from "./opportunity-detail.module.css";

/** Sticky rail: vitals (conviction / confidence / deal / approval) + jump nav. */
export default function OpportunityRail({
	priorityScore,
	confidenceScore,
	dealSize,
	isApproved,
	sections,
}: {
	priorityScore: number | null;
	confidenceScore: number;
	dealSize: string | null;
	isApproved: boolean;
	sections: ReadonlyArray<{ id: string; label: string }>;
}) {
	return (
		<aside className={styles.rail}>
			<div className={styles.railInner}>
				<div className={styles.vitals}>
					<div className={styles.vital}>
						<span className={styles.vitalLabel}>Conviction</span>
						<span className={styles.vitalValue}>
							{priorityScore != null ? Math.round(priorityScore) : "—"}
						</span>
					</div>
					<div className={styles.vital}>
						<span className={styles.vitalLabel}>Confidence</span>
						<span className={styles.vitalValue}>
							{Math.round(confidenceScore * 100)}%
						</span>
					</div>
					{dealSize && (
						<div className={styles.vital}>
							<span className={styles.vitalLabel}>Deal size</span>
							<span className={styles.vitalValue}>{dealSize}</span>
						</div>
					)}
					<span
						className={`${styles.approvePill} ${
							isApproved ? styles.approveYes : styles.approveNo
						}`}
					>
						{isApproved ? "Approved" : "Not approved"}
					</span>
				</div>

				<nav className={styles.jump}>
					{sections.map((section) => (
						<button
							key={section.id}
							type="button"
							className={styles.jumpItem}
							onClick={() =>
								document
									.getElementById(section.id)
									?.scrollIntoView({ behavior: "smooth", block: "start" })
							}
						>
							{section.label}
						</button>
					))}
				</nav>
			</div>
		</aside>
	);
}
