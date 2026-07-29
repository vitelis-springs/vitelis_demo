"use client";

import { Button, Card, Table } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import {
	useExportSalesMinerSignalStatsXlsx,
	useGetSalesMinerSignalStats,
	type SignalStatRow,
} from "../../hooks/api/useDeepDiveService";
import {
	DARK_CARD_STYLE,
	DARK_CARD_HEADER_STYLE,
} from "../../config/chart-theme";
import { buildColumns } from "./signal-stats-columns";

interface Props {
	reportId: number;
}

export default function SignalStatsTable({ reportId }: Props) {
	const { data, isLoading } = useGetSalesMinerSignalStats(reportId);
	const { mutateAsync: exportXlsx, isPending: exportPending } =
		useExportSalesMinerSignalStatsXlsx();

	const rows = useMemo(() => data?.data ?? [], [data]);
	const columns = useMemo(() => buildColumns(rows), [rows]);
	const title = isLoading
		? "Signal Statistics"
		: `Signal Statistics (${rows.length})`;

	return (
		<Card
			title={title}
			extra={
				<Button
					icon={<DownloadOutlined />}
					size="small"
					type="primary"
					loading={exportPending}
					disabled={rows.length === 0}
					onClick={() => {
						exportXlsx(reportId).catch(() => undefined);
					}}
				>
					Export XLSX
				</Button>
			}
			size="small"
			style={{ ...DARK_CARD_STYLE, marginBottom: 24 }}
			styles={{ header: DARK_CARD_HEADER_STYLE }}
		>
			<Table<SignalStatRow>
				dataSource={rows}
				columns={columns}
				rowKey={(row) => `${row.unitType}-${row.unitId}`}
				loading={isLoading}
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
	);
}
