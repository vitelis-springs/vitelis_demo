import styles from "./competitive-tab.module.css";
import ep from "./export-preview.module.css";
import type { Competitive } from "./export-preview.types";
import { hostOf, humanize } from "./export-preview.utils";
import { statusTone, toneClass } from "./tone";

function Badge({ label, value }: { label: string; value: string | null }) {
	if (!value) return null;
	return (
		<span className={toneClass(statusTone(value))}>
			{label}: {humanize(value)}
		</span>
	);
}

export default function CompetitiveTab({ data }: { data: Competitive }) {
	const confidencePct =
		data.confidence != null ? `${Math.round(data.confidence * 100)}%` : null;

	return (
		<div>
			<div className={styles.compStats}>
				<Badge label="Status" value={data.status} />
				<Badge label="Applicability" value={data.applicability} />
				<Badge label="Play" value={data.sellerImplication} />
				{confidencePct && (
					<span className={ep.tone}>Confidence: {confidencePct}</span>
				)}
			</div>

			{data.detailText && <p className={ep.prose}>{data.detailText}</p>}

			{data.vendors.length > 0 && (
				<div className={ep.field}>
					<div className={ep.head}>Vendors in play</div>
					<div>
						{data.vendors.map((vendor) => (
							<div
								className={styles.vendorRow}
								key={vendor.name ?? vendor.role}
							>
								<div className={styles.vendorName}>
									{vendor.name ?? "Unnamed"}
									{vendor.evidenceStrength && (
										<span
											className={`${ep.gateType} ${toneClass(
												statusTone(vendor.evidenceStrength),
											)}`}
											style={{ marginLeft: 8 }}
										>
											{vendor.evidenceStrength}
										</span>
									)}
								</div>
								{vendor.role && (
									<div className={styles.vendorRole}>{vendor.role}</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{data.sources.length > 0 && (
				<div className={ep.field}>
					<div className={ep.head}>Sources</div>
					<div className={styles.srcList}>
						{data.sources.map((source) => (
							<div className={styles.srcItem} key={source.url ?? source.title}>
								{source.title && (
									<div className={styles.srcSource}>{source.title}</div>
								)}
								{source.evidenceSummary && (
									<p className={styles.srcQuote}>{source.evidenceSummary}</p>
								)}
								{source.url && (
									<a
										className={styles.srcLink}
										href={source.url}
										target="_blank"
										rel="noreferrer"
									>
										{hostOf(source.url)}
									</a>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
