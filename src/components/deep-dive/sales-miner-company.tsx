"use client";

import {
	Badge,
	Button,
	Card,
	Col,
	Collapse,
	Empty,
	Progress,
	Row,
	Space,
	Spin,
	Table,
	Tag,
	Tabs,
	Typography,
} from "antd";
import { EditOutlined, LinkOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import {
	useGetSalesMinerCompany,
	type SalesMinerOpportunity,
	type SalesMinerSignal,
	type SalesMinerStakeholder,
} from "../../hooks/api/useDeepDiveService";
import DeepDivePageLayout from "./shared/page-layout";
import PageHeader from "./shared/page-header";

const { Text, Paragraph, Title } = Typography;

const DARK_CARD: React.CSSProperties = {
	background: "#1f1f1f",
	borderColor: "#303030",
};

const TRACK_COLORS: Record<string, string> = {
	TSI: "blue",
	TMUS: "green",
	DTGBS: "purple",
};

const HORIZON_COLORS: Record<string, string> = {
	H1: "green",
	H2: "gold",
	H3: "red",
};

/* ─── helpers ─── */

function toRecord(v: unknown): Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v)
		? (v as Record<string, unknown>)
		: {};
}

function toArray(v: unknown): unknown[] {
	return Array.isArray(v) ? v : [];
}

function toString(v: unknown): string {
	return typeof v === "string" ? v : "";
}

/* ─── shared sub-components ─── */

function TrackBadge({ track }: { track: string | null }) {
	if (!track) return null;
	return <Tag color={TRACK_COLORS[track] ?? "default"}>{track}</Tag>;
}

function HorizonBadge({ horizon }: { horizon: string | null }) {
	if (!horizon) return null;
	return <Tag color={HORIZON_COLORS[horizon] ?? "default"}>{horizon}</Tag>;
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
	const pct = value !== null ? Math.round(value * 100) : 0;
	return (
		<div style={{ marginBottom: 4 }}>
			<Text style={{ color: "#8c8c8c", fontSize: 12 }}>{label}</Text>
			<Progress
				percent={pct}
				size="small"
				strokeColor={pct >= 80 ? "#52c41a" : pct >= 50 ? "#faad14" : "#ff4d4f"}
				format={(p) => (
					<Text style={{ fontSize: 11, color: "#d9d9d9" }}>{p}%</Text>
				)}
			/>
		</div>
	);
}

/* ─── Opportunities table (shared for account + entity level) ─── */

function OpportunitiesTable({
	opportunities,
	loading,
	showEntity,
}: {
	opportunities: SalesMinerOpportunity[];
	loading: boolean;
	showEntity?: boolean;
}) {
	const columns = [
		{
			title: "Score",
			dataIndex: "portfolioPriorityScore",
			key: "score",
			width: 80,
			sorter: (a: SalesMinerOpportunity, b: SalesMinerOpportunity) =>
				(a.portfolioPriorityScore ?? 0) - (b.portfolioPriorityScore ?? 0),
			render: (v: number | null) =>
				v !== null ? (
					<Text strong style={{ color: "#1677ff" }}>
						{v}
					</Text>
				) : (
					"—"
				),
		},
		{
			title: "Track",
			dataIndex: "track",
			key: "track",
			width: 90,
			render: (v: string | null) => <TrackBadge track={v} />,
		},
		{
			title: "Horizon",
			dataIndex: "horizon",
			key: "horizon",
			width: 80,
			render: (v: string | null) => <HorizonBadge horizon={v} />,
		},
		{
			title: "Deal Size",
			dataIndex: "dealSize",
			key: "dealSize",
			width: 160,
			render: (v: string | null) => (
				<Text style={{ fontSize: 12 }}>{v ?? "—"}</Text>
			),
		},
		...(showEntity
			? [
					{
						title: "Entity",
						dataIndex: "entityName",
						key: "entityName",
						width: 200,
						render: (v: string | undefined) => (
							<Text style={{ fontSize: 12 }}>{v ?? "—"}</Text>
						),
					},
				]
			: []),
		{
			title: "Opportunity",
			dataIndex: "title",
			key: "title",
			render: (v: string | null) => (
				<Text style={{ color: "#d9d9d9" }}>{v ?? "—"}</Text>
			),
		},
	];

	return (
		<Table
			dataSource={opportunities}
			rowKey="id"
			loading={loading}
			columns={columns}
			pagination={{ pageSize: 10 }}
			scroll={{ x: 900 }}
			size="small"
			expandable={{
				expandedRowRender: (record: SalesMinerOpportunity) => (
					<div style={{ padding: "8px 16px" }}>
						{record.whyNow && (
							<div style={{ marginBottom: 8 }}>
								<Text strong style={{ color: "#faad14" }}>
									Why now:{" "}
								</Text>
								<Text style={{ color: "#d9d9d9" }}>{record.whyNow}</Text>
							</div>
						)}
						{record.businessProblem && (
							<div style={{ marginBottom: 8 }}>
								<Text strong style={{ color: "#8c8c8c" }}>
									Business problem:{" "}
								</Text>
								<Text style={{ color: "#d9d9d9" }}>
									{record.businessProblem}
								</Text>
							</div>
						)}
						{record.valueProposition && (
							<div>
								<Text strong style={{ color: "#8c8c8c" }}>
									Value proposition:{" "}
								</Text>
								<Text style={{ color: "#d9d9d9" }}>
									{record.valueProposition}
								</Text>
							</div>
						)}
					</div>
				),
			}}
		/>
	);
}

