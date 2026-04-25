"use client";

import {
	ArrowLeftOutlined,
	ReloadOutlined,
	SettingOutlined,
} from "@ant-design/icons";
import {
	App,
	Button,
	Card,
	Col,
	Layout,
	Progress,
	Result,
	Row,
	Space,
	Spin,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DARK_CARD_STYLE } from "../../../../../config/chart-theme";
import DeepDiveBreadcrumbs from "../../../../../components/deep-dive/breadcrumbs";
import StatCard from "../../../../../components/deep-dive/shared/stat-card";
import ValidationRulesConfigDrawer from "../../../../../components/deep-dive/validation-rules-config-drawer";
import { useAuth } from "../../../../../hooks/useAuth";
import {
	useGetValidationSummary,
	type ValidationCompanyRow,
	type ValidationRuleRow,
} from "../../../../../hooks/api/useDeepDiveService";

const { Content } = Layout;
const { Title, Text } = Typography;

function statusBar(pass: number, warn: number, failed: number) {
	const total = pass + warn + failed;
	if (!total) return null;
	const pPass = Math.round((pass / total) * 100);
	const pWarn = Math.round((warn / total) * 100);
	const pFail = 100 - pPass - pWarn;
	return (
		<Tooltip title={`Pass: ${pass} · Warn: ${warn} · Failed: ${failed}`}>
			<div
				style={{
					display: "flex",
					height: 8,
					borderRadius: 4,
					overflow: "hidden",
					minWidth: 120,
				}}
			>
				<div style={{ width: `${pPass}%`, background: "#52c41a" }} />
				<div style={{ width: `${pWarn}%`, background: "#faad14" }} />
				<div style={{ width: `${pFail}%`, background: "#ff4d4f" }} />
			</div>
		</Tooltip>
	);
}

function failedTag(count: number) {
	if (!count) return <Tag color="success">0</Tag>;
	return <Tag color="error">{count}</Tag>;
}

function warnTag(count: number) {
	if (!count) return <Tag>0</Tag>;
	return <Tag color="warning">{count}</Tag>;
}

