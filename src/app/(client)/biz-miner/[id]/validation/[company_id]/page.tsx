"use client";

import {
	ArrowLeftOutlined,
	EditOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import {
	App,
	Button,
	Card,
	Col,
	Layout,
	Result,
	Row,
	Segmented,
	Select,
	Space,
	Spin,
	Table,
	Tag,
	Typography,
} from "antd";
import {
	useParams,
	usePathname,
	useRouter,
	useSearchParams,
} from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import DeepDiveBreadcrumbs from "../../../../../../components/deep-dive/breadcrumbs";
import DatapointEditModal, {
	type DatapointEditTarget,
} from "../../../../../../components/deep-dive/datapoint-edit-modal";
import StatCard from "../../../../../../components/deep-dive/shared/stat-card";
import { DARK_CARD_STYLE } from "../../../../../../config/chart-theme";
import {
	type UpdateCompanyDataPointPayload,
	useGetValidationByCompany,
	useUpdateCompanyDataPoint,
	type ValidationDriverItem,
	type ValidationStatus,
} from "../../../../../../hooks/api/useDeepDiveService";
import { useAuth } from "../../../../../../hooks/useAuth";
import { parseKpiScoreSelection } from "../../../../../../shared/kpi-score";

const { Content } = Layout;
const { Text } = Typography;

const STATUS_LABEL: Record<string, string> = {
	all: "All",
	pass: "Pass",
	warn: "Warn",
	failed: "Failed",
};

const STATUS_COLOR: Record<string, string> = {
	pass: "#52c41a",
	warn: "#faad14",
	failed: "#ff4d4f",
};

function statusTag(status: string) {
	const color =
		status === "pass" ? "success" : status === "warn" ? "warning" : "error";
	return <Tag color={color}>{status}</Tag>;
}

export default function ValidationByCompanyPage() {
	const { isLoggedIn, isAdmin } = useAuth();
	const router = useRouter();
	const pathname = usePathname();
	const params = useParams();
	const searchParams = useSearchParams();
	const { message } = App.useApp();

	const reportId = Number(params.id);
	const companyId = Number(params.company_id);

	const [isAuthLoading, setIsAuthLoading] = useState(true);
	const [editingTarget, setEditingTarget] =
		useState<DatapointEditTarget | null>(null);

	const statusParam = searchParams.get("status");
	const statusFilter: ValidationStatus | "all" =
		statusParam === "pass" || statusParam === "warn" || statusParam === "failed"
			? statusParam
			: "all";
	const ruleParam = searchParams.get("ruleId");
	const parsedRuleFilter = ruleParam === null ? null : Number(ruleParam);
	const ruleFilter =
		parsedRuleFilter !== null && Number.isFinite(parsedRuleFilter)
			? parsedRuleFilter
			: null;
	const pageParam = Number(searchParams.get("page"));
	const pageSizeParam = Number(searchParams.get("pageSize"));
	const currentPage =
		Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
	const pageSize =
		Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? pageSizeParam : 50;

	useEffect(() => {
		const timer = setTimeout(() => setIsAuthLoading(false), 100);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (!isAuthLoading && !isLoggedIn) router.push("/");
	}, [isLoggedIn, router, isAuthLoading]);

	const apiStatus = statusFilter === "all" ? undefined : statusFilter;

	const { data, isLoading, isFetching, refetch } = useGetValidationByCompany(
		reportId,
		companyId,
		apiStatus,
		!isAuthLoading && isLoggedIn && !!isAdmin(),
	);

	const updateDataPoint = useUpdateCompanyDataPoint(reportId, companyId);

	const updateRouteParams = useCallback(
		(
			updates: Partial<{
				status: ValidationStatus | "all";
				ruleId: number | null;
				page: number;
				pageSize: number;
			}>,
		) => {
			const next = new URLSearchParams(searchParams.toString());

			if (updates.status !== undefined) {
				if (updates.status === "all") next.delete("status");
				else next.set("status", updates.status);
				next.delete("page");
			}

			if (updates.ruleId !== undefined) {
				if (updates.ruleId === null) next.delete("ruleId");
				else next.set("ruleId", String(updates.ruleId));
				next.delete("page");
			}

			if (updates.page !== undefined) {
				if (updates.page <= 1) next.delete("page");
				else next.set("page", String(updates.page));
			}

			if (updates.pageSize !== undefined) {
				if (updates.pageSize === 50) next.delete("pageSize");
				else next.set("pageSize", String(updates.pageSize));
				next.delete("page");
			}

			const qs = next.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[pathname, router, searchParams],
	);

	const handleSave = useCallback(
		(payload: UpdateCompanyDataPointPayload) => {
			if (!editingTarget) return;
			updateDataPoint.mutate(
				{ resultId: editingTarget.resultId, payload },
				{
					onSuccess: (result) => {
						if (!result.success) {
							message.error(result.error ?? "Failed to update");
							return;
						}
						message.success("Updated");
						setEditingTarget(null);
						refetch().catch(() => {
							message.error("Failed to refresh validation details");
						});
					},
					onError: () => message.error("Failed to update"),
				},
			);
		},
		[editingTarget, updateDataPoint, message, refetch],
	);

	const ruleOptions = useMemo(() => {
		if (!data?.items) return [];
		const seen = new Map<number, string>();
		for (const item of data.items) {
			if (!seen.has(item.ruleId)) {
				seen.set(item.ruleId, item.ruleLabel ?? item.ruleName);
			}
		}
		return Array.from(seen.entries()).map(([value, label]) => ({
			value,
			label,
		}));
	}, [data?.items]);

	const tableData = useMemo(() => {
		if (!data?.items) return [];
		return data.items.filter(
			(item) => ruleFilter === null || item.ruleId === ruleFilter,
		);
	}, [data?.items, ruleFilter]);

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

	if (!Number.isFinite(reportId) || !Number.isFinite(companyId)) {
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
					title="Not found"
					extra={
						<Button onClick={() => router.push("/biz-miner")}>Back</Button>
					}
				/>
			</div>
		);
	}

	const companyName = data?.companyName ?? `Company #${companyId}`;
	const totals = data?.totals ?? { total: 0, pass: 0, warn: 0, failed: 0 };

	const columns = [
		{
			title: "",
			key: "actions",
			width: 48,
			render: (_: unknown, row: ValidationDriverItem) => (
				<Button
					size="small"
					icon={<EditOutlined />}
					onClick={() => {
						const parsedScore = parseKpiScoreSelection(row.dataScore);
						setEditingTarget({
							resultId: row.resultId,
							dataPointId: row.dataPointId ?? "",
							type: row.driverType,
							label: row.driverName,
							reasoning: row.dataReasoning,
							sources: row.dataSources,
							score: row.dataScore,
							scoreValue: parsedScore.scoreValue,
							scoreTier: parsedScore.scoreTier,
							status: row.resultStatus ?? true,
						});
					}}
				/>
			),
		},
		{
			title: "Driver",
			key: "driver",
			width: 220,
			render: (_: unknown, row: ValidationDriverItem) => (
				<Space direction="vertical" size={2}>
					<Text style={{ color: "#d9d9d9", fontSize: 13 }}>
						{row.driverName}
					</Text>
					{row.dataPointId && (
						<Text
							style={{
								color: "#595959",
								fontSize: 11,
								fontFamily: "monospace",
							}}
						>
							{row.dataPointId}
						</Text>
					)}
				</Space>
			),
		},
		{
			title: "Type",
			key: "type",
			width: 110,
			render: (_: unknown, row: ValidationDriverItem) => (
				<Tag color="purple" style={{ fontSize: 11 }}>
					{row.driverType}
				</Tag>
			),
		},
		{
			title: "Rule",
			key: "rule",
			width: 100,
			render: (_: unknown, row: ValidationDriverItem) => (
				<Space direction="vertical" size={2}>
					<Text style={{ color: "#d9d9d9", fontSize: 13 }}>
						{row.ruleLabel ?? row.ruleName}
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
			title: "Status",
			dataIndex: "status",
			key: "status",
			width: 90,
			render: (v: string) => statusTag(v),
		},
		{
			title: "Reasoning",
			key: "reasoning",
			width: 420,
			render: (_: unknown, row: ValidationDriverItem) => (
				<Text style={{ color: "#8c8c8c", fontSize: 12 }}>
					{row.validationReasoning ?? "—"}
				</Text>
			),
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
									{
										label: "Validation",
										href: `/biz-miner/${reportId}/validation`,
									},
									{ label: companyName },
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
									onClick={() =>
										router.push(`/biz-miner/${reportId}/validation`)
									}
								>
									Back
								</Button>
								<Typography.Title
									level={2}
									style={{ margin: 0, color: "#58bfce" }}
								>
									{companyName}
								</Typography.Title>
								<Button
									icon={<ReloadOutlined />}
									onClick={() => {
										refetch().catch(() => {
											message.error("Failed to refresh validation details");
										});
									}}
									loading={isFetching}
								>
									Refresh
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
										<StatCard label="Total checks" value={totals.total} />
									</Col>
									<Col xs={24} md={6}>
										<StatCard
											label="Pass"
											value={totals.pass}
											valueColor={STATUS_COLOR.pass}
										/>
									</Col>
									<Col xs={24} md={6}>
										<StatCard
											label="Warn"
											value={totals.warn}
											valueColor={STATUS_COLOR.warn}
										/>
									</Col>
									<Col xs={24} md={6}>
										<StatCard
											label="Failed"
											value={totals.failed}
											valueColor={STATUS_COLOR.failed}
										/>
									</Col>
								</Row>

								<Card
									title="Validation Details"
									style={DARK_CARD_STYLE}
									extra={
										<Space>
											<Select
												allowClear
												placeholder="Filter by rule"
												value={ruleFilter ?? undefined}
												onChange={(v) =>
													updateRouteParams({ ruleId: v ?? null })
												}
												options={ruleOptions}
												style={{ width: 220 }}
											/>
											<Segmented
												value={statusFilter}
												onChange={(v) =>
													updateRouteParams({
														status: v as ValidationStatus | "all",
													})
												}
												options={["all", "pass", "warn", "failed"].map((s) => ({
													value: s,
													label: STATUS_LABEL[s],
												}))}
											/>
										</Space>
									}
								>
									<Table<ValidationDriverItem>
										rowKey="validationId"
										dataSource={tableData}
										columns={columns}
										pagination={{
											current: currentPage,
											pageSize,
											showSizeChanger: true,
										}}
										onChange={(pagination) =>
											updateRouteParams({
												page: pagination.current ?? 1,
												...(pagination.pageSize !== pageSize
													? { pageSize: pagination.pageSize ?? 50 }
													: {}),
											})
										}
										scroll={{ x: "max-content" }}
										size="small"
									/>
								</Card>
							</Space>
						)}
					</div>
				</Content>
			</Layout>

			<DatapointEditModal
				open={!!editingTarget}
				loading={updateDataPoint.isPending}
				target={editingTarget}
				onClose={() => setEditingTarget(null)}
				onSubmit={handleSave}
			/>
		</App>
	);
}
