"use client";

import { Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { QuestionCircleOutlined } from "@ant-design/icons";
import type { SignalStatRow } from "../../hooks/api/useDeepDiveService";

const { Text } = Typography;

export const UNIT_TYPE_COLORS: Record<string, string> = {
	subcategory: "cyan",
	product_signal: "purple",
};

export const UNIT_TYPE_LABELS: Record<string, string> = {
	subcategory: "Subcategory",
	product_signal: "Product Signal",
};

export function pct(val: number | null): string {
	if (val == null) return "—";
	return `${val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function colTitle(title: string, tip: string) {
	return (
		<Tooltip title={tip}>
			<span style={{ cursor: "help", lineHeight: 1.3 }}>
				{title}{" "}
				<QuestionCircleOutlined style={{ color: "#595959", fontSize: 11 }} />
			</span>
		</Tooltip>
	);
}

export function buildColumns(
	rows: SignalStatRow[],
): ColumnsType<SignalStatRow> {
	const signalClasses = Array.from(
		new Set(rows.map((r) => r.signalClass).filter((v): v is string => !!v)),
	).sort();

	return [
		{
			title: colTitle(
				"Unit Type",
				"Whether this row rolls up a durable signal subcategory, or is a single product-generated signal.",
			),
			dataIndex: "unitType",
			key: "unitType",
			fixed: "left",
			width: 120,
			filters: Object.entries(UNIT_TYPE_LABELS).map(([value, text]) => ({
				text,
				value,
			})),
			onFilter: (value, row) => row.unitType === value,
			render: (v: string) => (
				<Tag color={UNIT_TYPE_COLORS[v] ?? "default"} style={{ fontSize: 11 }}>
					{UNIT_TYPE_LABELS[v] ?? v}
				</Tag>
			),
		},
		{
			title: colTitle(
				"Signal Name",
				"Human-readable name of the signal subcategory or product signal.",
			),
			dataIndex: "unitName",
			key: "unitName",
			fixed: "left",
			width: 240,
			render: (name: string | null) => (
				<Text style={{ color: "#d9d9d9" }}>{name ?? "—"}</Text>
			),
		},
		{
			title: colTitle(
				"External ID",
				"External identifier of the signal subcategory (subcategory rows only).",
			),
			dataIndex: "externalId",
			key: "externalId",
			width: 110,
			render: (v: string | null) => (
				<Text style={{ color: "#595959", fontSize: 11 }}>{v ?? "—"}</Text>
			),
		},
		{
			title: colTitle(
				"Signal Class",
				"Signal class of the subcategory, as defined in the signal catalog.",
			),
			dataIndex: "signalClass",
			key: "signalClass",
			width: 130,
			filters: signalClasses.map((v) => ({ text: v, value: v })),
			onFilter: (value, row) => row.signalClass === value,
			render: (v: string | null) =>
				v ? (
					<Tag style={{ fontSize: 11 }}>{v}</Tag>
				) : (
					<Text style={{ color: "#595959" }}>—</Text>
				),
		},
		{
			title: colTitle(
				"Opportunities",
				"Number of distinct opportunities (motion-first seeds) created where this signal appeared in the trigger lineage.",
			),
			dataIndex: "opportunitiesCount",
			key: "opportunitiesCount",
			width: 110,
			sorter: (a, b) => a.opportunitiesCount - b.opportunitiesCount,
			defaultSortOrder: "descend",
			render: (v: number) => (
				<Text style={{ color: v > 0 ? "#13c2c2" : "#595959" }}>
					{v.toLocaleString()}
				</Text>
			),
		},
		{
			title: colTitle(
				"Signal Definitions",
				"Number of distinct signal_definition_id rows folded into this unit.",
			),
			dataIndex: "distinctSignalDefinitionCount",
			key: "distinctSignalDefinitionCount",
			width: 110,
			sorter: (a, b) =>
				a.distinctSignalDefinitionCount - b.distinctSignalDefinitionCount,
			render: (v: number) => (
				<Text style={{ color: "#8c8c8c" }}>{v.toLocaleString()}</Text>
			),
		},
		{
			title: colTitle(
				"Completed Searches",
				"Number of completed research attempts for this signal unit (one per company per run).",
			),
			dataIndex: "completedSearchCount",
			key: "completedSearchCount",
			width: 120,
			sorter: (a, b) => a.completedSearchCount - b.completedSearchCount,
			render: (v: number) => (
				<Text style={{ color: "#d9d9d9" }}>{v.toLocaleString()}</Text>
			),
		},
		{
			title: colTitle(
				"Signal Efficiency",
				"Share of completed searches for this unit that actually produced a created opportunity (opportunities / completed searches).",
			),
			dataIndex: "signalEfficiencyPct",
			key: "signalEfficiencyPct",
			width: 120,
			sorter: (a, b) =>
				(a.signalEfficiencyPct ?? -1) - (b.signalEfficiencyPct ?? -1),
			render: (v: number | null) => (
				<Text style={{ color: "#52c41a" }}>{pct(v)}</Text>
			),
		},
		{
			title: colTitle(
				"Companies Researched",
				"Number of unique companies where this signal unit was researched.",
			),
			dataIndex: "companiesResearchedCount",
			key: "companiesResearchedCount",
			width: 130,
			sorter: (a, b) => a.companiesResearchedCount - b.companiesResearchedCount,
			render: (v: number) => (
				<Text style={{ color: "#d9d9d9" }}>{v.toLocaleString()}</Text>
			),
		},
		{
			title: colTitle(
				"Companies w/ Opportunity",
				"Number of unique companies where this signal unit actually produced an opportunity.",
			),
			dataIndex: "companiesWithOpportunityCount",
			key: "companiesWithOpportunityCount",
			width: 130,
			sorter: (a, b) =>
				a.companiesWithOpportunityCount - b.companiesWithOpportunityCount,
			render: (v: number) => (
				<Text style={{ color: v > 0 ? "#1677ff" : "#595959" }}>
					{v.toLocaleString()}
				</Text>
			),
		},
		{
			title: colTitle(
				"Company Hit Rate",
				"Breadth-of-impact view: companies with an opportunity from this signal, divided by companies where it was researched.",
			),
			dataIndex: "companyHitRatePct",
			key: "companyHitRatePct",
			width: 120,
			sorter: (a, b) =>
				(a.companyHitRatePct ?? -1) - (b.companyHitRatePct ?? -1),
			render: (v: number | null) => (
				<Text style={{ color: "#fadb14" }}>{pct(v)}</Text>
			),
		},
	];
}
