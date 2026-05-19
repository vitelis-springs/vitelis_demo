"use client";

import { Spin, Switch, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
	type AccountSignalDetail,
	type CostForecastResult,
	useAccountSignalDetails,
	useToggleAccountSignal,
} from "../../hooks/api/useSalesMinerSignalCatalogService";

const { Text } = Typography;

const BG = "#111";

interface FlatRow extends AccountSignalDetail {
	_rowKey: string;
	_categorySpan: number;
}

function buildFlatRows(details: AccountSignalDetail[]): FlatRow[] {
	const result: FlatRow[] = [];
	let i = 0;
	while (i < details.length) {
		const catId = details[i]!.categoryId;
		let j = i;
		while (j < details.length && details[j]!.categoryId === catId) j++;
		const span = j - i;
		for (let k = i; k < j; k++) {
			result.push({
				...details[k]!,
				_rowKey: details[k]!.signalId,
				_categorySpan: k === i ? span : 0,
			});
		}
		i = j;
	}
	return result;
}

function SignalDetailsTable({
	rows,
	forecast,
}: {
	rows: FlatRow[];
	forecast: CostForecastResult | null;
}) {
	const toggle = useToggleAccountSignal();

	const columns: ColumnsType<FlatRow> = [
		{
			title: "Category",
			dataIndex: "categoryName",
			width: 280,
			onCell: (row) => ({ rowSpan: row._categorySpan }),
			render: (name: string, row) => (
				<Text style={{ color: "#8c8c8c", fontSize: 12 }}>
					<Text code style={{ fontSize: 11, marginRight: 6 }}>
						{row.categoryCode}
					</Text>
					{name}
				</Text>
			),
		},
		{
			title: "Signal",
			dataIndex: "signalName",
			render: (v: string, row) => (
				<span>
					<Text
						code
						style={{
							fontSize: 11,
							marginRight: 6,
							opacity: row.isActive ? 1 : 0.4,
						}}
					>
						{row.signalCode}
					</Text>
					<Text
						style={{
							color: row.isActive ? "#d9d9d9" : "#595959",
							fontSize: 12,
							textDecoration: row.isActive ? undefined : "line-through",
						}}
					>
						{v}
					</Text>
				</span>
			),
		},
		{
			title: "Est. Cost",
			key: "cost",
			width: 100,
			align: "right",
			render: (_: unknown, row: FlatRow) => {
				if (!forecast || !row.isActive)
					return (
						<Text type="secondary" style={{ fontSize: 11 }}>
							—
						</Text>
					);
				return (
					<Text style={{ color: "#8c8c8c", fontSize: 11 }}>
						${forecast.avgCostPerSignal.toFixed(3)}
					</Text>
				);
			},
		},
		{
			key: "toggle",
			width: 56,
			align: "center",
			render: (_: unknown, row: FlatRow) => (
				<Switch
					size="small"
					checked={row.isActive}
					loading={toggle.isPending}
					onChange={(checked) => {
						toggle.mutate({
							type: "signal",
							scopeId: row.scopeId,
							isActive: checked,
						});
					}}
				/>
			),
		},
	];

	return (
		<Table<FlatRow>
			rowKey="_rowKey"
			columns={columns}
			dataSource={rows}
			size="small"
			pagination={false}
			style={{ background: BG }}
			showHeader={rows.length > 0}
		/>
	);
}

export default function AccountSignalDetails({
	reportId,
	companyId,
	tier,
	forecast,
}: {
	reportId: number;
	companyId: number;
	tier: number;
	forecast: CostForecastResult | null;
}) {
	const { data, isLoading } = useAccountSignalDetails(
		reportId,
		companyId,
		tier,
		true,
	);

	if (isLoading) {
		return (
			<div style={{ padding: "16px 48px" }}>
				<Spin size="small" />
			</div>
		);
	}

	const rows = buildFlatRows(data?.data ?? []);

	return (
		<div style={{ background: BG, padding: "8px 24px 8px 48px" }}>
			<SignalDetailsTable rows={rows} forecast={forecast} />
		</div>
	);
}
