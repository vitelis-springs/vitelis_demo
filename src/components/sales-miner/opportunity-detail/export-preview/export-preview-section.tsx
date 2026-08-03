"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type KeyboardEvent, useMemo } from "react";
import type {
	OpportunityPortfolio,
	OpportunityQa,
	OpportunityStakeholder,
} from "../../../../types/sales-miner-opportunity-detail.types";
import DossierSection from "../dossier-section";
import CompetitiveTab from "./competitive-tab";
import styles from "./export-preview.module.css";
import type { ExportTabId } from "./export-preview.types";
import { parseCompetitive } from "./export-preview.utils";
import PortfolioTab from "./portfolio-tab";
import QaTab from "./qa-tab";
import StakeholdersTab from "./stakeholders-tab";

const QUERY_KEY = "previewTab";

export default function ExportPreviewSection({
	portfolio,
	stakeholders,
	competitiveAwareness,
	qa,
}: {
	portfolio: OpportunityPortfolio;
	stakeholders: OpportunityStakeholder[];
	competitiveAwareness: unknown;
	qa: OpportunityQa | null;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const competitive = useMemo(
		() => parseCompetitive(competitiveAwareness),
		[competitiveAwareness],
	);

	// Only offer tabs that have something to review; keep Excel order.
	const tabs = useMemo(() => {
		const list: Array<{ id: ExportTabId; label: string; count?: number }> = [
			{ id: "portfolio", label: "Portfolio" },
			{ id: "stakeholders", label: "Stakeholders", count: stakeholders.length },
			...(competitive
				? [
						{
							id: "competitive" as const,
							label: "Competitive",
							count: competitive.vendors.length || undefined,
						},
					]
				: []),
			...(qa
				? [
						{
							id: "qa" as const,
							label: "QA",
							count: qa.dimensions.length || undefined,
						},
					]
				: []),
		];
		return list;
	}, [stakeholders.length, competitive, qa]);

	// Active tab lives in the URL (?previewTab=…), matching this route's
	// edit-in-URL pattern, so it survives reload and is deep-linkable.
	const requested = searchParams.get(QUERY_KEY) as ExportTabId | null;
	const current = tabs.some((tab) => tab.id === requested)
		? (requested as ExportTabId)
		: (tabs[0]?.id ?? "portfolio");

	function selectTab(next: ExportTabId) {
		const params = new URLSearchParams(searchParams.toString());
		params.set(QUERY_KEY, next);
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	}

	function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		const index = tabs.findIndex((tab) => tab.id === current);
		let nextIndex: number | null = null;
		if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
		else if (event.key === "ArrowLeft")
			nextIndex = (index - 1 + tabs.length) % tabs.length;
		else if (event.key === "Home") nextIndex = 0;
		else if (event.key === "End") nextIndex = tabs.length - 1;
		if (nextIndex === null) return;
		event.preventDefault();
		const nextTab = tabs[nextIndex];
		if (!nextTab) return;
		selectTab(nextTab.id);
		document.getElementById(`ep-tab-${nextTab.id}`)?.focus();
	}

	return (
		<DossierSection
			id="export-preview"
			eyebrow="Before export"
			title="Export preview"
		>
			<div className={styles.tabStrip} role="tablist" onKeyDown={onTabKeyDown}>
				{tabs.map((tab) => {
					const selected = current === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							id={`ep-tab-${tab.id}`}
							aria-selected={selected}
							aria-controls={`ep-panel-${tab.id}`}
							tabIndex={selected ? 0 : -1}
							className={`${styles.tab} ${selected ? styles.tabActive : ""}`}
							onClick={() => selectTab(tab.id)}
						>
							{tab.label}
							{tab.count != null && (
								<span className={styles.tabCount}>{tab.count}</span>
							)}
						</button>
					);
				})}
			</div>

			<div
				role="tabpanel"
				id={`ep-panel-${current}`}
				aria-labelledby={`ep-tab-${current}`}
			>
				{current === "portfolio" && <PortfolioTab data={portfolio} />}
				{current === "stakeholders" && (
					<StakeholdersTab stakeholders={stakeholders} />
				)}
				{current === "competitive" && competitive && (
					<CompetitiveTab data={competitive} />
				)}
				{current === "qa" && qa && <QaTab data={qa} />}
			</div>
		</DossierSection>
	);
}
