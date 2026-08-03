"use client";

import { Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { QuestionCircleOutlined } from "@ant-design/icons";
import type {
	CategoryProductTagCell,
	SignalCategoryStatRow,
	SignalStatRow,
} from "../../hooks/api/useDeepDiveService";

const { Text } = Typography;

export const UNIT_TYPE_COLORS: Record<string, string> = {
	subcategory: "cyan",
	product_signal: "purple",
};

export const UNIT_TYPE_LABELS: Record<string, string> = {
	subcategory: "Subcategory",
	product_signal: "Product Signal",
};

export function pct(val: number | null, decimals = 1): string {
	if (val == null) return "—";
	return `${val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
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

/** The metric fields shared verbatim (same width/sorter/render/color) between SignalStatRow and SignalCategoryStatRow. */
interface SharedMetricRow {
	opportunitiesCount: number;
	distinctSignalDefinitionCount: number;
	completedSearchCount: number;
	signalEfficiencyPct: number | null;
	companiesResearchedCount: number;
	companiesWithOpportunityCount: number;
	companyHitRatePct: number | null;
	triggerOpportunitiesCount: number;
	triggerEfficiencyPct: number | null;
}

interface SharedMetricColumnTooltips {
	opportunities: string;
	signalDefinitions: string;
	completedSearches: string;
	signalEfficiency: string;
	companiesResearched: string;
	companiesWithOpportunity: string;
	companyHitRate: string;
	triggerOpportunities: string;
	triggerEfficiency: string;
}

function buildSharedMetricColumns<T extends SharedMetricRow>(
	tooltips: SharedMetricColumnTooltips,
): ColumnsType<T> {
	return [
		{
			title: colTitle("Opportunities", tooltips.opportunities),
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
			title: colTitle("Signal Definitions", tooltips.signalDefinitions),
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
			title: colTitle("Completed Searches", tooltips.completedSearches),
			dataIndex: "completedSearchCount",
			key: "completedSearchCount",
			width: 120,
			sorter: (a, b) => a.completedSearchCount - b.completedSearchCount,
			render: (v: number) => (
				<Text style={{ color: "#d9d9d9" }}>{v.toLocaleString()}</Text>
			),
		},
		{
			title: colTitle("Signal Efficiency", tooltips.signalEfficiency),
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
			title: colTitle("Companies Researched", tooltips.companiesResearched),
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
				tooltips.companiesWithOpportunity,
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
			title: colTitle("Company Hit Rate", tooltips.companyHitRate),
			dataIndex: "companyHitRatePct",
			key: "companyHitRatePct",
			width: 120,
			sorter: (a, b) =>
				(a.companyHitRatePct ?? -1) - (b.companyHitRatePct ?? -1),
			render: (v: number | null) => (
				<Text style={{ color: "#fadb14" }}>{pct(v)}</Text>
			),
		},
		{
			title: colTitle("Trigger Opportunities", tooltips.triggerOpportunities),
			dataIndex: "triggerOpportunitiesCount",
			key: "triggerOpportunitiesCount",
			width: 130,
			sorter: (a, b) =>
				a.triggerOpportunitiesCount - b.triggerOpportunitiesCount,
			render: (v: number) => (
				<Text style={{ color: v > 0 ? "#eb2f96" : "#595959" }}>
					{v.toLocaleString()}
				</Text>
			),
		},
		{
			title: colTitle("Trigger Efficiency", tooltips.triggerEfficiency),
			dataIndex: "triggerEfficiencyPct",
			key: "triggerEfficiencyPct",
			width: 120,
			sorter: (a, b) =>
				(a.triggerEfficiencyPct ?? -1) - (b.triggerEfficiencyPct ?? -1),
			render: (v: number | null) => (
				<Text style={{ color: "#eb2f96" }}>{pct(v)}</Text>
			),
		},
	];
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
		...buildSharedMetricColumns<SignalStatRow>({
			opportunities:
				"Number of distinct opportunities (motion-first seeds) created where this signal appeared in the trigger lineage.",
			signalDefinitions:
				"Number of distinct signal_definition_id rows folded into this unit.",
			completedSearches:
				"Number of completed research attempts for this signal unit (one per company per run).",
			signalEfficiency:
				"Share of completed searches for this unit that actually produced a created opportunity (opportunities / completed searches).",
			companiesResearched:
				"Number of unique companies where this signal unit was researched.",
			companiesWithOpportunity:
				"Number of unique companies where this signal unit actually produced an opportunity.",
			companyHitRate:
				"Breadth-of-impact view: companies with an opportunity from this signal, divided by companies where it was researched.",
			triggerOpportunities:
				'Opportunities where this signal was the actual reason it was created (trigger_signal_lineage role contains "trigger"), not just supporting context. Lower bound: links only backed by opportunity_seed_signal_facts carry no role and aren\'t counted here.',
			triggerEfficiency:
				"Share of completed searches for this unit that produced an opportunity where it was the actual trigger, not just supporting evidence.",
		}),
	];
}

export function buildCategoryColumns(): ColumnsType<SignalCategoryStatRow> {
	return [
		{
			title: colTitle(
				"Category",
				'sm_signal_categories rollup. "Custom / Product Signals" is a synthetic bucket for report-specific signals, which have no category.',
			),
			dataIndex: "categoryName",
			key: "categoryName",
			fixed: "left",
			width: 260,
			render: (name: string, row) => (
				<Tag
					color={row.categoryId == null ? "purple" : "cyan"}
					style={{ fontSize: 11, whiteSpace: "normal" }}
				>
					{name}
				</Tag>
			),
		},
		{
			title: colTitle(
				"Subcategories",
				"Number of distinct subcategories in this category that were researched in scope. Always 0 for the Custom / Product Signals row.",
			),
			dataIndex: "subcategoryCount",
			key: "subcategoryCount",
			width: 110,
			sorter: (a, b) => a.subcategoryCount - b.subcategoryCount,
			render: (v: number) => (
				<Text style={{ color: "#8c8c8c" }}>{v.toLocaleString()}</Text>
			),
		},
		{
			title: colTitle(
				"Opportunities",
				"Number of distinct opportunities where any signal in this category appeared in the trigger lineage.",
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
		...buildSharedMetricColumns<SignalCategoryStatRow>({
			opportunities:
				"Number of distinct opportunities where any signal in this category appeared in the trigger lineage.",
			signalDefinitions:
				"Number of distinct signal_definition_id rows in this category that appeared in an opportunity's lineage.",
			completedSearches:
				"Number of completed research attempts across all signals in this category (one per company per run).",
			signalEfficiency:
				"Share of completed searches in this category that produced a created opportunity.",
			companiesResearched:
				"Number of unique companies where this category was researched.",
			companiesWithOpportunity:
				"Number of unique companies where this category produced an opportunity.",
			companyHitRate:
				"Breadth-of-impact view: companies with an opportunity from this category, divided by companies where it was researched.",
			triggerOpportunities:
				'Opportunities where a signal in this category was the actual reason it was created (trigger_signal_lineage role contains "trigger"), not just supporting context.',
			triggerEfficiency:
				"Share of completed searches in this category that produced an opportunity where it was the actual trigger, not just supporting evidence.",
		}),
	];
}

/**
 * One column per capability tag present in `cells`, meant to be appended
 * after buildCategoryColumns()'s columns — turns the category table into a
 * category × tag matrix. Each cell is THIS category's own Signal Efficiency
 * (opportunities anchored on that tag / this category's own completed
 * searches), not a scope-wide total — unlike a flat per-tag rollup, every
 * cell has a real, comparable denominator.
 *
 * Tags are ordered by total opportunities across all categories, descending,
 * so the most active tags land first (left) in the scrollable table.
 */
export function buildProductTagMatrixColumns(
	cells: CategoryProductTagCell[],
): ColumnsType<SignalCategoryStatRow> {
	const tagTotals = new Map<
		string,
		{ tagId: number | null; tagName: string; total: number }
	>();
	for (const cell of cells) {
		const key = String(cell.capabilityTagId ?? "none");
		const existing = tagTotals.get(key);
		if (existing) {
			existing.total += cell.opportunitiesCount;
		} else {
			tagTotals.set(key, {
				tagId: cell.capabilityTagId,
				tagName: cell.tagName,
				total: cell.opportunitiesCount,
			});
		}
	}
	const tags = Array.from(tagTotals.values()).sort((a, b) => b.total - a.total);

	const cellLookup = new Map<string, CategoryProductTagCell>();
	for (const cell of cells) {
		cellLookup.set(
			`${cell.categoryId ?? "custom"}:${cell.capabilityTagId ?? "none"}`,
			cell,
		);
	}
	const cellFor = (row: SignalCategoryStatRow, tagId: number | null) =>
		cellLookup.get(`${row.categoryId ?? "custom"}:${tagId ?? "none"}`);

	return tags.map((tag) => ({
		title: colTitle(
			tag.tagName,
			`Signal Efficiency for this category specifically, restricted to opportunities whose lead product is anchored on "${tag.tagName}" (sm_customer_product_capability_map, role_type='anchor'). Denominator is this category's own completed searches — the same one used by its plain Signal Efficiency column, just with the numerator narrowed by product tag.`,
		),
		dataIndex: `tag-${tag.tagId ?? "none"}`,
		key: `tag-${tag.tagId ?? "none"}`,
		width: 110,
		sorter: (a, b) =>
			(cellFor(a, tag.tagId)?.signalEfficiencyPct ?? -1) -
			(cellFor(b, tag.tagId)?.signalEfficiencyPct ?? -1),
		render: (_: unknown, row: SignalCategoryStatRow) => {
			const cell = cellFor(row, tag.tagId);
			return (
				<Text style={{ color: "#52c41a" }}>
					{pct(cell?.signalEfficiencyPct ?? null, 2)}
				</Text>
			);
		},
	}));
}
