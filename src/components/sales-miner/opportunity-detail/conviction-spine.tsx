import { Tooltip } from "antd";
import type { MeddpiccGate } from "./meddpicc";
import { qualifiedCount } from "./meddpicc";
import styles from "./opportunity-detail.module.css";

/**
 * Signature element: the deal's conviction readout. The MEDDPICC gates render
 * as a segmented "spine" — the one memorable device on the page, and it encodes
 * true structural information (how qualified the deal actually is).
 */
export default function ConvictionSpine({
	priorityScore,
	confidenceScore,
	gates,
}: {
	priorityScore: number | null;
	confidenceScore: number;
	gates: MeddpiccGate[] | null;
}) {
	const qualified = gates ? qualifiedCount(gates) : 0;

	return (
		<div className={styles.spine}>
			<div className={styles.spineMetric}>
				<span className={styles.spineNumber}>
					{priorityScore != null ? Math.round(priorityScore) : "—"}
				</span>
				<span className={styles.spineMetricLabel}>Conviction</span>
			</div>

			<div className={styles.spineDivider} />

			<div className={styles.spineMetric}>
				<span className={styles.spineNumberSm}>
					{Math.round(confidenceScore * 100)}
					<span className={styles.spinePct}>%</span>
				</span>
				<span className={styles.spineMetricLabel}>Confidence</span>
			</div>

			<div className={styles.spineDivider} />

			{gates && (
				<div className={styles.spineGates}>
					<div className={styles.spineGatesHead}>
						<span className={styles.spineMetricLabel}>Qualification</span>
						<span className={styles.spineGatesCount}>
							{qualified}
							<span className={styles.spineGatesTotal}>/8 gates</span>
						</span>
					</div>
					<div className={styles.spineTrack}>
						{gates.map((gate) => (
							<Tooltip
								key={gate.key}
								title={`${gate.label}: ${gate.statusWord}`}
							>
								<span
									className={`${styles.spineSeg} ${styles[`seg_${gate.state}`]}`}
								/>
							</Tooltip>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
