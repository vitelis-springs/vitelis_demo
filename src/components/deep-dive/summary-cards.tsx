"use client";

import { Card, Col, Row, Space, Statistic, Typography } from "antd";
import {
	RightOutlined,
	CheckCircleOutlined,
	DollarOutlined,
	SettingOutlined,
	SyncOutlined,
	TeamOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
	type DeepDiveCompanyRow,
	type DeepDiveStatus,
	useGetReportCostStats,
	useGetDeepDiveMetric,
} from "../../hooks/api/useDeepDiveService";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import DeepDiveStatusTag from "./status-tag";

const { Text } = Typography;

function formatCost(value: number): string {
	if (value === 0) return "$0.00";
	if (value < 0.001) return `$${value.toFixed(6)}`;
	if (value < 0.01) return `$${value.toFixed(4)}`;
	return `$${value.toFixed(3)}`;
}

export default function SummaryCards({
	reportId,
	settingsName,
	basePath = "/deep-dive",
	compact = false,
	companies,
	companiesLoading = false,
}: {
	reportId: number;
	settingsName: string | null;
	basePath?: string;
	compact?: boolean;
	companies?: DeepDiveCompanyRow[];
	companiesLoading?: boolean;
}) {
	const router = useRouter();
	const companiesCount = useGetDeepDiveMetric<number>(
		reportId,
		"companies-count",
		{ enabled: !companies },
	);
	const orchestratorStatus = useGetDeepDiveMetric<DeepDiveStatus>(
		reportId,
		"orchestrator-status",
	);
	const usedSources = useGetDeepDiveMetric<number>(reportId, "used-sources", {
		enabled: !compact,
	});
	const costStats = useGetReportCostStats(reportId, !compact);
	const completion = useMemo(() => {
		const totals = (companies ?? []).reduce(
			(acc, company) => ({
				done: acc.done + company.stepsDone,
				total: acc.total + company.stepsTotal,
			}),
			{ done: 0, total: 0 },
		);

		return {
			...totals,
			percent:
				totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0,
		};
	}, [companies]);

	return (
		<>
			<Row
				gutter={[16, 16]}
				style={{ marginBottom: compact ? 24 : 16 }}
				align="stretch"
			>
				<Col xs={24} sm={12} md={8} style={{ display: "flex" }}>
					<Card style={{ ...DARK_CARD_STYLE, flex: 1 }}>
						<Statistic
							title={<Text style={{ color: "#8c8c8c" }}>Total Companies</Text>}
							value={
								companiesLoading || companiesCount.isLoading
									? "..."
									: (companies?.length ??
										companiesCount.data?.data.value ??
										"—")
							}
							prefix={<TeamOutlined style={{ color: "#58bfce" }} />}
							styles={{ content: { color: "#fff" } }}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} md={8} style={{ display: "flex" }}>
					<Card
						style={{
							...DARK_CARD_STYLE,
							flex: 1,
							cursor: "pointer",
							transition: "border-color 0.2s",
						}}
						hoverable
						onClick={() => router.push(`${basePath}/${reportId}/steps`)}
					>
						<Space orientation="vertical" size={8} style={{ width: "100%" }}>
							<Space style={{ width: "100%", justifyContent: "start", gap: 4 }}>
								<Text style={{ color: "#8c8c8c", fontSize: 14 }}>
									Orchestrator Status
								</Text>
								<RightOutlined style={{ color: "#8c8c8c", fontSize: 12 }} />
							</Space>
							<Space align="center" size="small">
								<SyncOutlined style={{ color: "#58bfce" }} />
								{orchestratorStatus.isLoading ? (
									<Text style={{ color: "#8c8c8c" }}>Loading...</Text>
								) : orchestratorStatus.data?.data.value ? (
									<DeepDiveStatusTag
										status={orchestratorStatus.data.data.value}
									/>
								) : (
									<Text style={{ color: "#8c8c8c" }}>—</Text>
								)}
							</Space>
						</Space>
					</Card>
				</Col>
				<Col xs={24} sm={12} md={8} style={{ display: "flex" }}>
					<Card
						style={{
							...DARK_CARD_STYLE,
							flex: 1,
							cursor: "pointer",
							transition: "border-color 0.2s",
						}}
						hoverable
						onClick={() => router.push(`${basePath}/${reportId}/settings`)}
					>
						<Space orientation="vertical" size={8}>
							<Space style={{ width: "100%", justifyContent: "start", gap: 4 }}>
								<Text style={{ color: "#8c8c8c", fontSize: 14 }}>Settings</Text>
								<RightOutlined style={{ color: "#8c8c8c", fontSize: 12 }} />
							</Space>
							<Space align="center" size="small">
								<SettingOutlined style={{ color: "#58bfce" }} />
								<Text style={{ color: "#fff", fontWeight: 600 }}>
									{settingsName ?? "—"}
								</Text>
							</Space>
						</Space>
					</Card>
				</Col>
			</Row>

			{!compact && (
				<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
					<Col xs={24} sm={12} md={8}>
						<Card style={DARK_CARD_STYLE}>
							<Statistic
								title={<Text style={{ color: "#8c8c8c" }}>Used Sources</Text>}
								value={
									usedSources.isLoading
										? "..."
										: (usedSources.data?.data.value ?? "—")
								}
								prefix={<CheckCircleOutlined style={{ color: "#58bfce" }} />}
								styles={{ content: { color: "#fff" } }}
							/>
						</Card>
					</Col>
					<Col xs={24} sm={12} md={8}>
						<Card style={DARK_CARD_STYLE}>
							<Statistic
								title={<Text style={{ color: "#8c8c8c" }}>Report Cost</Text>}
								value={
									costStats.isLoading
										? "..."
										: formatCost(costStats.data?.data.summary?.totalCost ?? 0)
								}
								prefix={<DollarOutlined style={{ color: "#58bfce" }} />}
								styles={{ content: { color: "#fff" } }}
							/>
						</Card>
					</Col>
					<Col xs={24} sm={12} md={8}>
						<Card style={DARK_CARD_STYLE}>
							<Statistic
								title={<Text style={{ color: "#8c8c8c" }}>Completion</Text>}
								value={companiesLoading ? "..." : `${completion.percent}%`}
								suffix={
									!companiesLoading && completion.total > 0 ? (
										<Text style={{ color: "#8c8c8c", fontSize: 12 }}>
											{completion.done}/{completion.total}
										</Text>
									) : null
								}
								prefix={<CheckCircleOutlined style={{ color: "#58bfce" }} />}
								styles={{ content: { color: "#fff" } }}
							/>
						</Card>
					</Col>
				</Row>
			)}
		</>
	);
}
