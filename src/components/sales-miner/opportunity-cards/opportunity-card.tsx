"use client";

import { Checkbox, Tooltip } from "antd";
import type { PointerEvent as ReactPointerEvent } from "react";
import type {
	OpportunityCard as OpportunityCardData,
	OpportunityCardStat,
} from "../../../types/deep-dive.types";
import styles from "./opportunity-card.module.css";

const TIER_CLASS = {
	gold: styles.gold,
	silver: styles.silver,
	bronze: styles.bronze,
} as const;

const TIER_LABEL = {
	gold: "Gold",
	silver: "Silver",
	bronze: "Bronze",
} as const;

const MAX_TILT = 8;

function monogram(name: string | null): string {
	if (!name) return "—";
	const words = name.trim().split(/\s+/);
	const first = words[0] ?? "";
	if (first.length <= 4) return first.toUpperCase();
	return words
		.slice(0, 2)
		.map((w) => w[0] ?? "")
		.join("")
		.toUpperCase();
}

/** Prefer the real value (count / percent); fall back to the normalised 0–99. */
function statDisplay(stat: OpportunityCardStat): string {
	if (typeof stat.raw === "number") return String(stat.raw);
	if (typeof stat.raw === "string" && stat.raw.trim().endsWith("%")) {
		return stat.raw.trim();
	}
	return String(stat.value);
}

interface OpportunityCardProps {
	card: OpportunityCardData;
	onOpen?: (card: OpportunityCardData) => void;
	onToggleApproval?: (opportunityId: string, checked: boolean) => void;
}

export default function OpportunityCard({
	card,
	onOpen,
	onToggleApproval,
}: OpportunityCardProps) {
	const position = (card.motionFamily ?? "OPP").toUpperCase();

	const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
		const el = e.currentTarget;
		const rect = el.getBoundingClientRect();
		const px = (e.clientX - rect.left) / rect.width;
		const py = (e.clientY - rect.top) / rect.height;
		const rotY = (px - 0.5) * 2 * MAX_TILT;
		const rotX = -(py - 0.5) * 2 * MAX_TILT;
		el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px)`;
		el.style.setProperty("--mx", `${px * 100}%`);
		el.style.setProperty("--my", `${py * 100}%`);
	};

	const resetTilt = (e: ReactPointerEvent<HTMLDivElement>) => {
		e.currentTarget.style.transform = "";
	};

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled via onKeyDown below.
		<div
			className={`${styles.frame} ${TIER_CLASS[card.tier]}`}
			role="button"
			tabIndex={0}
			onClick={() => onOpen?.(card)}
			onPointerMove={handlePointerMove}
			onPointerLeave={resetTilt}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onOpen?.(card);
				}
			}}
			title={card.title}
		>
			<div
				className={`${styles.card} ${TIER_CLASS[card.tier]} ${
					card.isApproved ? "" : styles.unapproved
				}`}
			>
				<div className={styles.content}>
					<div className={styles.header}>
						<div className={styles.ratingBlock}>
							<span className={styles.overall}>{card.overall}</span>
							<span className={styles.position}>{position}</span>
							<span className={styles.tierBadge}>{TIER_LABEL[card.tier]}</span>
						</div>
						<div className={styles.rightCol}>
							{onToggleApproval && (
								<Tooltip title="Approved">
									<span
										className={styles.approveToggle}
										onClick={(e) => e.stopPropagation()}
										onKeyDown={(e) => e.stopPropagation()}
									>
										<Checkbox
											checked={card.isApproved}
											onChange={(e) =>
												onToggleApproval(card.id, e.target.checked)
											}
										/>
									</span>
								</Tooltip>
							)}
							{card.rankPosition != null && (
								<span className={styles.rank}>#{card.rankPosition}</span>
							)}
							<span className={styles.mono}>{monogram(card.companyName)}</span>
						</div>
					</div>

					<div className={styles.crest}>
						{card.companyName && <span>{card.companyName}</span>}
						{card.companyName && card.stage && (
							<span className={styles.dot}>·</span>
						)}
						{card.stage && <span>{card.stage}</span>}
					</div>

					<div className={styles.title}>{card.title}</div>

					{card.dealSize && (
						<span className={styles.dealRibbon}>{card.dealSize}</span>
					)}

					<div className={styles.divider} />

					<div className={styles.stats}>
						{card.stats.map((stat) => (
							<Tooltip
								key={stat.key}
								title={`${stat.title}${stat.raw != null ? ` — ${stat.raw}` : ""}`}
							>
								<div className={styles.stat}>
									<div className={styles.statTop}>
										<span className={styles.statValue}>
											{statDisplay(stat)}
										</span>
										<span className={styles.statLabel}>{stat.label}</span>
									</div>
									<div className={styles.statBar}>
										<div
											className={styles.statFill}
											style={{ width: `${stat.value}%` }}
										/>
									</div>
								</div>
							</Tooltip>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
