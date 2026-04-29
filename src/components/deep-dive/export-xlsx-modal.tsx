"use client";

import { FileExcelOutlined } from "@ant-design/icons";
import { Button, Modal, Table, Typography, message as antMessage } from "antd";
import { useCallback, useEffect, useState } from "react";
import {
	deepDiveApi,
	useGenerateXlsxReport,
	type DeepDiveListItem,
} from "../../hooks/api/useDeepDiveService";

const { Text } = Typography;

interface ExportXlsxModalProps {
	open: boolean;
	onClose: () => void;
}

export default function ExportXlsxModal({
	open,
	onClose,
}: ExportXlsxModalProps) {
	const [reports, setReports] = useState<DeepDiveListItem[]>([]);
	const [loadingReports, setLoadingReports] = useState(false);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [exporting, setExporting] = useState(false);

	const { mutateAsync: generateXlsx } = useGenerateXlsxReport();

	useEffect(() => {
		if (!open) return;

		setLoadingReports(true);
		setSelectedIds([]);

		deepDiveApi
			.list({ reportType: "biz_miner", limit: 1000, offset: 0 })
			.then((res) => setReports(res.data.items))
			.catch(() => antMessage.error("Failed to load reports"))
			.finally(() => setLoadingReports(false));
	}, [open]);

	const handleExport = useCallback(async () => {
		if (selectedIds.length === 0) {
			antMessage.warning("Select at least one report");
			return;
		}

		setExporting(true);
		try {
			const companiesPerReport = await Promise.all(
				selectedIds.map((id) => deepDiveApi.getCompanies(id)),
			);

			const seen = new Set<number>();
			const companyIds = companiesPerReport
				.flatMap((res) => res.data.companies.map((c) => c.id))
				.filter((id) => {
					if (seen.has(id)) return false;
					seen.add(id);
					return true;
				});

			if (companyIds.length === 0) {
				antMessage.warning("No companies found in selected reports");
				return;
			}

			await generateXlsx({ company_ids: companyIds, report_ids: selectedIds });
			onClose();
		} catch {
			antMessage.error("Failed to download XLSX report");
		} finally {
			setExporting(false);
		}
	}, [selectedIds, generateXlsx, onClose]);

	const columns = [
		{
			title: "ID",
			dataIndex: "id",
			key: "id",
			width: 70,
			render: (value: number) => (
				<Text style={{ color: "#8c8c8c", fontFamily: "monospace" }}>
					#{value}
				</Text>
			),
		},
		{
			title: "Report",
			dataIndex: "name",
			key: "name",
			render: (value: string | null, record: DeepDiveListItem) => (
				<Text style={{ color: "#e0e0e0" }}>
					{value || `Deep Dive #${record.id}`}
				</Text>
			),
		},
		{
			title: "Companies",
			key: "companies",
			width: 110,
			render: (_: unknown, record: DeepDiveListItem) => (
				<Text style={{ color: "#8c8c8c" }}>{record.counts.companies}</Text>
			),
		},
	];

	return (
		<Modal
			title="Export XLSX Report"
			open={open}
			onCancel={onClose}
			width={700}
			footer={[
				<Button key="cancel" onClick={onClose} disabled={exporting}>
					Cancel
				</Button>,
				<Button
					key="export"
					type="primary"
					icon={<FileExcelOutlined />}
					loading={exporting}
					disabled={selectedIds.length === 0}
					onClick={handleExport}
				>
					Export ({selectedIds.length} report
					{selectedIds.length !== 1 ? "s" : ""})
				</Button>,
			]}
		>
			<Table
				dataSource={reports}
				columns={columns}
				rowKey="id"
				loading={loadingReports}
				size="small"
				pagination={false}
				scroll={{ y: 400 }}
				rowSelection={{
					selectedRowKeys: selectedIds,
					onChange: (keys) => setSelectedIds(keys as number[]),
				}}
				style={{ background: "#1f1f1f" }}
			/>
		</Modal>
	);
}
