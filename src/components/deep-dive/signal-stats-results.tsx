"use client";

import { Button, Card, Segmented, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined } from "@ant-design/icons";
import type { CSSProperties } from "react";
import {
	DARK_CARD_STYLE,
	DARK_CARD_HEADER_STYLE,
} from "../../config/chart-theme";
import type {
	SignalCategoryStatRow,
	SignalStatRow,
} from "../../hooks/api/useDeepDiveService";

export type SignalStatsView = "signal" | "category" | "productTag";

interface SignalStatsResultsProps {
	view: SignalStatsView;
	onViewChange: (view: SignalStatsView) => void;
	cardStyle?: CSSProperties;

	signalRows: SignalStatRow[];
	signalColumns: ColumnsType<SignalStatRow>;
	signalLoading: boolean;
	signalExportPending: boolean;
	onExportSignal: () => void;

	categoryRows: SignalCategoryStatRow[];
	categoryColumns: ColumnsType<SignalCategoryStatRow>;
	categoryLoading: boolean;
	categoryExportPending: boolean;
	onExportCategory: () => void;

	productTagColumns: ColumnsType<SignalCategoryStatRow>;
	matrixLoading: boolean;
	matrixExportPending: boolean;
	onExportMatrix: () => void;
}

/**
 * The "By Signal / By Category / By Product Tag" view switcher shared by the
 * deep-dive Signal Statistics tab and the cross-report Sales Miner Statistics
 * page — both fetch the same three row shapes (per-report vs filter-scoped),
 * so only the view-switching, loading, export and table rendering are shared
 * here; each caller still owns its own data fetching.
 */
export function SignalStatsResults({
	view,
	onViewChange,
	cardStyle,
	signalRows,
	signalColumns,
	signalLoading,
	signalExportPending,
	onExportSignal,
	categoryRows,
	categoryColumns,
	categoryLoading,
	categoryExportPending,
	onExportCategory,
	productTagColumns,
	matrixLoading,
	matrixExportPending,
	onExportMatrix,
}: SignalStatsResultsProps) {
	const isLoading =
		view === "signal"
			? signalLoading
			: view === "category"
				? categoryLoading
				: categoryLoading || matrixLoading;
	const rowCount = view === "signal" ? signalRows.length : categoryRows.length;
	const exportPending =
		view === "signal"
			? signalExportPending
			: view === "category"
				? categoryExportPending
				: matrixExportPending;
	const title = isLoading
		? "Signal Statistics"
		: `Signal Statistics (${rowCount})`;

	const handleExport = () => {
		if (view === "signal") {
			onExportSignal();
		} else if (view === "category") {
			onExportCategory();
		} else {
			onExportMatrix();
		}
	};

	return (
		<Card
			title={title}
			extra={
				<div style={{ display: "flex", gap: 12, alignItems: "center" }}>
					<Segmented
						size="small"
						value={view}
						onChange={(v) => onViewChange(v as SignalStatsView)}
						options={[
							{ label: "By Signal", value: "signal" },
							{ label: "By Category", value: "category" },
							{ label: "By Product Tag", value: "productTag" },
						]}
					/>
					<Button
						icon={<DownloadOutlined />}
						size="small"
						type="primary"
						loading={exportPending}
						disabled={rowCount === 0}
						onClick={handleExport}
					>
						Export XLSX
					</Button>
				</div>
			}
			size="small"
			style={cardStyle ?? DARK_CARD_STYLE}
			styles={{ header: DARK_CARD_HEADER_STYLE }}
		>
			{view === "signal" && (
				<Table<SignalStatRow>
					dataSource={signalRows}
					columns={signalColumns}
					rowKey={(row) => `${row.unitType}-${row.unitId}`}
					loading={signalLoading}
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
			)}
			{view === "category" && (
				<Table<SignalCategoryStatRow>
					dataSource={categoryRows}
					columns={categoryColumns}
					rowKey={(row) => row.categoryId ?? "custom"}
					loading={categoryLoading}
					size="small"
					scroll={{ x: 1400 }}
					pagination={false}
					rowClassName={() => "sm-signal-row"}
					className="sm-signal-stats"
					style={{ background: "transparent" }}
				/>
			)}
			{view === "productTag" && (
				<Table<SignalCategoryStatRow>
					dataSource={categoryRows}
					columns={productTagColumns}
					rowKey={(row) => row.categoryId ?? "custom"}
					loading={categoryLoading || matrixLoading}
					size="small"
					scroll={{ x: 1400 + productTagColumns.length * 60 }}
					pagination={false}
					rowClassName={() => "sm-signal-row"}
					className="sm-signal-stats"
					style={{ background: "transparent" }}
				/>
			)}
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
	);
}
