"use client";

import { Card, Col, Row, Space, Statistic, Typography } from "antd";
import {
	RightOutlined,
	CheckCircleOutlined,
	DollarOutlined,
	ExclamationCircleOutlined,
	SafetyCertificateOutlined,
	SettingOutlined,
	SyncOutlined,
	TeamOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
	type DeepDiveCompanyRow,
	type DeepDiveStatus,
	useGetReportCostStats,
	useGetDeepDiveMetric,
} from "../../hooks/api/useDeepDiveService";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import DeepDiveStatusTag from "./status-tag";

const { Text } = Typography;
const STATIC_VALIDATION_OK_COLOR = "#52c41a";

function formatCost(value: number): string {
	if (value === 0) return "$0.00";
	if (value < 0.001) return `$${value.toFixed(6)}`;
	if (value < 0.01) return `$${value.toFixed(4)}`;
	return `$${value.toFixed(3)}`;
}

function formatOneDecimal(value: number | null): string {
	if (value === null) return "—";
	return (Math.round(value * 10) / 10).toFixed(1);
}

export default function SummaryCards({
	reportId,
	settingsName,
	basePath = "/deep-dive",
	compact = false,
	reportType,
	companies,
	companiesLoading = false,
}: {
	reportId: number;
	settingsName: string | null;
	basePath?: string;
	compact?: boolean;
	reportType?: string | null;
	companies?: DeepDiveCompanyRow[];
	companiesLoading?: boolean;
}) {
	const router = useRouter();
	const [staticValidationOpen, setStaticValidationOpen] = useState(false);
	const showStaticValidationCard = !compact && reportType === "biz_miner";
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
	const staticValidationSummary = useMemo(() => {
		const rows = companies ?? [];
		const companiesOk = rows.filter(
			(company) =>
				company.staticValidation.categoryMathOk &&
				!company.staticValidation.hasMissingReportDataPoints,
		).length;
		const categoryMismatchCompanies = rows.filter(
			(company) => company.staticValidation.categoryMathMismatchCount > 0,
		).length;
		const missingDataPointCompanies = rows.filter(
			(company) => company.staticValidation.hasMissingReportDataPoints,
		).length;
		const issueCompanies = rows
			.map((company) => {
				const categoryMathDetails =
					company.staticValidation.categoryMathDetails ?? [];
				const missingReportDataPointIds =
					company.staticValidation.missingReportDataPointIds ?? [];
				const hasCategoryMathIssues =
					company.staticValidation.categoryMathMismatchCount > 0;
				const hasMissingDataPointIssues =
					company.staticValidation.hasMissingReportDataPoints;

				return {
					id: company.id,
					name: company.name,
					hasIssues: hasCategoryMathIssues || hasMissingDataPointIssues,
					categoryMathMismatchCount:
						company.staticValidation.categoryMathMismatchCount,
					categoryMathDetails,
					missingReportDataPointsCount:
						company.staticValidation.missingReportDataPointsCount,
					missingReportDataPointIds,
				};
			})
			.filter((company) => company.hasIssues);

		return {
			companiesOk,
			totalCompanies: rows.length,
			categoryMismatchCompanies,
			missingDataPointCompanies,
			issueCompanies,
		};
	}, [companies]);
	const hasStaticValidationIssues =
		staticValidationSummary.issueCompanies.length > 0;
	const hasStaticValidationSuccess =
		!companiesLoading &&
		staticValidationSummary.totalCompanies > 0 &&
		!hasStaticValidationIssues;
	const staticValidationCardStyle = hasStaticValidationIssues
		? {
				...DARK_CARD_STYLE,
				flex: 1,
				cursor: "pointer",
				position: "relative",
				borderColor: "#fa8c16",
				background:
					"linear-gradient(135deg, rgba(250, 140, 22, 0.18), rgba(20, 20, 20, 0.96))",
				boxShadow: "0 0 0 1px rgba(250, 140, 22, 0.22)",
			}
		: { ...DARK_CARD_STYLE, flex: 1, position: "relative" };
	const primaryColProps = showStaticValidationCard
		? { xs: 24, sm: 12, md: 12, lg: 6 }
		: { xs: 24, sm: 12, md: 8 };

	return (
		<>
			<Row
				gutter={[16, 16]}
				style={{ marginBottom: compact ? 24 : 16 }}
				align="stretch"
			>
				<Col {...primaryColProps} style={{ display: "flex" }}>
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
				<Col {...primaryColProps} style={{ display: "flex" }}>
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
				<Col {...primaryColProps} style={{ display: "flex" }}>
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
				{showStaticValidationCard && (
					<Col {...primaryColProps} style={{ display: "flex" }}>
						<Card
							style={staticValidationCardStyle}
							hoverable={hasStaticValidationIssues}
							onClick={() => {
								if (hasStaticValidationIssues) {
									setStaticValidationOpen((open) => !open);
								}
							}}
							onKeyDown={(event) => {
								if (
									hasStaticValidationIssues &&
									(event.key === "Enter" || event.key === " ")
								) {
									event.preventDefault();
									setStaticValidationOpen((open) => !open);
								}
							}}
							role={hasStaticValidationIssues ? "button" : undefined}
							tabIndex={hasStaticValidationIssues ? 0 : undefined}
						>
							<Space orientation="vertical" size={8} style={{ width: "100%" }}>
								<Statistic
									title={
										<Text
											style={{
												color: hasStaticValidationIssues
													? "#ffd591"
													: STATIC_VALIDATION_OK_COLOR,
											}}
										>
											Static Validations
										</Text>
									}
									value={
										companiesLoading
											? "..."
											: staticValidationSummary.companiesOk
									}
									prefix={
										hasStaticValidationIssues ? (
											<ExclamationCircleOutlined style={{ color: "#fa8c16" }} />
										) : (
											<SafetyCertificateOutlined
												style={{ color: STATIC_VALIDATION_OK_COLOR }}
											/>
										)
									}
									styles={{
										content: {
											color: hasStaticValidationSuccess
												? STATIC_VALIDATION_OK_COLOR
												: "#fff",
										},
									}}
								/>
								<Text
									style={{
										color: hasStaticValidationSuccess
											? STATIC_VALIDATION_OK_COLOR
											: "#8c8c8c",
									}}
								>
									{companiesLoading
										? "Loading companies..."
										: `${staticValidationSummary.companiesOk}/${staticValidationSummary.totalCompanies} companies ok`}
								</Text>
								<Text
									style={{
										color:
											staticValidationSummary.categoryMismatchCompanies > 0
												? "#ffd591"
												: "#8c8c8c",
									}}
								>
									Category mismatches:{" "}
									{companiesLoading
										? "..."
										: staticValidationSummary.categoryMismatchCompanies}{" "}
									companies
								</Text>
								<Text
									style={{
										color:
											staticValidationSummary.missingDataPointCompanies > 0
												? "#ffd591"
												: "#8c8c8c",
									}}
								>
									Missing data points:{" "}
									{companiesLoading
										? "..."
										: staticValidationSummary.missingDataPointCompanies}{" "}
									companies
								</Text>
							</Space>
							{hasStaticValidationIssues && staticValidationOpen && (
								<div
									style={{
										position: "absolute",
										top: "calc(100% + 8px)",
										right: 0,
										zIndex: 20,
										width: 360,
										maxWidth: "min(360px, calc(100vw - 32px))",
										padding: 12,
										border: "1px solid rgba(250, 140, 22, 0.45)",
										borderRadius: 8,
										background: "#18130c",
										boxShadow: "0 12px 32px rgba(0, 0, 0, 0.36)",
									}}
								>
									<Space
										orientation="vertical"
										size={10}
										style={{ width: "100%" }}
									>
										<Text strong style={{ color: "#ffd591" }}>
											Static validation issues
										</Text>
										{staticValidationSummary.issueCompanies.map((company) => (
											<Space
												key={company.id}
												orientation="vertical"
												size={2}
												style={{ width: "100%" }}
											>
												<Text strong style={{ color: "#fff" }}>
													{company.name}
												</Text>
												{company.categoryMathMismatchCount > 0 && (
													<Space orientation="vertical" size={2}>
														<Text style={{ color: "#ffd591" }}>
															Category math mismatches:
														</Text>
														{company.categoryMathDetails.map((detail) => (
															<Text
																key={detail.category}
																style={{
																	color: "#d9d9d9",
																	display: "block",
																	fontSize: 12,
																}}
															>
																{detail.category}: current{" "}
																{formatOneDecimal(detail.currentValue)} vs
																expected{" "}
																{formatOneDecimal(
																	detail.expectedCalculatedValue,
																)}
															</Text>
														))}
														{company.categoryMathDetails.length === 0 && (
															<Text style={{ color: "#d9d9d9", fontSize: 12 }}>
																{company.categoryMathMismatchCount} category
																mismatches
															</Text>
														)}
													</Space>
												)}
												{company.missingReportDataPointsCount > 0 && (
													<Space orientation="vertical" size={2}>
														<Text style={{ color: "#ffd591" }}>
															Missing data points:
														</Text>
														<Text style={{ color: "#d9d9d9", fontSize: 12 }}>
															dp_ids:{" "}
															{company.missingReportDataPointIds.length > 0
																? company.missingReportDataPointIds.join(", ")
																: `${company.missingReportDataPointsCount} missing`}
														</Text>
													</Space>
												)}
											</Space>
										))}
									</Space>
								</div>
							)}
						</Card>
					</Col>
				)}
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