/* ─── Stakeholders table ─── */

function StakeholdersTable({
	stakeholders,
	loading,
}: {
	stakeholders: SalesMinerStakeholder[];
	loading: boolean;
}) {
	const columns = [
		{
			title: "Name",
			key: "name",
			width: 200,
			render: (_: unknown, r: SalesMinerStakeholder) =>
				r.linkedinUrl ? (
					<a href={r.linkedinUrl} target="_blank" rel="noopener noreferrer">
						<LinkOutlined style={{ marginRight: 4 }} />
						{r.fullName ?? "—"}
					</a>
				) : (
					<Text style={{ color: "#d9d9d9" }}>{r.fullName ?? "—"}</Text>
				),
		},
		{
			title: "Role",
			dataIndex: "roleTitle",
			key: "roleTitle",
			render: (v: string | null) => (
				<Text style={{ fontSize: 12 }}>{v ?? "—"}</Text>
			),
		},
		{
			title: "Gate Role",
			dataIndex: "gateRole",
			key: "gateRole",
			width: 150,
			render: (v: string | null) => (v ? <Tag>{v}</Tag> : null),
		},
		{
			title: "Entity",
			dataIndex: "entityName",
			key: "entityName",
			width: 200,
			render: (v: string | null) => (
				<Text style={{ fontSize: 12 }}>{v ?? "—"}</Text>
			),
		},
		{
			title: "Level",
			dataIndex: "entityLevel",
			key: "entityLevel",
			width: 100,
			render: (v: string | null) =>
				v ? <Tag color={v === "Group" ? "purple" : "default"}>{v}</Tag> : null,
		},
	];

	return (
		<Table
			dataSource={stakeholders}
			rowKey="id"
			loading={loading}
			columns={columns}
			pagination={{ pageSize: 10 }}
			scroll={{ x: 900 }}
			size="small"
			expandable={{
				expandedRowRender: (r: SalesMinerStakeholder) =>
					r.rationale ? (
						<Paragraph style={{ color: "#8c8c8c", margin: "8px 16px" }}>
							{r.rationale}
						</Paragraph>
					) : null,
			}}
		/>
	);
}

/* ─── Signals grid (entity level) ─── */

function SignalsGrid({
	signals,
	loading,
}: {
	signals: SalesMinerSignal[];
	loading: boolean;
}) {
	const groups = useMemo(() => {
		const macro = signals.filter((s) => s.themeCode === "macro_signal");
		const micro = signals.filter((s) => s.themeCode === "micro_signal");
		const product = signals.filter((s) => s.themeCode === "product_signal");
		return { macro, micro, product };
	}, [signals]);

	if (loading) return <Spin />;

	const renderCards = (items: SalesMinerSignal[]) =>
		items.length === 0 ? (
			<Empty description="No signals" />
		) : (
			<Row gutter={[16, 16]}>
				{items.map((s) => (
					<Col xs={24} lg={12} key={s.id}>
						<Card
							size="small"
							style={DARK_CARD}
							title={
								<Text strong style={{ color: "#d9d9d9" }}>
									{s.signalName ?? "Signal"}
								</Text>
							}
						>
							{s.signalDescription && (
								<Paragraph
									style={{ color: "#8c8c8c", fontSize: 12, marginBottom: 8 }}
								>
									{s.signalDescription}
								</Paragraph>
							)}
							<ScoreBar label="Strength" value={s.strengthScore} />
							<ScoreBar label="Confidence" value={s.confidenceScore} />
							<ScoreBar label="Freshness" value={s.freshnessScore} />
							{s.summaryText && (
								<Paragraph
									style={{
										color: "#d9d9d9",
										fontSize: 12,
										marginTop: 8,
										marginBottom: 0,
									}}
								>
									{s.summaryText}
								</Paragraph>
							)}
						</Card>
					</Col>
				))}
			</Row>
		);

	return (
		<Tabs
			items={[
				{
					key: "micro",
					label: `Micro signals (${groups.micro.length})`,
					children: renderCards(groups.micro),
				},
				{
					key: "macro",
					label: `Macro signals (${groups.macro.length})`,
					children: renderCards(groups.macro),
				},
				{
					key: "product",
					label: `Product signals (${groups.product.length})`,
					children: renderCards(groups.product),
				},
			]}
		/>
	);
}

