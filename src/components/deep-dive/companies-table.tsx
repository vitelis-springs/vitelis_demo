"use client";

import {
	DownloadOutlined,
	PlusOutlined,
	SearchOutlined,
} from "@ant-design/icons";
import {
	App,
	Button,
	Card,
	Input,
	Progress,
	Space,
	Table,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TableRowSelection } from "antd/lib/table/interface";
import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import {
	DARK_CARD_HEADER_STYLE,
	DARK_CARD_STYLE,
} from "../../config/chart-theme";
import type {
	DeepDiveCompanyRow,
	DeepDiveStatus,
} from "../../hooks/api/useDeepDiveService";
import AddCompanyModal from "./add-company-modal";
import DeepDiveStatusTag from "./status-tag";

const { Text } = Typography;

const columns: ColumnsType<DeepDiveCompanyRow> = [
	{
		title: "ID",
		dataIndex: "id",
		width: 90,
		sorter: (a, b) => a.id - b.id,
		render: (value: number) => (
			<Text style={{ color: "#8c8c8c", fontFamily: "monospace" }}>
				#{value}
			</Text>
		),
	},
	{
		title: "Company",
		dataIndex: "name",
		sorter: (a, b) => a.name.localeCompare(b.name),
		render: (value: string, record) => (
			<Space direction="vertical" size={2}>
				<Text style={{ color: "#fff", fontWeight: 600 }}>{value}</Text>
				{record.countryCode && (
					<Text style={{ color: "#8c8c8c" }}>{record.countryCode}</Text>
				)}
			</Space>
		),
	},
	{
		title: "Status",
		dataIndex: "status",
		width: 120,
		sorter: (a, b) => a.status.localeCompare(b.status),
		filters: [
			{ text: "Pending", value: "PENDING" },
			{ text: "Processing", value: "PROCESSING" },
			{ text: "Done", value: "DONE" },
			{ text: "Error", value: "ERROR" },
		],
		onFilter: (value, record) => record.status === value,
		render: (value: DeepDiveStatus) => <DeepDiveStatusTag status={value} />,
	},
	{
		title: "Sources",
		dataIndex: "sourcesCount",
		width: 100,
		sorter: (a, b) => a.sourcesCount - b.sourcesCount,
		render: (value: number) => (
			<Text style={{ color: "#d9d9d9" }}>{value.toLocaleString()}</Text>
		),
	},
	{
		title: "Steps",
		key: "steps",
		width: 140,
		sorter: (a, b) => {
			const pctA = a.stepsTotal > 0 ? a.stepsDone / a.stepsTotal : 0;
			const pctB = b.stepsTotal > 0 ? b.stepsDone / b.stepsTotal : 0;
			return pctA - pctB;
		},
		render: (_, record) => {
			const pct =
				record.stepsTotal > 0
					? Math.round((record.stepsDone / record.stepsTotal) * 100)
					: 0;
			return (
				<Space size={8}>
					<Text style={{ color: "#d9d9d9", whiteSpace: "nowrap" }}>
						{record.stepsDone}/{record.stepsTotal}
					</Text>
					<Progress
						percent={pct}
						size="small"
						showInfo={false}
						strokeColor={pct === 100 ? "#52c41a" : "#1890ff"}
						style={{ width: 60, margin: 0 }}
					/>
				</Space>
			);
		},
	},
];

