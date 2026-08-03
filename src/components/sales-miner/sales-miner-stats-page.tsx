"use client";

import { Card, Select, Space, TreeSelect, Typography } from "antd";
import { useMemo, useState } from "react";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import { useSalesMinerCustomersList } from "../../hooks/api/useSalesMinerCustomersService";
import { useGicsCodes } from "../../hooks/api/useSalesMinerSignalCatalogService";
import {
	useExportSalesMinerCategoryProductTagMatrixXlsx,
	useExportSalesMinerCategoryStatsXlsx,
	useExportSalesMinerStatsXlsx,
	useGetCapabilityTags,
	useGetReportClassifiers,
	useGetSalesMinerCategoryProductTagMatrix,
	useGetSalesMinerCategoryStats,
	useGetSalesMinerStats,
} from "../../hooks/api/useSalesMinerStatsService";
import { buildGicsTree } from "../../lib/gics-tree";
import {
	buildCategoryColumns,
	buildColumns,
	buildProductTagMatrixColumns,
} from "../deep-dive/signal-stats-columns";
import {
	SignalStatsResults,
	type SignalStatsView,
} from "../deep-dive/signal-stats-results";

const { Text } = Typography;

const UNIT_TYPE_OPTIONS = [
	{ label: "Product Signal", value: "product_signal" },
	{ label: "Subcategory", value: "subcategory" },
];

/** Static column set (no args, always the same) — computed once at module load rather than per-render. */
const CATEGORY_COLUMNS = buildCategoryColumns();

