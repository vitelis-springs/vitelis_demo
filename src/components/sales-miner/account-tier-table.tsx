"use client";

import { Spin, Switch, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
	type AccountSignalRow,
	type CostForecastResult,
	useToggleAccountSignal,
} from "../../hooks/api/useSalesMinerSignalCatalogService";
import AccountSignalDetails from "./account-signal-details";

const { Text } = Typography;

const TIER_COLORS: Record<number, string> = {
	1: "gold",
	2: "blue",
	3: "default",
};

export default function AccountTierTable({
	reportId,
	tiers,
	isFetching,
	forecast,
}: {
	reportId: number;
	tiers: AccountSignalRow[];
	isFetching: boolean;
	forecast: CostForecastResult | null;
}) {
	const toggle = useToggleAccountSignal();

	const columns: ColumnsType<AccountSignalRow> = [
		{
			title: "Tier",
			dataIndex: "tier",
			render: (v: number | null) =>
				v != null ? (
					<Tag color={TIER_COLORS[v] ?? "default"}>Tier {v}</Tag>
				) : (
					<Text type="secondary">—</Text>
				),
		},
		{
			title: "Signals",
			dataIndex: "signalCount",
			width: 100,
			align: "right",
			render: (v: number, row) =>
				isFetching ? (
					<Spin size="small" />
				) : (
					<Text style={{ color: "#d9d9d9" }}>
						{v}
						{row.totalSignalCount > v && (
							<Text type="secondary" style={{ fontSize: 11 }}>
								/{row.totalSignalCount}
							</Text>
						)}
					</Text>
				),
		},
		{
			title: "Est. Cost",
			key: "cost",
			width: 120,
			align: "right",
			render: (_: unknown, row: AccountSignalRow) => {
				if (!forecast) return <Text type="secondary">—</Text>;
				const cost = row.signalCount * forecast.avgCostPerSignal;
				return <Text style={{ color: "#d9d9d9" }}>${cost.toFixed(2)}</Text>;
			},
		},
		{
			key: "toggle",
			width: 56,
			align: "center",
			render: (_: unknown, row: AccountSignalRow) => {
				if (row.tier == null) return null;
				const anyActive = row.signalCount > 0;
				return (
					<Switch
						size="small"
						checked={anyActive}
						loading={toggle.isPending}
						onChange={(checked) => {
							toggle.mutate({
								type: "tier",
								reportId,
								companyId: row.companyId,
								tier: row.tier!,
								activate: checked,
							});
						}}
					/>
				);
			},
		},
	];

	return (
		<div style={{ padding: "4px 0" }}>
			<Table<AccountSignalRow>
				rowKey={(r) => `${r.companyId}-${r.tier}`}
				columns={columns}
				dataSource={tiers}
				size="small"
				pagination={false}
				showHeader={false}
				expandable={{
					expandedRowRender: (row) =>
						row.tier != null ? (
							<AccountSignalDetails
								reportId={reportId}
								companyId={row.companyId}
								tier={row.tier}
								forecast={forecast}
							/>
						) : null,
					rowExpandable: (row) => row.tier != null && row.totalSignalCount > 0,
				}}
			/>
		</div>
	);
}