/* ─── Account Level View ─── */

function AccountLevelView({
	reportId,
	companyId,
	companyName,
	basePath = "/sales-miner",
	onEdit,
}: {
	reportId: number;
	companyId: number;
	companyName: string;
	basePath?: string;
	onEdit?: () => void;
}) {
	const { data, isLoading } = useGetSalesMinerCompany(reportId, companyId);
	const payload = data?.data;

	const snapshot = useMemo(() => {
		if (!payload || payload.level !== "account") return null;
		const raw = toRecord(payload.accountSnapshot);
		const items = toArray(raw.acc_snapshot);
		const stage1 = toRecord(toRecord(items[1]).account_snapshot_stage_1)
			.account as Record<string, unknown> | undefined;
		const stage2 = toRecord(
			toRecord(items[0]).account_snapshot_stage_2_group_strategy,
		).account as Record<string, unknown> | undefined;
		return { stage1, stage2 };
	}, [payload]);

	const assessment = useMemo(() => {
		if (!payload || payload.level !== "account") return null;
		return toRecord(toRecord(payload.accountAssessment).account_assessment);
	}, [payload]);

	const sellerBrief = useMemo(() => {
		if (!payload || payload.level !== "account") return null;
		return toRecord(toRecord(payload.sellerBrief).seller_brief);
	}, [payload]);

	const topOpportunities =
		(payload?.level === "account" ? payload.topOpportunities : []) ?? [];
	const pains = toArray(assessment?.pains) as Array<Record<string, unknown>>;
	const leadPlays = toArray(assessment?.lead_plays) as Array<
		Record<string, unknown>
	>;
	const stakeholders = toArray(assessment?.stakeholders) as Array<
		Record<string, unknown>
	>;
	const timingSignals = toArray(assessment?.timing_signals) as Array<
		Record<string, unknown>
	>;
	const itThemes = toArray(snapshot?.stage1?.it_themes) as string[];
	const signals = toArray(snapshot?.stage1?.signals) as Array<
		Record<string, unknown>
	>;
	const strategicInitiatives = toArray(
		snapshot?.stage1?.strategic_initiatives_and_themes,
	) as Array<Record<string, unknown>>;
	const groupItStrategy = toArray(
		snapshot?.stage2?.group_it_strategy,
	) as string[];
	const latestNews = toArray(
		snapshot?.stage2?.latest_news_on_goals,
	) as string[];

	const stakeholderRows: SalesMinerStakeholder[] = stakeholders.map((s, i) => ({
		id: String(i),
		fullName: toString(s.name),
		linkedinUrl: toString(s.linkedin_url) || null,
		gateRole: toString(s.role) || null,
		gateRoleType: null,
		roleTitle: null,
		entityName: toString(s.entity_name) || null,
		entityLevel: toString(s.entity_level) || null,
		rationale:
			toString(s.notes_how_to_approach) || toString(s.likely_scope) || null,
		opportunityId: null,
	}));

	const leadPlaysColumns = [
		{
			title: "Track",
			dataIndex: "track",
			key: "track",
			width: 90,
			render: (v: string) => <TrackBadge track={v} />,
		},
		{
			title: "Play",
			dataIndex: "play_name",
			key: "play",
			render: (v: string) => <Text style={{ color: "#d9d9d9" }}>{v}</Text>,
		},
		{
			title: "Buying Center",
			dataIndex: "target_buying_center",
			key: "bc",
			width: 180,
			render: (v: string) => (v ? <Tag>{v}</Tag> : null),
		},
	];

	if (isLoading) {
		return (
			<DeepDivePageLayout>
				<div style={{ textAlign: "center", paddingTop: 80 }}>
					<Spin size="large" />
				</div>
			</DeepDivePageLayout>
		);
	}

	return (
		<DeepDivePageLayout>
			<PageHeader
				breadcrumbs={[
					{ label: "Sales Miner", href: "/sales-miner" },
					{ label: `Report #${reportId}`, href: `${basePath}/${reportId}` },
					{ label: companyName },
				]}
				title={companyName}
				extra={
					<Space>
						<Tag color="blue">Account Level</Tag>
						{onEdit && (
							<Button icon={<EditOutlined />} onClick={onEdit}>
								Edit
							</Button>
						)}
					</Space>
				}
			/>

			{itThemes.length > 0 && (
				<Space size={4} wrap style={{ marginBottom: 24 }}>
					{itThemes.map((t) => (
						<Tag key={t} color="geekblue">
							{t}
						</Tag>
					))}
				</Space>
			)}

			<Tabs
				items={[
					{
						key: "overview",
						label: "Overview",
						children: (
							<div>
								{/* Signals */}
								{signals.length > 0 && (
									<div style={{ marginBottom: 24 }}>
										<Title level={5} style={{ color: "#d9d9d9" }}>
											Signals
										</Title>
										<Row gutter={[12, 12]}>
											{signals.map((s, i) => (
												<Col xs={24} lg={12} key={i}>
													<Card size="small" style={DARK_CARD}>
														<Text strong style={{ color: "#d9d9d9" }}>
															{toString(s.signal)}
														</Text>
														<div style={{ marginTop: 4 }}>
															<Text style={{ color: "#faad14", fontSize: 12 }}>
																Why it matters:{" "}
															</Text>
															<Text style={{ color: "#8c8c8c", fontSize: 12 }}>
																{toString(s.why_it_matters)}
															</Text>
														</div>
														{!!s.likely_plays && (
															<div style={{ marginTop: 4 }}>
																<Text
																	style={{ color: "#52c41a", fontSize: 12 }}
																>
																	Likely plays:{" "}
																</Text>
																<Text
																	style={{ color: "#8c8c8c", fontSize: 12 }}
																>
																	{toString(s.likely_plays)}
																</Text>
															</div>
														)}
													</Card>
												</Col>
											))}
										</Row>
									</div>
								)}

								{/* Strategic Initiatives */}
								{strategicInitiatives.length > 0 && (
									<div style={{ marginBottom: 24 }}>
										<Title level={5} style={{ color: "#d9d9d9" }}>
											Strategic Initiatives
										</Title>
										<Collapse
											items={strategicInitiatives.map((s, i) => ({
												key: i,
												label: (
													<Text style={{ color: "#d9d9d9" }}>
														{toString(s.label)}
													</Text>
												),
												children: (
													<div>
														<Paragraph style={{ color: "#8c8c8c" }}>
															{toString(s.rationale_text)}
														</Paragraph>
														{toArray(s.context_anchors).length > 0 && (
															<ul style={{ color: "#8c8c8c", paddingLeft: 20 }}>
																{(toArray(s.context_anchors) as string[]).map(
																	(a, j) => (
																		<li key={j} style={{ marginBottom: 4 }}>
																			{a}
																		</li>
																	),
																)}
															</ul>
														)}
													</div>
												),
											}))}
											style={{ background: "#141414" }}
										/>
									</div>
								)}

								{/* Group IT Strategy */}
								{groupItStrategy.length > 0 && (
									<div style={{ marginBottom: 24 }}>
										<Title level={5} style={{ color: "#d9d9d9" }}>
											Group IT Strategy
										</Title>
										<ul style={{ color: "#8c8c8c", paddingLeft: 20 }}>
											{groupItStrategy.map((item, i) => (
												<li key={i} style={{ marginBottom: 6 }}>
													{item}
												</li>
											))}
										</ul>
									</div>
								)}

								{/* Latest News */}
								{latestNews.length > 0 && (
									<div>
										<Title level={5} style={{ color: "#d9d9d9" }}>
											Latest News
										</Title>
										<ul style={{ color: "#8c8c8c", paddingLeft: 20 }}>
											{latestNews.map((item, i) => (
												<li key={i} style={{ marginBottom: 6 }}>
													{item}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						),
					},
					{
						key: "opportunities",
						label: (
							<Badge
								count={topOpportunities.length}
								overflowCount={99}
								color="#1677ff"
								offset={[6, -2]}
							>
								<span>Top Opportunities</span>
							</Badge>
						),
						children: (
							<OpportunitiesTable
								opportunities={topOpportunities}
								loading={isLoading}
								showEntity
							/>
						),
					},
					{
						key: "assessment",
						label: "Assessment",
						children: (
							<div>
								{/* Pains */}
								{pains.length > 0 && (
									<div style={{ marginBottom: 24 }}>
										<Title level={5} style={{ color: "#d9d9d9" }}>
											Pains
										</Title>
										<Row gutter={[12, 12]}>
											{pains.map((p, i) => (
												<Col xs={24} lg={12} key={i}>
													<Card
														size="small"
														style={{
															...DARK_CARD,
															borderLeft: "3px solid #1677ff",
														}}
														title={
															<Text strong style={{ color: "#d9d9d9" }}>
																{toString(p.label)}
															</Text>
														}
													>
														<Paragraph
															style={{
																color: "#8c8c8c",
																fontStyle: "italic",
																marginBottom: 8,
															}}
														>
															&quot;{toString(p.rationale_text)}&quot;
														</Paragraph>
														{toArray(p.context_anchors).length > 0 && (
															<ul
																style={{
																	color: "#595959",
																	fontSize: 12,
																	paddingLeft: 16,
																	margin: 0,
																}}
															>
																{(toArray(p.context_anchors) as string[])
																	.slice(0, 3)
																	.map((a, j) => (
																		<li key={j}>{a}</li>
																	))}
															</ul>
														)}
													</Card>
												</Col>
											))}
										</Row>
									</div>
								)}

								{/* Lead Plays */}
								{leadPlays.length > 0 && (
									<div style={{ marginBottom: 24 }}>
										<Title level={5} style={{ color: "#d9d9d9" }}>
											Lead Plays
										</Title>
										<Table
											dataSource={leadPlays}
											rowKey={(_, i) => String(i)}
											columns={leadPlaysColumns}
											pagination={false}
											size="small"
											expandable={{
												expandedRowRender: (r: Record<string, unknown>) => (
													<div style={{ padding: "8px 16px" }}>
														{!!r.why_now_trigger && (
															<div style={{ marginBottom: 6 }}>
																<Text strong style={{ color: "#faad14" }}>
																	Why now:{" "}
																</Text>
																<Text
																	style={{ color: "#8c8c8c", fontSize: 12 }}
																>
																	{toString(r.why_now_trigger)}
																</Text>
															</div>
														)}
														{!!r.first_next_step && (
															<div>
																<Text strong style={{ color: "#52c41a" }}>
																	First step:{" "}
																</Text>
																<Text
																	style={{ color: "#8c8c8c", fontSize: 12 }}
																>
																	{toString(r.first_next_step)}
																</Text>
															</div>
														)}
													</div>
												),
											}}
										/>
									</div>
								)}

								{/* Timing */}
								{timingSignals.length > 0 && (
									<div>
										<Title level={5} style={{ color: "#d9d9d9" }}>
											Timing
										</Title>
										<Space orientation="vertical" style={{ width: "100%" }}>
											{timingSignals.map((t, i) => (
												<Card key={i} size="small" style={DARK_CARD}>
													<Space>
														<Tag
															color={
																HORIZON_COLORS[toString(t.timing_label)] ??
																"default"
															}
														>
															{toString(t.time_horizon)}
														</Tag>
														<Text style={{ color: "#d9d9d9" }}>
															{toString(t.theme)}
														</Text>
													</Space>
													{!!t.notes_evidence && (
														<Paragraph
															style={{
																color: "#8c8c8c",
																fontSize: 12,
																marginTop: 6,
																marginBottom: 0,
															}}
														>
															{toString(t.notes_evidence)}
														</Paragraph>
													)}
												</Card>
											))}
										</Space>
									</div>
								)}
							</div>
						),
					},
					{
						key: "stakeholders",
						label: (
							<Badge
								count={stakeholderRows.length}
								overflowCount={99}
								color="purple"
								offset={[6, -2]}
							>
								<span>Stakeholders</span>
							</Badge>
						),
						children: (
							<StakeholdersTable
								stakeholders={stakeholderRows}
								loading={isLoading}
							/>
						),
					},
					{
						key: "seller-brief",
						label: "Seller Brief",
						children: sellerBrief ? (
							<div>
								{!!sellerBrief.role_ops && (
									<div style={{ marginBottom: 16 }}>
										<Title level={5} style={{ color: "#d9d9d9" }}>
											Entry Points
										</Title>
										<Paragraph style={{ color: "#8c8c8c" }}>
											{toString(sellerBrief.role_ops)}
										</Paragraph>
									</div>
								)}
								{toArray(sellerBrief.lead_plays).length > 0 && (
									<div>
										<Title level={5} style={{ color: "#d9d9d9" }}>
											Lead Plays
										</Title>
										<ul style={{ color: "#8c8c8c", paddingLeft: 20 }}>
											{(toArray(sellerBrief.lead_plays) as string[]).map(
												(p, i) => (
													<li key={i} style={{ marginBottom: 6 }}>
														{p}
													</li>
												),
											)}
										</ul>
									</div>
								)}
							</div>
						) : (
							<Empty description="No seller brief available" />
						),
					},
				]}
			/>
		</DeepDivePageLayout>
	);
}

/* ─── Entity Level View ─── */

function EntityLevelView({
	reportId,
	companyId,
	companyName,
	basePath = "/sales-miner",
	onEdit,
}: {
	reportId: number;
	companyId: number;
	companyName: string;
	basePath?: string;
	onEdit?: () => void;
}) {
	const { data, isLoading } = useGetSalesMinerCompany(reportId, companyId);
	const payload = data?.data;

	const signals = (payload?.level === "entity" ? payload.signals : []) ?? [];
	const opportunities =
		(payload?.level === "entity" ? payload.opportunities : []) ?? [];
	const stakeholders =
		(payload?.level === "entity" ? payload.stakeholders : []) ?? [];

	if (isLoading) {
		return (
			<DeepDivePageLayout>
				<div style={{ textAlign: "center", paddingTop: 80 }}>
					<Spin size="large" />
				</div>
			</DeepDivePageLayout>
		);
	}

	return (
		<DeepDivePageLayout>
			<PageHeader
				breadcrumbs={[
					{ label: "Sales Miner", href: "/sales-miner" },
					{ label: `Report #${reportId}`, href: `${basePath}/${reportId}` },
					{ label: companyName },
				]}
				title={companyName}
				extra={
					<Space>
						<Tag color="geekblue">Entity Level</Tag>
						{onEdit && (
							<Button icon={<EditOutlined />} onClick={onEdit}>
								Edit
							</Button>
						)}
					</Space>
				}
			/>

			<Tabs
				items={[
					{
						key: "signals",
						label: (
							<Badge
								count={signals.length}
								overflowCount={99}
								color="cyan"
								offset={[6, -2]}
							>
								<span>Signals</span>
							</Badge>
						),
						children: <SignalsGrid signals={signals} loading={isLoading} />,
					},
					{
						key: "opportunities",
						label: (
							<Badge
								count={opportunities.length}
								overflowCount={99}
								color="#1677ff"
								offset={[6, -2]}
							>
								<span>Opportunities</span>
							</Badge>
						),
						children: (
							<OpportunitiesTable
								opportunities={opportunities}
								loading={isLoading}
							/>
						),
					},
					{
						key: "stakeholders",
						label: (
							<Badge
								count={stakeholders.length}
								overflowCount={99}
								color="purple"
								offset={[6, -2]}
							>
								<span>Stakeholders</span>
							</Badge>
						),
						children: (
							<StakeholdersTable
								stakeholders={stakeholders}
								loading={isLoading}
							/>
						),
					},
				]}
			/>
		</DeepDivePageLayout>
	);
}

/* ─── main export ─── */

export default function SalesMinerCompany({
	reportId,
	companyId,
	typeLevel,
	companyName,
	basePath = "/sales-miner",
	onEdit,
}: {
	reportId: number;
	companyId: number;
	typeLevel: string;
	companyName: string;
	basePath?: string;
	onEdit?: () => void;
}) {
	if (typeLevel === "account") {
		return (
			<AccountLevelView
				reportId={reportId}
				companyId={companyId}
				companyName={companyName}
				basePath={basePath}
				onEdit={onEdit}
			/>
		);
	}

	return (
		<EntityLevelView
			reportId={reportId}
			companyId={companyId}
			companyName={companyName}
			basePath={basePath}
			onEdit={onEdit}
		/>
	);
}