export default function CompaniesTable({
	reportId,
	companies,
	loading,
	basePath = "/deep-dive",
}: {
	reportId: number;
	companies: DeepDiveCompanyRow[];
	loading: boolean;
	basePath?: string;
}) {
	const { message } = App.useApp();
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
	const [downloading, setDownloading] = useState(false);
	const [addModalOpen, setAddModalOpen] = useState(false);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return companies;
		return companies.filter(
			(c) => c.name.toLowerCase().includes(q) || String(c.id).includes(q),
		);
	}, [companies, search]);

	const rowSelection: TableRowSelection<DeepDiveCompanyRow> = {
		selectedRowKeys,
		onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
		preserveSelectedRowKeys: true,
	};

	const handleDownloadReports = async () => {
		setDownloading(true);
		try {
			const params = new URLSearchParams();
			params.set("report_id", String(reportId));

			if (selectedRowKeys.length > 0) {
				params.set("company_ids", selectedRowKeys.join(","));
			}

			const response = await fetch(
				`/api/company-reports/download?${params.toString()}`,
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to download reports");
			}

			const blob = await response.blob();
			const contentDisposition = response.headers.get("Content-Disposition");
			const filename =
				contentDisposition?.match(/filename="?([^"]+)"?/)?.[1] ||
				`company_reports_${reportId}.zip`;

			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			message.success("Reports downloaded successfully");
		} catch (error) {
			console.error("Download error:", error);
			message.error(
				error instanceof Error ? error.message : "Failed to download reports",
			);
		} finally {
			setDownloading(false);
		}
	};

	return (
		<Card
			title={
				<Space>
					<span>Companies</span>
					{selectedRowKeys.length > 0 && (
						<Typography.Text type="secondary" style={{ fontWeight: 400 }}>
							({selectedRowKeys.length} selected)
						</Typography.Text>
					)}
				</Space>
			}
			style={DARK_CARD_STYLE}
			styles={{ header: DARK_CARD_HEADER_STYLE }}
			extra={
				<Space>
					<Tooltip
						title={
							<div>
								<div style={{ fontWeight: 600, marginBottom: 4 }}>
									Download Company Reports
								</div>
								<div>
									• Select companies using checkboxes to download specific
									reports
								</div>
								<div>• Or click without selection to download all reports</div>
								<div>• Reports will be downloaded as a ZIP archive</div>
							</div>
						}
						placement="bottomRight"
					>
						<Button
							icon={<DownloadOutlined />}
							onClick={handleDownloadReports}
							loading={downloading}
							disabled={companies.length === 0}
							type="primary"
							danger
							style={{
								fontWeight: 600,
								boxShadow: "0 0 12px rgba(255, 77, 79, 0.6)",
								animation: "pulse-glow 1.5s ease-in-out infinite",
							}}
							className="download-reports-btn"
						>
							{selectedRowKeys.length > 0
								? `Download Reports (${selectedRowKeys.length})`
								: "Download All Reports"}
						</Button>
					</Tooltip>
					<style jsx global>{`
            @keyframes pulse-glow {
              0%, 100% {
                box-shadow: 0 0 12px rgba(255, 77, 79, 0.6);
                transform: scale(1);
              }
              50% {
                box-shadow: 0 0 24px rgba(255, 77, 79, 0.9);
                transform: scale(1.02);
              }
            }
            .download-reports-btn:not(:disabled) {
              animation: pulse-glow 1.5s ease-in-out infinite !important;
            }
            .download-reports-btn:hover:not(:disabled) {
              box-shadow: 0 0 30px rgba(255, 77, 79, 1) !important;
            }
          `}</style>
					<Input
						placeholder="Search by name or ID"
						prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
						allowClear
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						style={{ width: 220 }}
					/>
					<Button icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
						Add Company
					</Button>
				</Space>
			}
		>
			<Table<DeepDiveCompanyRow>
				dataSource={filtered}
				rowKey="id"
				loading={loading}
				pagination={{ pageSize: 20 }}
				rowSelection={rowSelection}
				onRow={(record) => ({
					onClick: (e) => {
						const target = e.target as HTMLElement;
						if (
							target.closest(".ant-checkbox-wrapper") ||
							target.closest(".ant-checkbox")
						) {
							return;
						}
						router.push(`${basePath}/${reportId}/companies/${record.id}`);
					},
					style: { cursor: "pointer" },
				})}
				columns={columns}
			/>
			<AddCompanyModal
				reportId={reportId}
				open={addModalOpen}
				onClose={() => setAddModalOpen(false)}
			/>
		</Card>
	);
}
