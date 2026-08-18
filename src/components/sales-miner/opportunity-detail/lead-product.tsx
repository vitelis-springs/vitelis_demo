import type { OpportunityLeadProduct } from "../../../types/deep-dive.types";
import styles from "./opportunity-detail.module.css";

/**
 * The lead product this opportunity sells. Sits directly under the masthead
 * because it answers "what are we selling here" before any scoring does.
 * The catalogue ID is set as a typographic object rather than a footnote — it
 * is the handle sellers use to find the product in the catalogue and the CRM.
 */
export default function LeadProduct({
	product,
}: {
	product: OpportunityLeadProduct | null;
}) {
	if (!product) return null;

	return (
		<section className={styles.leadProduct} aria-label="Lead product">
			<div className={styles.leadProductId}>
				<span className={styles.leadProductIdLabel}>ID</span>
				<span className={styles.leadProductIdValue}>{product.id}</span>
			</div>
			<div className={styles.leadProductText}>
				<span className={styles.leadProductEyebrow}>
					Product
					{product.level ? (
						<span className={styles.leadProductLevel}>
							{product.level.toUpperCase()}
						</span>
					) : null}
				</span>
				<h2 className={styles.leadProductName}>{product.name}</h2>
				{product.l2Name && (
					<span className={styles.leadProductFamily}>
						Part of {product.l2Name}
						{product.l2Id ? ` · ID ${product.l2Id}` : ""}
					</span>
				)}
			</div>
		</section>
	);
}
