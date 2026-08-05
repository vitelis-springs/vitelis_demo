"use client";

import {
	InfoCircleOutlined,
	ReloadOutlined,
	ThunderboltOutlined,
} from "@ant-design/icons";
import {
	App,
	Button,
	Checkbox,
	Collapse,
	InputNumber,
	Modal,
	Space,
	Spin,
	Table,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import {
	type AccountSignalRow,
	type CostForecastResult,
	type CostForecastStep,
	useAccountSignals,
	useCostForecast,
	useOptimizeSignalScope,
	useResetToDefaultSignals,
} from "../../hooks/api/useSalesMinerSignalCatalogService";
import AccountTierTable from "./account-tier-table";

const { Text } = Typography;

interface CompanyRow {
	companyId: number;
	account: string;
	totalSignals: number;
	tiers: AccountSignalRow[];
}

function groupByCompany(rows: AccountSignalRow[]): CompanyRow[] {
	const map = new Map<number, CompanyRow>();
	for (const row of rows) {
		const existing = map.get(row.companyId);
		if (existing) {
			existing.totalSignals += row.signalCount;
			existing.tiers.push(row);
		} else {
			map.set(row.companyId, {
				companyId: row.companyId,
				account: row.account,
				totalSignals: row.signalCount,
				tiers: [row],
			});
		}
	}
	return Array.from(map.values());
}

function formatCost(value: number): string {
	return `$${value.toFixed(2)}`;
}

interface StepBreakdownModalProps {
	open: boolean;
	onClose: () => void;
	company: CompanyRow;
	forecast: CostForecastResult;
}

function StepBreakdownModal({
	open,
	onClose,
	company,
	forecast,
}: StepBreakdownModalProps) {
	const signalTotal = company.totalSignals * forecast.avgCostPerSignal;
	const grandTotal = forecast.fixedCostPerCompany + signalTotal;

	const stepColumns: ColumnsType<CostForecastStep> = [
		{
			title: "Step",
			dataIndex: "name",
			render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
		},
		{
			title: "Avg Cost",
			dataIndex: "avgCost",
			width: 100,
			align: "right",
			render: (v: number) => (
				<Text style={{ fontSize: 12 }}>{formatCost(v)}</Text>
			),
		},
	];

	const signalRow: CostForecastStep = {
		stepId: 32,
		name: `Signal evidence (${company.totalSignals} signals × ${formatCost(forecast.avgCostPerSignal)})`,
		avgCost: signalTotal,
	};

	return (
		<Modal
			title={`Cost forecast — ${company.account}`}
			open={open}
			onCancel={onClose}
			footer={null}
			width={560}
		>
			<Table<CostForecastStep>
				rowKey="stepId"
				columns={stepColumns}
				dataSource={[...forecast.steps, signalRow]}
				size="small"
				pagination={false}
				summary={() => (
					<Table.Summary.Row>
						<Table.Summary.Cell index={0}>
							<Text strong>Total</Text>
						</Table.Summary.Cell>
						<Table.Summary.Cell index={1} align="right">
							<Text strong>{formatCost(grandTotal)}</Text>
						</Table.Summary.Cell>
					</Table.Summary.Row>
				)}
			/>
		</Modal>
	);
}

function buildColumns(
	isFetching: boolean,
	forecast: CostForecastResult | null,
	onInfoClick: (row: CompanyRow) => void,
): ColumnsType<CompanyRow> {
	return [
		{
			title: "Account",
			dataIndex: "account",
			render: (v: string) => (
				<Text style={{ color: "#d9d9d9", fontWeight: 500 }}>{v}</Text>
			),
		},
		{
			title: "Signals",
			dataIndex: "totalSignals",
			width: 100,
			align: "right",
			render: (v: number) =>
				isFetching ? (
					<Spin size="small" />
				) : (
					<Text style={{ color: "#d9d9d9" }}>{v}</Text>
				),
		},
		{
			title: "Est. Cost",
			key: "cost",
			width: 160,
			align: "right",
			render: (_: unknown, row: CompanyRow) => {
				if (!forecast) return <Text type="secondary">—</Text>;
				const cost =
					forecast.fixedCostPerCompany +
					row.totalSignals * forecast.avgCostPerSignal;
				return (
					<Space size={6}>
						<Text style={{ color: "#d9d9d9" }}>{formatCost(cost)}</Text>
						<Tooltip title="Cost breakdown by step">
							<Button
								type="text"
								size="small"
								icon={<InfoCircleOutlined style={{ color: "#595959" }} />}
								style={{ padding: 0, height: 16, lineHeight: "16px" }}
								onClick={(e) => {
									e.stopPropagation();
									onInfoClick(row);
								}}
							/>
						</Tooltip>
					</Space>
				);
			},
		},
	];
}

export default function AccountSignalsTable({
	reportId,
}: {
	reportId: number;
}) {
	const { message } = App.useApp();
	const { data, isLoading, isFetching, error } = useAccountSignals(reportId);
	const { data: forecastData } = useCostForecast(reportId);
	const resetMutation = useResetToDefaultSignals();
	const optimizeMutation = useOptimizeSignalScope();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [optimizeOpen, setOptimizeOpen] = useState(false);
	const [targetCount, setTargetCount] = useState<number | null>(30);
	const [minSampleThreshold, setMinSampleThreshold] = useState<number | null>(
		5,
	);
	const [useProductTagFilter, setUseProductTagFilter] = useState(false);
	const [breakdownCompany, setBreakdownCompany] = useState<CompanyRow | null>(
		null,
	);

	const forecast = forecastData?.data ?? null;
	const companies = useMemo(() => groupByCompany(data?.data ?? []), [data]);
	const defaultExpandedKeys = useMemo(
		() => companies.map((c) => c.companyId),
		[companies],
	);
	const totalForecast = useMemo(() => {
		if (!forecast || companies.length === 0) return null;
		return companies.reduce(
			(sum, c) =>
				sum +
				forecast.fixedCostPerCompany +
				c.totalSignals * forecast.avgCostPerSignal,
			0,
		);
	}, [forecast, companies]);
	const columns = useMemo(
		() => buildColumns(isFetching && !isLoading, forecast, setBreakdownCompany),
		[isFetching, isLoading, forecast],
	);

	const handleReset = async () => {
		try {
			const res = await resetMutation.mutateAsync(reportId);
			const d = res.data;
			setConfirmOpen(false);
			message.success(
				`Reset complete: ${d.insertedCount} inserted, ${d.reactivatedCount} reactivated, ${d.deactivatedCount} deactivated`,
			);
		} catch {
			message.error("Reset failed");
		}
	};

	const handleOptimize = async () => {
		if (!targetCount || targetCount <= 0) return;
		try {
			const res = await optimizeMutation.mutateAsync({
				reportId,
				targetCount,
				minSampleThreshold: minSampleThreshold ?? undefined,
				useProductTagFilter,
			});
			const d = res.data;
			setOptimizeOpen(false);
			const totalWinners = d.companySummaries.reduce(
				(s, c) => s + c.winnersCount,
				0,
			);
			const totalLosers = d.companySummaries.reduce(
				(s, c) => s + c.losersCount,
				0,
			);
			const totalColdStart = d.companySummaries.reduce(
				(s, c) => s + c.coldStartInLosersCount,
				0,
			);
			message.success(
				`Optimized ${d.companySummaries.length} ${d.companySummaries.length === 1 ? "company" : "companies"}: ` +
					`${totalWinners} top performers, ${totalLosers} explore picks (${totalColdStart} cold-start), ` +
					`${d.deactivatedCount} deactivated`,
			);
		} catch (err: unknown) {
			const axiosErr = err as { response?: { data?: { error?: string } } };
			message.error(axiosErr.response?.data?.error ?? "Optimize failed");
		}
	};

	return (
		<>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: 12,
				}}
			>
				{totalForecast != null ? (
					<Text style={{ color: "#8c8c8c", fontSize: 13 }}>
						Estimated report cost:{" "}
						<Text style={{ color: "#d9d9d9", fontSize: 13, fontWeight: 600 }}>
							{formatCost(totalForecast)}
						</Text>
						<Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
							({companies.length}{" "}
							{companies.length === 1 ? "company" : "companies"})
						</Text>
					</Text>
				) : (
					<span />
				)}
				<Space>
					<Button
						icon={<ThunderboltOutlined />}
						onClick={() => setOptimizeOpen(true)}
					>
						Optimize signals
					</Button>
					<Button
						icon={<ReloadOutlined />}
						onClick={() => setConfirmOpen(true)}
					>
						Reset to default
					</Button>
				</Space>
			</div>

			<Modal
				title="Reset to default signal model"
				open={confirmOpen}
				onCancel={() => setConfirmOpen(false)}
				footer={[
					<Button key="cancel" onClick={() => setConfirmOpen(false)}>
						Cancel
					</Button>,
					<Button
						key="confirm"
						type="primary"
						danger
						loading={resetMutation.isPending}
						onClick={() => {
							void handleReset();
						}}
					>
						Reset
					</Button>,
				]}
			>
				<Space direction="vertical" size={8} style={{ width: "100%" }}>
					<Text>
						This will reset signal scope for <Text strong>all companies</Text>{" "}
						in this report to the default model based on their GICS codes.
					</Text>
					<Text type="secondary" style={{ fontSize: 12 }}>
						Signals not matching the default model will be deactivated.
						Previously deactivated default signals will be reactivated.
					</Text>
				</Space>
			</Modal>

			<Modal
				title="Optimize signal scope"
				open={optimizeOpen}
				onCancel={() => setOptimizeOpen(false)}
				footer={[
					<Button key="cancel" onClick={() => setOptimizeOpen(false)}>
						Cancel
					</Button>,
					<Button
						key="confirm"
						type="primary"
						loading={optimizeMutation.isPending}
						disabled={!targetCount || targetCount <= 0}
						onClick={() => {
							void handleOptimize();
						}}
					>
						Optimize
					</Button>,
				]}
			>
				<Space direction="vertical" size={12} style={{ width: "100%" }}>
					<Text>
						For every company in this report, reduces the active signal set to a
						target count: 80% the best historical performers (Production/POC
						runs only, scoped to the company&apos;s GICS industry — walking up
						to the parent industry when a level lacks enough history), 20%
						randomly sampled from the rest, so currently-unfavored or brand-new
						signals keep collecting data.
					</Text>
					<Space direction="vertical" size={4}>
						<Text style={{ fontSize: 12 }}>
							Target signal count per company
						</Text>
						<InputNumber
							min={1}
							max={90}
							value={targetCount}
							onChange={(v) => setTargetCount(v)}
							style={{ width: 160 }}
						/>
					</Space>
					<Collapse
						size="small"
						items={[
							{
								key: "advanced",
								label: "Advanced",
								children: (
									<Space
										direction="vertical"
										size={12}
										style={{ width: "100%" }}
									>
										<Space direction="vertical" size={4}>
											<Text style={{ fontSize: 12 }}>
												Minimum sample threshold (runs) before trusting a GICS
												level&apos;s stats
											</Text>
											<InputNumber
												min={1}
												value={minSampleThreshold}
												onChange={(v) => setMinSampleThreshold(v)}
												style={{ width: 160 }}
											/>
										</Space>
										<Checkbox
											checked={useProductTagFilter}
											onChange={(e) => setUseProductTagFilter(e.target.checked)}
										>
											Only count history from runs matching this customer&apos;s
											product tags
										</Checkbox>
									</Space>
								),
							},
						]}
					/>
					<Text type="secondary" style={{ fontSize: 12 }}>
						Re-running reshuffles the random 20% — this is expected, not a bug.
					</Text>
				</Space>
			</Modal>

			{breakdownCompany && forecast && (
				<StepBreakdownModal
					open={true}
					onClose={() => setBreakdownCompany(null)}
					company={breakdownCompany}
					forecast={forecast}
				/>
			)}

			<Table<CompanyRow>
				rowKey="companyId"
				columns={columns}
				dataSource={companies}
				loading={isLoading}
				size="small"
				pagination={false}
				defaultExpandedRowKeys={defaultExpandedKeys}
				expandable={{
					expandedRowRender: (row) => (
						<AccountTierTable
							reportId={reportId}
							tiers={row.tiers}
							isFetching={isFetching && !isLoading}
							forecast={forecast}
						/>
					),
					rowExpandable: () => true,
				}}
				locale={{
					emptyText: error ? "Failed to load data" : "No data",
				}}
			/>
		</>
	);
}
