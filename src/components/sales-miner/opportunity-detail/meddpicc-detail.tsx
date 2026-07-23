import type { MeddpiccGate } from "./meddpicc";
import styles from "./opportunity-detail.module.css";

/** The 8 gates expanded: state pill + score bar. Pairs with the header spine. */
export default function MeddpiccDetail({ gates }: { gates: MeddpiccGate[] }) {
	return (
		<div className={styles.gateGrid}>
			{gates.map((gate) => (
				<div className={styles.gateRow} key={gate.key}>
					<div className={styles.gateTop}>
						<span className={styles.gateLabel}>{gate.label}</span>
						<span
							className={`${styles.gatePill} ${styles[`seg_${gate.state}`]}`}
						>
							{gate.statusWord}
						</span>
					</div>
					<div className={styles.gateBar}>
						<div
							className={`${styles.gateFill} ${styles[`seg_${gate.state}`]}`}
							style={{ width: `${Math.round(gate.score * 100)}%` }}
						/>
					</div>
				</div>
			))}
		</div>
	);
}
