"use client";

import { Spin, Switch, Table, Tag, Tooltip, Typography } from "antd";
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
	_subcategorySpan: number;
	/** 'winner' if any *active* signal_definition variant in this subcategory group was picked as winner, else 'random' if any was, else null — decided per subcategory_id among currently in-scope rows only. */
	_groupSelectionReason: string | null;
	/** The frozen selectionEfficiencyPct from the active variant Optimize stamped — inactive rows are ignored. */
	_groupSelectionEfficiencyPct: number | null;
}

function groupSelectionReason(group: AccountSignalDetail[]): string | null {
	// Only active rows are "currently in scope"; inactive variants may still
	// carry a stale stamp until the next Optimize clears them (or after a
	// manual toggle that doesn't touch selection_*).
	const active = group.filter((d) => d.isActive);
	if (active.some((d) => d.selectionReason === "winner")) return "winner";
	if (active.some((d) => d.selectionReason === "random")) return "random";
	return null;
}

function groupSelectionEfficiencyPct(
	group: AccountSignalDetail[],
): number | null {
	return (
		group.find((d) => d.isActive && d.selectionEfficiencyPct != null)
			?.selectionEfficiencyPct ?? null
	);
}

function buildFlatRows(details: AccountSignalDetail[]): FlatRow[] {
	const result: FlatRow[] = [];
	let i = 0;
	while (i < details.length) {
		const catId = details[i]!.categoryId;
		let catEnd = i;
		while (catEnd < details.length && details[catEnd]!.categoryId === catId)
			catEnd++;

		let k = i;
		while (k < catEnd) {
			const subId = details[k]!.subcategoryId;
			let subEnd = k;
			while (subEnd < catEnd && details[subEnd]!.subcategoryId === subId)
				subEnd++;
			const subSpan = subEnd - k;
			const group = details.slice(k, subEnd);
			const reason = groupSelectionReason(group);
			const selectionEfficiencyPct = groupSelectionEfficiencyPct(group);
			for (let m = k; m < subEnd; m++) {
				result.push({
					...details[m]!,
					_rowKey: details[m]!.signalId,
					_categorySpan: m === i ? catEnd - i : 0,
					_subcategorySpan: m === k ? subSpan : 0,
					_groupSelectionReason: reason,
					_groupSelectionEfficiencyPct: selectionEfficiencyPct,
				});
			}
			k = subEnd;
		}
		i = catEnd;
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
			title: (
				<Tooltip title="Why this subcategory is currently in scope (shared across any old/new catalog wording variants of the same subcategory — decided at that level, not per signal_definition): 'Winner' — top signal_efficiency_pct performer the last time Optimize signals ran. 'Random' — sampled from the explore pool (lower-ranked or cold-start). Blank — never touched by Optimize (e.g. only Reset to default has run, or it was toggled manually).">
					Pick
				</Tooltip>
			),
			key: "selectionReason",
			width: 90,
			align: "center",
			onCell: (row) => ({ rowSpan: row._subcategorySpan }),
			render: (_: unknown, row: FlatRow) => {
				if (row._groupSelectionReason === "winner") {
					return (
						<Tag color="gold" style={{ fontSize: 10, marginRight: 0 }}>
							Winner
						</Tag>
					);
				}
				if (row._groupSelectionReason === "random") {
					return (
						<Tag color="blue" style={{ fontSize: 10, marginRight: 0 }}>
							Random
						</Tag>
					);
				}
				return (
					<Text type="secondary" style={{ fontSize: 11 }}>
						—
					</Text>
				);
			},
		},
		{
			title: (
				<Tooltip title="Frozen signal_efficiency_pct from the Optimize run that produced the current Pick — null if never touched by Optimize, or if this was a cold-start random pick with no historical data at the time.">
					At Selection
				</Tooltip>
			),
			key: "selectionEfficiency",
			width: 100,
			align: "right",
			onCell: (row) => ({ rowSpan: row._subcategorySpan }),
			render: (_: unknown, row: FlatRow) => {
				if (row._groupSelectionEfficiencyPct == null) {
					return (
						<Text type="secondary" style={{ fontSize: 11 }}>
							—
						</Text>
					);
				}
				return (
					<Text style={{ fontSize: 11, color: "#8c8c8c" }}>
						{row._groupSelectionEfficiencyPct.toFixed(1)}%
					</Text>
				);
			},
		},
		{
			title: (
				<Tooltip title="Computed with default settings (min. 5 Production/POC runs, no product-tag filter) — always live, not necessarily the exact settings used the last time Optimize signals ran. Compare against 'At Selection' to see how much this has drifted since.">
					Current
				</Tooltip>
			),
			key: "efficiency",
			width: 130,
			align: "right",
			onCell: (row) => ({ rowSpan: row._subcategorySpan }),
			render: (_: unknown, row: FlatRow) => {
				if (row.signalEfficiencyPct == null) {
					return (
						<Text type="secondary" style={{ fontSize: 11 }}>
							—
						</Text>
					);
				}
				const color =
					row.signalEfficiencyPct >= 50
						? "#52c41a"
						: row.signalEfficiencyPct >= 25
							? "#d4b106"
							: "#8c8c8c";
				return (
					<Tooltip
						title={`Based on ${row.efficiencySampleSize ?? 0} Production/POC ${
							row.efficiencySampleSize === 1 ? "run" : "runs"
						} at the best-matching GICS level`}
					>
						<Text style={{ fontSize: 11, color }}>
							{row.signalEfficiencyPct.toFixed(1)}%
						</Text>
					</Tooltip>
				);
			},
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
