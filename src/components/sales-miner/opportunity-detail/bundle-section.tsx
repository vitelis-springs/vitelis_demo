import styles from "./bundle-section.module.css";
import { formatDate, hostOf, parseBundle } from "./bundle-section.utils";
import DossierSection from "./dossier-section";
import shared from "./opportunity-detail.module.css";

/**
 * The recommended export package ("bundle") shown to the admin reviewer.
 * Parsing and formatting live in ./bundle-section.utils; this is presentation:
 * human labels, a dated trigger timeline, and cited evidence — machine keys
 * (bundleId, plays) never reach the reviewer.
 */
export default function BundleSection({ value }: { value: unknown }) {
	const bundle = parseBundle(value);
	if (!bundle) return null;

	const { name, whyNow, narrative, pricing, dealRange, triggers, evidence } =
		bundle;

	return (
		<DossierSection
			id="bundle"
			eyebrow="Export package"
			title={name ?? "Recommended bundle"}
			aside={
				dealRange ? (
					<span className={styles.bundleDeal}>
						<small>Deal size</small>
						{dealRange}
					</span>
				) : undefined
			}
		>
			{whyNow && (
				<div className={styles.bundleField}>
					<div className={shared.wrHead}>Why now</div>
					<p className={shared.narrativeLede}>{whyNow}</p>
				</div>
			)}

			{narrative && (
				<div className={styles.bundleField}>
					<div className={shared.wrHead}>How to sell it</div>
					<p className={styles.bundleProse}>{narrative}</p>
				</div>
			)}

			{triggers.length > 0 && (
				<div className={styles.bundleField}>
					<div className={shared.wrHead}>Trigger signals</div>
					<ol className={styles.timeline}>
						{triggers.map((t) => (
							<li
								className={styles.timelineItem}
								key={`${t.date ?? ""}-${t.text.slice(0, 40)}`}
							>
								<span className={styles.timelineDate}>
									{t.date ? formatDate(t.date) : "Undated"}
								</span>
								<span className={styles.timelineText}>{t.text}</span>
							</li>
						))}
					</ol>
				</div>
			)}

			{pricing && (
				<div className={styles.bundleField}>
					<div className={shared.wrHead}>Pricing guidance</div>
					<p className={styles.bundlePricing}>{pricing}</p>
				</div>
			)}

			{evidence.length > 0 && (
				<div className={styles.bundleField}>
					<div className={shared.wrHead}>Evidence</div>
					<div className={styles.evidenceList}>
						{evidence.map((e) => (
							<div
								className={styles.evidenceItem}
								key={e.url ?? e.quote?.slice(0, 40)}
							>
								{e.source && (
									<div className={styles.evidenceSource}>{e.source}</div>
								)}
								{e.quote && <p className={styles.evidenceQuote}>“{e.quote}”</p>}
								{e.url && (
									<a
										className={styles.evidenceLink}
										href={e.url}
										target="_blank"
										rel="noreferrer"
									>
										{hostOf(e.url)}
									</a>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</DossierSection>
	);
}
