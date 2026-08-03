import type { OpportunityPortfolio } from "../../../../types/sales-miner-opportunity-detail.types";
import ep from "./export-preview.module.css";
import styles from "./portfolio-tab.module.css";

/** A single key/value fact; renders nothing when the value is empty. */
function Fact({ label, value }: { label: string; value: string | null }) {
	if (!value) return null;
	return (
		<div className={styles.fact}>
			<span className={styles.factLabel}>{label}</span>
			<div className={styles.factValue}>{value}</div>
		</div>
	);
}

function Prose({ label, value }: { label: string; value: string | null }) {
	if (!value) return null;
	return (
		<div className={styles.factProse}>
			<span className={styles.factLabel}>{label}</span>
			<p className={ep.prose}>{value}</p>
		</div>
	);
}

export default function PortfolioTab({ data }: { data: OpportunityPortfolio }) {
	return (
		<div>
			<div className={styles.factGrid}>
				<Fact
					label="Rank"
					value={data.rankPosition != null ? `#${data.rankPosition}` : null}
				/>
				<Fact
					label="Priority"
					value={
						data.priorityScore != null
							? String(Math.round(data.priorityScore))
							: null
					}
				/>
				<Fact label="Deal size" value={data.dealSize} />
				<Fact label="Timing" value={data.timeLabel} />
				<Fact label="Horizon" value={data.horizonName} />
				<Fact label="Solution center" value={data.solutionCenter} />
				<Fact label="Primary product" value={data.primaryProduct} />
				<Fact label="Buyer persona" value={data.buyerPersona} />
			</div>
			<Prose label="Why this priority" value={data.priorityReason} />
			<Prose label="Business problem" value={data.businessProblem} />
			<Prose label="Value proposition" value={data.valueProposition} />
		</div>
	);
}