export function SalesMinerStatsEmbedded() {
	const [customerIds, setCustomerIds] = useState<string[]>([]);
	const [capabilityTagIds, setCapabilityTagIds] = useState<string[]>([]);
	const [targetGics, setTargetGics] = useState<string[]>([]);
	const [classifierIds, setClassifierIds] = useState<string[]>([]);
	const [unitTypes, setUnitTypes] = useState<string[]>([]);
	const [view, setView] = useState<SignalStatsView>("signal");

	const customersQuery = useSalesMinerCustomersList({
		page: 1,
		limit: 500,
		q: "",
	});
	const gicsQuery = useGicsCodes();
	const classifiersQuery = useGetReportClassifiers();
	const capabilityTagsQuery = useGetCapabilityTags();

	const customerOptions = useMemo(
		() =>
			(customersQuery.data?.data.items ?? []).map((c) => ({
				label: c.display_name,
				value: c.id,
			})),
		[customersQuery.data?.data.items],
	);

	const gicsTree = useMemo(
		() => buildGicsTree(gicsQuery.data?.data ?? []),
		[gicsQuery.data?.data],
	);

	const classifierOptions = useMemo(
		() =>
			(classifiersQuery.data?.data ?? []).map((c) => ({
				label: c.name,
				value: String(c.id),
			})),
		[classifiersQuery.data?.data],
	);

	const capabilityTagOptions = useMemo(
		() =>
			(capabilityTagsQuery.data?.data ?? []).map((t) => ({
				label: t.name,
				value: String(t.id),
			})),
		[capabilityTagsQuery.data?.data],
	);

	const filterParams = {
		customerIds,
		capabilityTagIds,
		targetGics,
		classifierIds,
	};

	const statsQuery = useGetSalesMinerStats(filterParams, view === "signal");
	// "By Product Tag" reuses the category rows as its base table, so it fetches
	// alongside "By Category" too — see buildProductTagMatrixColumns.
	const categoryStatsQuery = useGetSalesMinerCategoryStats(
		filterParams,
		view === "category" || view === "productTag",
	);
	const matrixQuery = useGetSalesMinerCategoryProductTagMatrix(
		filterParams,
		view === "productTag",
	);
	const { mutateAsync: exportXlsx, isPending: exportPending } =
		useExportSalesMinerStatsXlsx();
	const { mutateAsync: exportCategoryXlsx, isPending: exportCategoryPending } =
		useExportSalesMinerCategoryStatsXlsx();
	const { mutateAsync: exportMatrixXlsx, isPending: exportMatrixPending } =
		useExportSalesMinerCategoryProductTagMatrixXlsx();

	const allRows = useMemo(() => statsQuery.data?.data ?? [], [statsQuery.data]);
	const rows = useMemo(
		() =>
			unitTypes.length
				? allRows.filter((r) => unitTypes.includes(r.unitType))
				: allRows,
		[allRows, unitTypes],
	);
	const categoryRows = useMemo(
		() => categoryStatsQuery.data?.data ?? [],
		[categoryStatsQuery.data],
	);
	const matrixCells = useMemo(
		() => matrixQuery.data?.data ?? [],
		[matrixQuery.data],
	);
	const columns = useMemo(() => buildColumns(rows), [rows]);
	const productTagColumns = useMemo(
		() => [...CATEGORY_COLUMNS, ...buildProductTagMatrixColumns(matrixCells)],
		[matrixCells],
	);

	return (
		<div>
			<Card
				style={{ ...DARK_CARD_STYLE, marginBottom: 16 }}
				styles={{ body: { padding: 16 } }}
			>
				<Space wrap size="middle" style={{ width: "100%" }}>
					<div>
						<Text
							style={{
								display: "block",
								color: "#8c8c8c",
								fontSize: 12,
								marginBottom: 4,
							}}
						>
							Customer
						</Text>
						<Select
							mode="multiple"
							showSearch
							allowClear
							value={customerIds}
							onChange={setCustomerIds}
							options={customerOptions}
							optionFilterProp="label"
							loading={customersQuery.isLoading}
							placeholder="All customers"
							style={{ width: 260 }}
							maxTagCount="responsive"
						/>
					</div>
					<div>
						<Text
							style={{
								display: "block",
								color: "#8c8c8c",
								fontSize: 12,
								marginBottom: 4,
							}}
						>
							Product Tag
						</Text>
						<Select
							mode="multiple"
							showSearch
							allowClear
							value={capabilityTagIds}
							onChange={setCapabilityTagIds}
							options={capabilityTagOptions}
							optionFilterProp="label"
							loading={capabilityTagsQuery.isLoading}
							placeholder="All product tags"
							style={{ width: 260 }}
							maxTagCount="responsive"
						/>
					</div>
					<div>
						<Text
							style={{
								display: "block",
								color: "#8c8c8c",
								fontSize: 12,
								marginBottom: 4,
							}}
						>
							Target Company Industry (GICS)
						</Text>
						<TreeSelect
							treeData={gicsTree}
							multiple
							showSearch
							allowClear
							value={targetGics}
							onChange={setTargetGics}
							filterTreeNode={(input, node) => {
								const code = String(node.value ?? "");
								const title = String(node.title ?? "");
								const namePart = title.split(" — ").slice(1).join(" — ");
								return (
									code.startsWith(input) ||
									namePart.toLowerCase().includes(input.toLowerCase())
								);
							}}
							loading={gicsQuery.isLoading}
							placeholder="All industries"
							style={{ width: 280 }}
							dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
							treeDefaultExpandAll={false}
							maxTagCount="responsive"
						/>
					</div>
					<div>
						<Text
							style={{
								display: "block",
								color: "#8c8c8c",
								fontSize: 12,
								marginBottom: 4,
							}}
						>
							Classifier
						</Text>
						<Select
							mode="multiple"
							showSearch
							allowClear
							value={classifierIds}
							onChange={setClassifierIds}
							options={classifierOptions}
							optionFilterProp="label"
							loading={classifiersQuery.isLoading}
							placeholder="All classifiers"
							style={{ width: 220 }}
							maxTagCount="responsive"
						/>
					</div>
					<div>
						<Text
							style={{
								display: "block",
								color: "#8c8c8c",
								fontSize: 12,
								marginBottom: 4,
							}}
						>
							Unit Type
						</Text>
						<Select
							mode="multiple"
							allowClear
							value={unitTypes}
							onChange={setUnitTypes}
							options={UNIT_TYPE_OPTIONS}
							placeholder="All unit types"
							style={{ width: 200 }}
							maxTagCount="responsive"
						/>
					</div>
				</Space>
			</Card>

			<SignalStatsResults
				view={view}
				onViewChange={setView}
				cardStyle={DARK_CARD_STYLE}
				signalRows={rows}
				signalColumns={columns}
				signalLoading={statsQuery.isLoading}
				signalExportPending={exportPending}
				onExportSignal={() => {
					exportXlsx({ ...filterParams, unitTypes }).catch(() => undefined);
				}}
				categoryRows={categoryRows}
				categoryColumns={CATEGORY_COLUMNS}
				categoryLoading={categoryStatsQuery.isLoading}
				categoryExportPending={exportCategoryPending}
				onExportCategory={() => {
					exportCategoryXlsx(filterParams).catch(() => undefined);
				}}
				productTagColumns={productTagColumns}
				matrixLoading={matrixQuery.isLoading}
				matrixExportPending={exportMatrixPending}
				onExportMatrix={() => {
					exportMatrixXlsx(filterParams).catch(() => undefined);
				}}
			/>
		</div>
	);
}