export default function ValidationPage() {
	const { isLoggedIn, isAdmin } = useAuth();
	const router = useRouter();
	const params = useParams();
	const [isAuthLoading, setIsAuthLoading] = useState(true);
	const [configOpen, setConfigOpen] = useState(false);

	const reportId = Number(params.id);

	useEffect(() => {
		const timer = setTimeout(() => setIsAuthLoading(false), 100);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (!isAuthLoading && !isLoggedIn) router.push("/");
	}, [isLoggedIn, router, isAuthLoading]);

	const { data, isLoading, isFetching, refetch } = useGetValidationSummary(
		reportId,
		!isAuthLoading && isLoggedIn && !!isAdmin(),
	);

	if (isAuthLoading) {
		return (
			<div
				style={{
					minHeight: "100vh",
					background: "#141414",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Spin size="large" />
			</div>
		);
	}

	if (!isLoggedIn) return null;

	if (!isAdmin()) {
		return (
			<div
				style={{
					minHeight: "100vh",
					background: "#141414",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Result
					status="403"
					title="Admin access required"
					extra={
						<Button type="primary" onClick={() => router.push("/biz-miner")}>
							Go to Biz Miner
						</Button>
					}
				/>
			</div>
		);
	}

	if (!Number.isFinite(reportId)) {
		return (
			<div
				style={{
					minHeight: "100vh",
					background: "#141414",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Result
					status="404"
					title="Report not found"
					extra={
						<Button onClick={() => router.push("/biz-miner")}>Back</Button>
					}
				/>
			</div>
		);
	}

	const byCompany = data?.byCompany ?? [];
	const byRule = data?.byRule ?? [];

	const totals = byCompany.reduce(
		(acc, r) => ({
			pass: acc.pass + r.pass,
			warn: acc.warn + r.warn,
			failed: acc.failed + r.failed,
		}),
		{ pass: 0, warn: 0, failed: 0 },
	);
	const grandTotal = totals.pass + totals.warn + totals.failed;

	const companyColumns = [
		{
			title: "Company",
			dataIndex: "companyName",
			key: "companyName",
			width: 220,
			render: (v: string) => <Text style={{ color: "#d9d9d9" }}>{v}</Text>,
		},
		{
			title: "Total",
			dataIndex: "total",
			key: "total",
			width: 80,
			render: (v: number) => <Text style={{ color: "#8c8c8c" }}>{v}</Text>,
		},
		{
			title: "Pass",
			dataIndex: "pass",
			key: "pass",
			width: 80,
			render: (v: number) => <Tag color="success">{v}</Tag>,
		},
		{
			title: "Warn",
			dataIndex: "warn",
			key: "warn",
			width: 80,
			render: (v: number) => warnTag(v),
		},
		{
			title: "Failed",
			dataIndex: "failed",
			key: "failed",
			width: 80,
			render: (v: number) => failedTag(v),
		},
		{
			title: "Distribution",
			key: "bar",
			width: 160,
			render: (_: unknown, row: ValidationCompanyRow) =>
				statusBar(row.pass, row.warn, row.failed),
		},
		{
			title: "Pass %",
			key: "passRate",
			width: 100,
			render: (_: unknown, row: ValidationCompanyRow) => {
				const pct = row.total ? Math.round((row.pass / row.total) * 100) : 0;
				return (
					<Progress
						percent={pct}
						size="small"
						strokeColor="#52c41a"
						trailColor="#434343"
						format={(p) => (
							<Text style={{ color: "#d9d9d9", fontSize: 11 }}>{p}%</Text>
						)}
					/>
				);
			},
		},
	];

	const ruleColumns = [
		{
			title: "Rule",
			key: "rule",
			width: 260,
			render: (_: unknown, row: ValidationRuleRow) => (
				<Space direction="vertical" size={2}>
					<Text style={{ color: "#d9d9d9", fontSize: 13 }}>
						{row.ruleLabel}
					</Text>
					<Text style={{ color: "#595959", fontSize: 11 }}>{row.ruleName}</Text>
				</Space>
			),
		},
		{
			title: "Level",
			dataIndex: "ruleLevel",
			key: "ruleLevel",
			width: 90,
			render: (v: string) => (
				<Tag color={v === "driver" ? "blue" : "gold"}>{v}</Tag>
			),
		},
		{
			title: "Total",
			dataIndex: "total",
			key: "total",
			width: 80,
			render: (v: number) => <Text style={{ color: "#8c8c8c" }}>{v}</Text>,
		},
		{
			title: "Pass",
			dataIndex: "pass",
			key: "pass",
			width: 80,
			render: (v: number) => <Tag color="success">{v}</Tag>,
		},
		{
			title: "Warn",
			dataIndex: "warn",
			key: "warn",
			width: 80,
			render: (v: number) => warnTag(v),
		},
		{
			title: "Failed",
			dataIndex: "failed",
			key: "failed",
			width: 80,
			render: (v: number) => failedTag(v),
		},
		{
			title: "Distribution",
			key: "bar",
			width: 160,
			render: (_: unknown, row: ValidationRuleRow) =>
				statusBar(row.pass, row.warn, row.failed),
		},
	];

	return (
		<App>
			<Layout style={{ minHeight: "100vh", background: "#141414" }}>
				<Content style={{ padding: 24, background: "#141414" }}>
					<div style={{ maxWidth: 1400 }}>
						<div style={{ marginBottom: 24 }}>
							<DeepDiveBreadcrumbs
								items={[
									{ label: "Biz Miner", href: "/biz-miner" },
									{
										label: `Report #${reportId}`,
										href: `/biz-miner/${reportId}`,
									},
									{ label: "Validation" },
								]}
							/>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: 16,
									marginTop: 8,
								}}
							>
								<Button
									icon={<ArrowLeftOutlined />}
									onClick={() => router.push(`/biz-miner/${reportId}`)}
								>
									Back
								</Button>
								<Title level={2} style={{ margin: 0, color: "#58bfce" }}>
									Validation
								</Title>
								<Button
									icon={<ReloadOutlined />}
									onClick={() => void refetch()}
									loading={isFetching}
								>
									Refresh
								</Button>
								<Button
									icon={<SettingOutlined />}
									onClick={() => setConfigOpen(true)}
								>
									Settings
								</Button>
							</div>
						</div>

						{isLoading ? (
							<div
								style={{
									display: "flex",
									justifyContent: "center",
									padding: 80,
								}}
							>
								<Spin size="large" />
							</div>
						) : (
							<Space
								direction="vertical"
								size="large"
								style={{ width: "100%" }}
							>
								<Row gutter={[16, 16]}>
									<Col xs={24} md={6}>
										<StatCard label="Total checks" value={grandTotal} />
									</Col>
									<Col xs={24} md={6}>
										<StatCard
											label="Pass"
											value={totals.pass}
											valueColor="#52c41a"
										/>
									</Col>
									<Col xs={24} md={6}>
										<StatCard
											label="Warn"
											value={totals.warn}
											valueColor="#faad14"
										/>
									</Col>
									<Col xs={24} md={6}>
										<StatCard
											label="Failed"
											value={totals.failed}
											valueColor="#ff4d4f"
										/>
									</Col>
								</Row>

								<Card title="By Company" style={DARK_CARD_STYLE}>
									<Table<ValidationCompanyRow>
										rowKey="companyId"
										dataSource={byCompany}
										columns={companyColumns}
										pagination={false}
										scroll={{ x: "max-content" }}
										size="small"
									/>
								</Card>

								<Card title="By Validation Rule" style={DARK_CARD_STYLE}>
									<Table<ValidationRuleRow>
										rowKey="ruleName"
										dataSource={byRule}
										columns={ruleColumns}
										pagination={false}
										scroll={{ x: "max-content" }}
										size="small"
									/>
								</Card>
							</Space>
						)}
					</div>
				</Content>
			</Layout>

			<ValidationRulesConfigDrawer
				reportId={reportId}
				open={configOpen}
				onClose={() => setConfigOpen(false)}
			/>
		</App>
	);
}
