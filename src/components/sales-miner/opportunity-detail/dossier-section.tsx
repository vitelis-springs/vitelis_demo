import type { ReactNode } from "react";
import styles from "./opportunity-detail.module.css";

/**
 * A dossier section: tracked eyebrow + anchor target for the rail's jump-nav.
 * Sections are NOT a numbered sequence, so the eyebrow is a label, not "01/02".
 */
export default function DossierSection({
	id,
	eyebrow,
	title,
	aside,
	children,
}: {
	id: string;
	eyebrow: string;
	title: string;
	aside?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className={styles.section} id={id}>
			<div className={styles.sectionHead}>
				<div>
					<span className={styles.eyebrow}>{eyebrow}</span>
					<h2 className={styles.sectionTitle}>{title}</h2>
				</div>
				{aside}
			</div>
			{children}
		</section>
	);
}
