"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Empty, Segmented, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	useGetCompanyOpportunityCards,
	useGetDeepDiveOverview,
	useSetOpportunityCandidateApproval,
} from "../../../hooks/api/useDeepDiveService";
import type {
	OpportunityCardsResponse,
	OpportunityCardTier,
} from "../../../types/deep-dive.types";
import DeepDiveBreadcrumbs from "../../deep-dive/breadcrumbs";
import CompanyLogo from "../company-logo";
import OpportunityCard from "./opportunity-card";
import styles from "./opportunity-cards-grid.module.css";
import { OPPORTUNITY_CARD_TIER_META } from "./opportunity-card-tiers";

const { Title, Text } = Typography;

function reportCrumbLabel(
	reportName: string | null | undefined,
	reportId: number,
) {
	return reportName?.trim() || `Report #${reportId}`;
}

type SortKey = "rank" | "score";
type TierFilter = "all" | OpportunityCardTier;
type ApprovalFilter = "all" | "approved" | "unapproved";

interface OpportunityCardsGridProps {
	reportId: number;
	companyId: number;
}

export default function OpportunityCardsGrid({
	reportId,
	companyId,
}: OpportunityCardsGridProps) {
	const router = useRouter();
	const { message } = App.useApp();
	const queryClient = useQueryClient();
	const { data: reportOverview } = useGetDeepDiveOverview(reportId);
	const { data, isLoading, isError, error } = useGetCompanyOpportunityCards(
		reportId,
		companyId,
	);
	const { mutate: setApproval } = useSetOpportunityCandidateApproval(
		reportId,
		companyId,
	);
	const [sortKey, setSortKey] = useState<SortKey>("rank");
	const [tierFilter, setTierFilter] = useState<TierFilter>("all");
	const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("all");
	const previousApprovedCountRef = useRef<number | null>(null);
	const [dopCounterPulse, setDopCounterPulse] = useState(false);

	const opportunityCardsQueryKey = [
		"deep-dive",
		"opportunity-cards",
		reportId,
		companyId,
	] as const;

	const handleToggleApproval = (opportunityId: string, checked: boolean) => {
		queryClient.setQueryData<OpportunityCardsResponse>(
			opportunityCardsQueryKey,
			(old) =>
				old && {
					...old,
					data: {
						...old.data,
						cards: old.data.cards.map((c) =>
							c.id === opportunityId ? { ...c, isApproved: checked } : c,
						),
					},
				},
		);
		setApproval(
			{ opportunityId, isApproved: checked },
			{
				onSuccess: () => {
					message.success(
						checked
							? "Opportunity selected for DOP export"
							: "Opportunity removed from DOP export",
					);
				},
				onError: () => {
					queryClient.setQueryData<OpportunityCardsResponse>(
						opportunityCardsQueryKey,
						(old) =>
							old && {
								...old,
								data: {
									...old.data,
									cards: old.data.cards.map((c) =>
										c.id === opportunityId ? { ...c, isApproved: !checked } : c,
									),
								},
							},
					);
					message.error("Failed to update approval status");
				},
			},
		);
	};

	const allCards = useMemo(() => data?.data.cards ?? [], [data]);
	const approvedCount = useMemo(
		() => allCards.filter((card) => card.isApproved).length,
		[allCards],
	);
	const companyName = data?.data.companyName;
	const companyLogoUrl = data?.data.companyLogoUrl;
	const reportName = reportOverview?.data.report.name;
	const companyLabel = companyName?.trim() || `Company #${companyId}`;

	useEffect(() => {
		if (previousApprovedCountRef.current === null) {
			previousApprovedCountRef.current = approvedCount;
			return;
		}

		if (previousApprovedCountRef.current === approvedCount) return;

		previousApprovedCountRef.current = approvedCount;
		setDopCounterPulse(false);
		const startTimer = window.setTimeout(() => setDopCounterPulse(true), 0);
		const stopTimer = window.setTimeout(() => setDopCounterPulse(false), 760);

		return () => {
			window.clearTimeout(startTimer);
			window.clearTimeout(stopTimer);
		};
	}, [approvedCount]);

	const visibleCards = useMemo(() => {
		const filtered = allCards
			.filter((c) => tierFilter === "all" || c.tier === tierFilter)
			.filter(
				(c) =>
					approvalFilter === "all" ||
					(approvalFilter === "approved" ? c.isApproved : !c.isApproved),
			);
		const sorted = [...filtered].sort((a, b) => {
			if (sortKey === "score") return b.overall - a.overall;
			return (a.rankPosition ?? 1e9) - (b.rankPosition ?? 1e9);
		});
		return sorted;
	}, [allCards, tierFilter, approvalFilter, sortKey]);

	if (isLoading) {
		return (
			<div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
				<Spin size="large" />
			</div>
		);
	}

	if (isError) {
		return (
			<Alert
				type="error"
				showIcon
				title="Failed to load opportunities"
				description={error instanceof Error ? error.message : undefined}
			/>
		);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
			<div>
				<DeepDiveBreadcrumbs
					items={[
						{ label: "Sales Miner", href: "/sales-miner" },
						{ label: "Reports", href: "/sales-miner?tab=reports" },
						{
							label: reportCrumbLabel(reportName, reportId),
							href: `/sales-miner/reports/${reportId}`,
						},
						{ label: companyLabel },
					]}
				/>
				<Button
					type="text"
					size="small"
					icon={<ArrowLeftOutlined />}
					onClick={() => router.back()}
					style={{ marginBottom: 12, paddingLeft: 0 }}
				>
					Back
				</Button>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						gap: 16,
						flexWrap: "wrap",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
						<CompanyLogo
							name={companyName}
							logoUrl={companyLogoUrl}
							size={52}
							logoBackground="rgba(255,255,255,0.92)"
							fallbackBackground={OPPORTUNITY_CARD_TIER_META.gold.swatch}
							avatarStyle={{ padding: 6 }}
							style={{
								borderRadius: 12,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontWeight: 800,
								fontSize: 16,
								color: "#2a1e00",
								boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
								overflow: "hidden",
							}}
						/>
						<div className={styles.headerText}>
							<Title level={4} style={{ margin: 0 }}>
								Opportunities{companyName ? ` · ${companyName}` : ""}
							</Title>
							<div className={styles.headerMeta}>
								<div
									className={[
										styles.dopCounter,
										dopCounterPulse ? styles.dopCounterPulse : "",
									]
										.filter(Boolean)
										.join(" ")}
									aria-label={
										approvedCount + " opportunities selected for DOP export"
									}
								>
									<span className={styles.dopCounterNumber}>
										{approvedCount}
									</span>
									<span className={styles.dopCounterLabel}>
										Selected for DOP export
									</span>
								</div>
								<Text type="secondary" className={styles.summaryText}>
									{allCards.length} total · showing {visibleCards.length} ·
									ranked by priority
								</Text>
							</div>
						</div>
					</div>

					<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
						<Segmented<SortKey>
							value={sortKey}
							onChange={(v) => setSortKey(v)}
							options={[
								{ label: "By rank", value: "rank" },
								{ label: "By score", value: "score" },
							]}
						/>
						<Segmented<TierFilter>
							value={tierFilter}
							onChange={(v) => setTierFilter(v)}
							options={[
								{ label: "All", value: "all" },
								{ label: "🥇 Gold", value: "gold" },
								{ label: "🥈 Silver", value: "silver" },
								{ label: "🥉 Bronze", value: "bronze" },
							]}
						/>
						<Segmented<ApprovalFilter>
							value={approvalFilter}
							onChange={(v) => setApprovalFilter(v)}
							options={[
								{ label: "All", value: "all" },
								{ label: "Approved", value: "approved" },
								{ label: "Not approved", value: "unapproved" },
							]}
						/>
					</div>
				</div>
			</div>

			{visibleCards.length === 0 ? (
				<Empty description="No opportunities match this filter." />
			) : (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
						gap: 26,
						justifyItems: "center",
					}}
				>
					{visibleCards.map((card) => (
						<OpportunityCard
							key={card.id}
							card={card}
							onMoreDetails={(c) =>
								router.push(
									`/sales-miner/reports/${reportId}/companies/${companyId}/opp/${c.id}`,
								)
							}
							onToggleApproval={handleToggleApproval}
						/>
					))}
				</div>
			)}
		</div>
	);
}
