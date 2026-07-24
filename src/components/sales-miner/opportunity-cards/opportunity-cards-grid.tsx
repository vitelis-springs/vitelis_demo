"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Empty, Segmented, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
	useGetCompanyOpportunityCards,
	useSetOpportunityCandidateApproval,
} from "../../../hooks/api/useDeepDiveService";
import type {
	OpportunityCardsResponse,
	OpportunityCardTier,
} from "../../../types/deep-dive.types";
import CompanyLogo from "../company-logo";
import OpportunityCard from "./opportunity-card";
import { OPPORTUNITY_CARD_TIER_META } from "./opportunity-card-tiers";

const { Title, Text } = Typography;

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
	const companyName = data?.data.companyName;
	const companyLogoUrl = data?.data.companyLogoUrl;

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
						<div>
							<Title level={4} style={{ margin: 0 }}>
								Opportunities{companyName ? ` · ${companyName}` : ""}
							</Title>
							<Text type="secondary">
								{allCards.length} total · showing {visibleCards.length} · ranked
								by priority
							</Text>
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
