"use client";

import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { Button, Checkbox, Popover, Tag, Tooltip, Typography } from "antd";
import type {
	KeyboardEvent as ReactKeyboardEvent,
	PointerEvent as ReactPointerEvent,
} from "react";
import { useState } from "react";
import type {
	OpportunityCard as OpportunityCardData,
	OpportunityCardStat,
} from "../../../types/deep-dive.types";
import CompanyLogo from "../company-logo";
import styles from "./opportunity-card.module.css";
import { OPPORTUNITY_CARD_TIER_META } from "./opportunity-card-tiers";

const { Text } = Typography;

const TIER_CLASS = {
	gold: styles.gold,
	silver: styles.silver,
	bronze: styles.bronze,
} as const;

const MAX_TILT = 8;

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
	const tier = OPPORTUNITY_CARD_TIER_META[card.tier];

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
				<Tag color={tier.tagColor} style={{ marginInlineEnd: 0 }}>
					{tier.label}
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
						{card.isApproved ? <CheckOutlined /> : <CloseOutlined />}
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
								<span className={styles.tierBadge}>{tier.label}</span>
							</div>
							<div className={styles.rightCol}>
								{card.rankPosition != null && (
									<span className={styles.rank}>#{card.rankPosition}</span>
								)}
								<CompanyLogo
									name={card.companyName}
									logoUrl={card.companyLogoUrl}
									size={42}
									className={styles.mono}
									avatarClassName={styles.logo}
									logoBackground="rgba(255, 255, 255, 0.88)"
									fallbackBackground="rgba(0, 0, 0, 0.2)"
								/>
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
