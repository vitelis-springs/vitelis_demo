"use client";

import {
	Button,
	Card,
	Select,
	Space,
	Table,
	TreeSelect,
	Typography,
} from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";
import {
	DARK_CARD_STYLE,
	DARK_CARD_HEADER_STYLE,
} from "../../config/chart-theme";
import { useSalesMinerCustomersList } from "../../hooks/api/useSalesMinerCustomersService";
import { useGicsCodes } from "../../hooks/api/useSalesMinerSignalCatalogService";
import {
	useExportSalesMinerStatsXlsx,
	useGetReportClassifiers,
	useGetSalesMinerStats,
} from "../../hooks/api/useSalesMinerStatsService";
import { buildGicsTree } from "../../lib/gics-tree";
import type { SignalStatRow } from "../../types/deep-dive.types";
import { buildColumns } from "../deep-dive/signal-stats-columns";

const { Text } = Typography;

const UNIT_TYPE_OPTIONS = [
	{ label: "Product Signal", value: "product_signal" },
	{ label: "Subcategory", value: "subcategory" },
];

export function SalesMinerStatsEmbedded() {
	const [customerIds, setCustomerIds] = useState<string[]>([]);
	const [customerGics, setCustomerGics] = useState<string[]>([]);
	const [targetGics, setTargetGics] = useState<string[]>([]);
	const [classifierIds, setClassifierIds] = useState<string[]>([]);
	const [unitTypes, setUnitTypes] = useState<string[]>([]);

	const customersQuery = useSalesMinerCustomersList({
		page: 1,
		limit: 500,
		q: "",
	});
	const gicsQuery = useGicsCodes();
	const classifiersQuery = useGetReportClassifiers();

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

	const statsQuery = useGetSalesMinerStats({
		customerIds,
		customerGics,
		targetGics,
		classifierIds,
	});
	const { mutateAsync: exportXlsx, isPending: exportPending } =
		useExportSalesMinerStatsXlsx();

	const allRows = useMemo(() => statsQuery.data?.data ?? [], [statsQuery.data]);
	const rows = useMemo(
		() =>
			unitTypes.length
				? allRows.filter((r) => unitTypes.includes(r.unitType))
				: allRows,
		[allRows, unitTypes],
	);
	const columns = useMemo(() => buildColumns(rows), [rows]);
	const title = statsQuery.isLoading
		? "Signal Statistics"
		: `Signal Statistics (${rows.length})`;

	const handleExport = () => {
		exportXlsx({
			customerIds,
			customerGics,
			targetGics,
			classifierIds,
			unitTypes,
		}).catch(() => undefined);
	};

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
							Customer Industry (GICS)
						</Text>
						<TreeSelect
							treeData={gicsTree}
							multiple
							showSearch
							allowClear
							value={customerGics}
							onChange={setCustomerGics}
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

			<Card
				title={title}
				extra={
					<Button
						icon={<DownloadOutlined />}
						size="small"
						type="primary"
						loading={exportPending}
						disabled={rows.length === 0}
						onClick={handleExport}
					>
						Export XLSX
					</Button>
				}
				size="small"
				style={DARK_CARD_STYLE}
				styles={{ header: DARK_CARD_HEADER_STYLE }}
			>
				<Table<SignalStatRow>
					dataSource={rows}
					columns={columns}
					rowKey={(row) => `${row.unitType}-${row.unitId}`}
					loading={statsQuery.isLoading}
					size="small"
					scroll={{ x: 1400 }}
					pagination={{
						pageSize: 20,
						showSizeChanger: true,
						pageSizeOptions: ["10", "20", "50", "100"],
						showTotal: (total) => `${total} signals`,
					}}
					rowClassName={() => "sm-signal-row"}
					className="sm-signal-stats"
					style={{ background: "transparent" }}
				/>
				<style jsx global>{`
					.sm-signal-row:hover td { background: #1f1f1f !important; }
					.sm-signal-stats .ant-table-thead > tr > th {
						white-space: normal !important;
						word-break: keep-all;
						overflow-wrap: normal;
						vertical-align: top;
						padding: 8px 6px !important;
						line-height: 1.3;
					}
				`}</style>
			</Card>
		</div>
	);
}
