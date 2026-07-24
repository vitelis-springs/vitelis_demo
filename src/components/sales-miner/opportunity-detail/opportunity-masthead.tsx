import CompanyLogo from "../company-logo";
import styles from "./opportunity-detail.module.css";

/** Account eyebrow, opportunity title, and the motion/stage/deal meta chips. */
export default function OpportunityMasthead({
	companyName,
	companyLogoUrl,
	title,
	motionFamily,
	stage,
	dealSize,
	horizonName,
	rankPosition,
}: {
	companyName: string | null;
	companyLogoUrl: string | null;
	title: string;
	motionFamily: string | null;
	stage: string | null;
	dealSize: string | null;
	horizonName: string | null;
	rankPosition: number | null;
}) {
	return (
		<div className={styles.masthead}>
			<CompanyLogo
				name={companyName}
				logoUrl={companyLogoUrl}
				size={68}
				className={styles.companyMark}
				avatarStyle={{ padding: 9 }}
			/>
			<div className={styles.mastText}>
				<span className={styles.eyebrow}>{companyName ?? "Account"}</span>
				<h1 className={styles.mastTitle}>{title}</h1>
				<div className={styles.meta}>
					{motionFamily && (
						<span className={`${styles.chip} ${styles.chipStrong}`}>
							{motionFamily}
						</span>
					)}
					{stage && <span className={styles.chip}>{stage}</span>}
					{dealSize && <span className={styles.chip}>{dealSize}</span>}
					{horizonName && <span className={styles.chip}>{horizonName}</span>}
					{rankPosition != null && (
						<span className={styles.chip}>Rank #{rankPosition}</span>
					)}
				</div>
			</div>
		</div>
	);
}
