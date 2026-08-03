import type { OpportunityStakeholder } from "../../../../types/sales-miner-opportunity-detail.types";
import ep from "./export-preview.module.css";
import { humanize, initials } from "./export-preview.utils";
import styles from "./stakeholders-tab.module.css";
import { toneClass } from "./tone";

/** Gate-role type ("decision" / "delivery" / "approval") tinted by weight. */
function gateTypeClass(type: string | null): string {
	const tone =
		type === "decision" ? "win" : type === "delivery" ? "ok" : "warn";
	return toneClass(tone);
}

function StakeholderCard({ person }: { person: OpportunityStakeholder }) {
	const entity = [
		person.entityName,
		person.entityLevel && `(${person.entityLevel})`,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<article className={styles.stakeCard}>
			<div className={styles.stakeTop}>
				<span className={styles.stakeAvatar}>{initials(person.name)}</span>
				<div className={styles.stakeId}>
					<div className={styles.stakeName}>{person.name ?? "Unnamed"}</div>
					{person.jobTitle && (
						<div className={styles.stakeTitle}>{person.jobTitle}</div>
					)}
					{entity && <div className={styles.stakeEntity}>{entity}</div>}
				</div>
				<div className={styles.gateBadge}>
					{person.gateRole && (
						<span className={styles.gateRole}>{humanize(person.gateRole)}</span>
					)}
					{person.gateRoleType && (
						<span
							className={`${ep.gateType} ${gateTypeClass(person.gateRoleType)}`}
						>
							{person.gateRoleType}
						</span>
					)}
				</div>
			</div>

			{(person.linkedinUrl || person.emails.length > 0) && (
				<div className={styles.stakeLinks}>
					{person.linkedinUrl && (
						<a
							className={styles.stakeChip}
							href={person.linkedinUrl}
							target="_blank"
							rel="noreferrer"
						>
							LinkedIn
						</a>
					)}
					{person.emails.map((email) => (
						<a
							className={styles.stakeChip}
							key={email}
							href={`mailto:${email}`}
						>
							{email}
						</a>
					))}
				</div>
			)}

			{person.messageBody && (
				<details className={styles.stakeEmail}>
					<summary className={styles.stakeEmailSummary}>
						Draft outreach
						{person.messageSubject && (
							<span className={styles.stakeEmailSubject}>
								· {person.messageSubject}
							</span>
						)}
					</summary>
					<p className={styles.stakeEmailBody}>{person.messageBody}</p>
				</details>
			)}
		</article>
	);
}

export default function StakeholdersTab({
	stakeholders,
}: {
	stakeholders: OpportunityStakeholder[];
}) {
	if (stakeholders.length === 0) {
		return <p className={ep.tabEmpty}>No stakeholders mapped yet.</p>;
	}
	return (
		<div className={styles.stakeList}>
			{stakeholders.map((person) => (
				<StakeholderCard person={person} key={person.id} />
			))}
		</div>
	);
}
