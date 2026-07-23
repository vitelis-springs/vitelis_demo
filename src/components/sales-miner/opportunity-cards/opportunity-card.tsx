"use client";

import { Button, Checkbox, Popover, Tag, Tooltip, Typography } from "antd";
import type {
	KeyboardEvent as ReactKeyboardEvent,
	PointerEvent as ReactPointerEvent,
} from "react";
import { useState } from "react";
import type {
	OpportunityCard as OpportunityCardData,
	OpportunityCardStat,
	OpportunityCardTier,
} from "../../../types/deep-dive.types";
import styles from "./opportunity-card.module.css";

const { Text } = Typography;

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

const TIER_TAG_COLOR: Record<OpportunityCardTier, string> = {
	gold: "gold",
	silver: "default",
	bronze: "volcano",
};

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
	/** Navigate to the full deep-dive detail route. */
	onMoreDetails?: (card: OpportunityCardData) => void;
	onToggleApproval?: (opportunityId: string, checked: boolean) => void;
}

export default function OpportunityCard({
	card,
	onMoreDetails,
	onToggleApproval,
}: OpportunityCardProps) {
	const position = (card.motionFamily ?? "OPP").toUpperCase();
	const [menuOpen, setMenuOpen] = useState(false);

	const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			setMenuOpen((prev) => !prev);
		} else if (e.key === "Escape") {
			setMenuOpen(false);
		}
	};

	const popoverContent = (
		<div className={styles.menu}>
			<div className={styles.menuHead}>
				<Tag color={TIER_TAG_COLOR[card.tier]} style={{ marginInlineEnd: 0 }}>
					{TIER_LABEL[card.tier]}
				</Tag>
				<Text strong style={{ fontSize: 22, lineHeight: 1 }}>
					{card.overall}
				</Text>
				<Text type="secondary" style={{ fontSize: 12 }}>
					priority
				</Text>
			</div>

			<div className={styles.menuTitle}>{card.title}</div>

			<div className={styles.menuInfo}>
				<MenuRow label="Company" value={card.companyName ?? "—"} />
				<MenuRow
					label="Rank"
					value={card.rankPosition != null ? `#${card.rankPosition}` : "—"}
				/>
				<MenuRow label="Motion" value={card.motionFamily ?? "—"} />
				<MenuRow label="Stage" value={card.stage ?? "—"} />
				<MenuRow label="Status" value={card.status ?? "—"} />
				<MenuRow label="Deal size" value={card.dealSize ?? "—"} />
				<MenuRow label="Stakeholders" value={String(card.stakeholderCount)} />
				<MenuRow label="Products" value={String(card.productCount)} />
			</div>

			{onToggleApproval && (
				<Checkbox
					checked={card.isApproved}
					onChange={(e) => onToggleApproval(card.id, e.target.checked)}
				>
					Approved
				</Checkbox>
			)}

			<Button
				type="primary"
				block
				onClick={() => {
					setMenuOpen(false);
					onMoreDetails?.(card);
				}}
			>
				More details
			</Button>
		</div>
	);

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
		<Popover
			trigger="click"
			open={menuOpen}
			onOpenChange={setMenuOpen}
			placement="right"
			content={popoverContent}
		>
			{/* biome-ignore lint/a11y/useSemanticElements: a native <button> cannot wrap the nested card divs; the tilt card stays a div with role="button". */}
			<div
				className={`${styles.frame} ${TIER_CLASS[card.tier]} ${
					card.isApproved ? "" : styles.frameRejected
				}`}
				role="button"
				tabIndex={0}
				onPointerMove={handlePointerMove}
				onPointerLeave={resetTilt}
				onKeyDown={handleKeyDown}
				title={card.title}
			>
				<Tooltip
					title={
						card.isApproved
							? "Approved — included when opportunities are exported."
							: "Not approved — excluded from the export."
					}
				>
					<span
						className={`${styles.statusTag} ${
							card.isApproved ? styles.statusApproved : styles.statusRejected
						}`}
					>
						{card.isApproved ? "V" : "X"}
					</span>
				</Tooltip>
				<div
					className={`${styles.card} ${TIER_CLASS[card.tier]} ${
						card.isApproved ? "" : styles.rejected
					}`}
				>
					<div className={styles.content}>
						<div className={styles.header}>
							<div className={styles.ratingBlock}>
								<span className={styles.overall}>{card.overall}</span>
								<span className={styles.position}>{position}</span>
								<span className={styles.tierBadge}>
									{TIER_LABEL[card.tier]}
								</span>
							</div>
							<div className={styles.rightCol}>
								{card.rankPosition != null && (
									<span className={styles.rank}>#{card.rankPosition}</span>
								)}
								<span className={styles.mono}>
									{monogram(card.companyName)}
								</span>
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
		</Popover>
	);
}

function MenuRow({ label, value }: { label: string; value: string }) {
	return (
		<div className={styles.menuRow}>
			<Text type="secondary" style={{ fontSize: 12 }}>
				{label}
			</Text>
			<Text style={{ fontSize: 12, fontWeight: 600, textAlign: "right" }}>
				{value}
			</Text>
		</div>
	);
}
