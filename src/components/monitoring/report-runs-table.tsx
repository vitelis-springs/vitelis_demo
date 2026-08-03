"use client";

import { ExportOutlined } from "@ant-design/icons";
import {
	Button,
	Segmented,
	Space,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import Link from "next/link";
import { useMemo, useState } from "react";
import type {
	MonitorCompanyRow,
	MonitorReportRow,
	MonitorStepRow,
} from "../../hooks/api/useMonitoringService";
import DeepDiveStatusTag from "../deep-dive/status-tag";
import { DarkTableCard } from "../shared/table";
import {
	formatDateTime,
	formatDuration,
	formatTime,
} from "./monitoring-format";

const { Text } = Typography;

const PRODUCT_COLORS: Record<string, string> = {
	biz_miner: "blue",
	sales_miner: "purple",
};

const RUN_STATUS_COLORS: Record<string, string> = {
	running: "processing",
	error: "error",
	done: "success",
};

type RunFilter = "all" | "running" | "stuck" | "error";

const FILTER_OPTIONS = [
	{ label: "All", value: "all" },
	{ label: "Running", value: "running" },
	{ label: "Stuck", value: "stuck" },
	{ label: "Failed", value: "error" },
];

function productName(reportType: string | null): string {
	if (reportType === "biz_miner") return "BizMiner";
	if (reportType === "sales_miner") return "SalesMiner";
	return reportType ?? "—";
}

/** Compact "6 running · 2 failed · 8/17 done" cell, shared by every level. */
function CountsCell({ counts }: { counts: MonitorReportRow["counts"] }) {
	return (
		<Space size={8}>
			{counts.running > 0 ? (
				<Text style={{ color: "#58bfce", fontSize: 12 }}>
					{counts.running} running
				</Text>
			) : null}
			{counts.error > 0 ? (
				<Text style={{ color: "#ff4d4f", fontSize: 12 }}>
					{counts.error} failed
				</Text>
			) : null}
			<Text style={{ color: "#595959", fontSize: 12 }}>
				{counts.done}/{counts.total} done
			</Text>
		</Space>
	);
}

/** Steps of one company, rendered at the deepest expansion level. */
function StepsTable({ company }: { company: MonitorCompanyRow }) {
	const columns = [
		{
			title: "Step",
			key: "step",
			render: (_: unknown, step: MonitorStepRow) => (
				<div>
					<Text style={{ color: "#e0e0e0" }}>
						{step.stepOrder !== null ? `${step.stepOrder}. ` : ""}
						{step.stepName ?? `Step #${step.stepId}`}
					</Text>
					{step.workflowId ? null : (
						<Tooltip title="No workflow_id on this step, so it cannot be linked into n8n">
							<Tag style={{ marginLeft: 8 }}>unmapped</Tag>
						</Tooltip>
					)}
				</div>
			),
		},
		{
			title: "Status",
			key: "status",
			width: 160,
			render: (_: unknown, step: MonitorStepRow) => (
				<Space size={4}>
					<DeepDiveStatusTag status={step.status} />
					{step.isStuck ? (
						<Tooltip title="Running past the stuck threshold — the n8n run most likely died without writing back">
							<Tag color="volcano">stuck</Tag>
						</Tooltip>
					) : null}
				</Space>
			),
		},
		{
			title: "Started",
			dataIndex: "startedAt",
			key: "startedAt",
			width: 120,
			render: (value: string) => (
				<Tooltip title={formatDateTime(value)}>
					<Text style={{ color: "#8c8c8c", fontSize: 12 }}>
						{formatTime(value)}
					</Text>
				</Tooltip>
			),
		},
		{
			title: "Ended",
			dataIndex: "finishedAt",
			key: "finishedAt",
			width: 120,
			render: (value: string | null) => (
				<Tooltip title={formatDateTime(value)}>
					<Text style={{ color: "#8c8c8c", fontSize: 12 }}>
						{value ? formatTime(value) : "—"}
					</Text>
				</Tooltip>
			),
		},
		{
			title: "Duration",
			dataIndex: "durationMs",
			key: "durationMs",
			width: 110,
			render: (value: number, step: MonitorStepRow) => (
				<Text
					style={{
						color: step.status === "PROCESSING" ? "#58bfce" : "#8c8c8c",
						fontSize: 12,
					}}
				>
					{formatDuration(value)}
				</Text>
			),
		},
		{
			title: "n8n",
			key: "n8nUrl",
			width: 110,
			render: (_: unknown, step: MonitorStepRow) => {
				if (!step.n8nUrl) {
					return (
						<Text style={{ color: "#595959", fontSize: 12 }}>
							{step.executionId}
						</Text>
					);
				}

				return (
					<Tooltip title={`Open execution ${step.executionId}`}>
						<Button
							size="small"
							type="text"
							icon={<ExportOutlined />}
							href={step.n8nUrl}
							target="_blank"
							rel="noreferrer"
							style={{ color: "#58bfce" }}
						>
							{step.executionId}
						</Button>
					</Tooltip>
				);
			},
		},
	];

	return (
		<Table<MonitorStepRow>
			rowKey={(step) => `${company.key}:${step.stepId}`}
			columns={columns}
			dataSource={company.steps}
			size="small"
			pagination={false}
			style={{ background: "#161616" }}
		/>
	);
}

/** Companies of one report, expandable to that company's steps. */
function CompaniesTable({ report }: { report: MonitorReportRow }) {
	const columns = [
		{
			title: "Company",
			key: "company",
			render: (_: unknown, company: MonitorCompanyRow) => (
				<div>
					<Text style={{ color: "#e0e0e0" }}>
						{company.companyName ?? `Company #${company.companyId}`}
					</Text>
					<div>
						<Text style={{ color: "#595959", fontSize: 11 }}>
							#{company.companyId}
						</Text>
					</div>
				</div>
			),
		},
		{
			title: "Status",
			key: "status",
			width: 170,
			render: (_: unknown, company: MonitorCompanyRow) => (
				<Space size={4}>
					<Tag color={RUN_STATUS_COLORS[company.status] ?? "default"}>
						{company.status}
					</Tag>
					{company.stuck > 0 ? (
						<Tag color="volcano">{company.stuck} stuck</Tag>
					) : null}
				</Space>
			),
		},
		{
			title: "Steps",
			key: "counts",
			width: 190,
			render: (_: unknown, company: MonitorCompanyRow) => (
				<CountsCell counts={company.counts} />
			),
		},
		{
			title: "Started",
			dataIndex: "startedAt",
			key: "startedAt",
			width: 120,
			render: (value: string) => (
				<Tooltip title={formatDateTime(value)}>
					<Text style={{ color: "#8c8c8c", fontSize: 12 }}>
						{formatTime(value)}
					</Text>
				</Tooltip>
			),
		},
		{
			title: "Duration",
			dataIndex: "durationMs",
			key: "durationMs",
			width: 110,
			render: (value: number, company: MonitorCompanyRow) => (
				<Tooltip
					title={
						company.finishedAt
							? `Ended ${formatDateTime(company.finishedAt)}`
							: "Still running"
					}
				>
					<Text
						style={{
							color: company.status === "running" ? "#58bfce" : "#8c8c8c",
							fontSize: 12,
						}}
					>
						{formatDuration(value)}
					</Text>
				</Tooltip>
			),
		},
	];

	return (
		<Table<MonitorCompanyRow>
			rowKey="key"
			columns={columns}
			dataSource={report.companies}
			size="small"
			pagination={false}
			style={{ background: "#1a1a1a" }}
			expandable={{
				expandedRowRender: (company) => <StepsTable company={company} />,
				rowExpandable: (company) => company.steps.length > 0,
			}}
		/>
	);
}

interface ReportRunsTableProps {
	reports: MonitorReportRow[];
	loading: boolean;
}

export default function ReportRunsTable({
	reports,
	loading,
}: ReportRunsTableProps) {
	const [filter, setFilter] = useState<RunFilter>("all");

	const visibleReports = useMemo(() => {
		if (filter === "running") {
			return reports.filter((report) => report.counts.running > 0);
		}
		if (filter === "stuck") return reports.filter((report) => report.stuck > 0);
		if (filter === "error") {
			return reports.filter((report) => report.counts.error > 0);
		}
		return reports;
	}, [reports, filter]);

	const columns = useMemo(
		() => [
			{
				title: "Report",
				key: "report",
				render: (_: unknown, report: MonitorReportRow) => (
					<div>
						<Link href={report.reportHref} style={{ color: "#58bfce" }}>
							{report.reportName ?? `Report #${report.reportId}`}
						</Link>
						<div>
							<Text style={{ color: "#595959", fontSize: 11 }}>
								#{report.reportId}
							</Text>
						</div>
					</div>
				),
			},
			{
				title: "Product",
				dataIndex: "reportType",
				key: "reportType",
				width: 120,
				render: (value: string | null) =>
					value ? (
						<Tag color={PRODUCT_COLORS[value] ?? "default"}>
							{productName(value)}
						</Tag>
					) : (
						<Text style={{ color: "#595959" }}>—</Text>
					),
			},
			{
				title: "Companies",
				dataIndex: "companyCount",
				key: "companyCount",
				width: 120,
				render: (value: number) => (
					<Text style={{ color: "#e0e0e0" }}>
						{value} {value === 1 ? "company" : "companies"}
					</Text>
				),
			},
			{
				title: "Run",
				key: "status",
				width: 170,
				render: (_: unknown, report: MonitorReportRow) => (
					<Space size={4}>
						<Tag color={RUN_STATUS_COLORS[report.status] ?? "default"}>
							{report.status}
						</Tag>
						{report.stuck > 0 ? (
							<Tag color="volcano">{report.stuck} stuck</Tag>
						) : null}
					</Space>
				),
			},
			{
				title: "Steps",
				key: "counts",
				width: 190,
				render: (_: unknown, report: MonitorReportRow) => (
					<CountsCell counts={report.counts} />
				),
			},
			{
				title: "Started",
				dataIndex: "startedAt",
				key: "startedAt",
				width: 140,
				sorter: (a: MonitorReportRow, b: MonitorReportRow) =>
					a.startedAt.localeCompare(b.startedAt),
				render: (value: string) => (
					<Tooltip title={formatDateTime(value)}>
						<Text style={{ color: "#8c8c8c", fontSize: 12 }}>
							{formatTime(value)}
						</Text>
					</Tooltip>
				),
			},
			{
				title: "Duration",
				dataIndex: "durationMs",
				key: "durationMs",
				width: 120,
				sorter: (a: MonitorReportRow, b: MonitorReportRow) =>
					a.durationMs - b.durationMs,
				render: (value: number, report: MonitorReportRow) => (
					<Tooltip
						title={
							report.finishedAt
								? `Ended ${formatDateTime(report.finishedAt)}`
								: "Still running"
						}
					>
						<Text
							style={{
								color: report.status === "running" ? "#58bfce" : "#8c8c8c",
								fontSize: 12,
							}}
						>
							{formatDuration(value)}
						</Text>
					</Tooltip>
				),
			},
		],
		[],
	);

	return (
		<>
			<Space wrap style={{ marginBottom: 16 }}>
				<Segmented
					value={filter}
					options={FILTER_OPTIONS}
					onChange={(value) => setFilter(value as RunFilter)}
				/>
				<Text style={{ color: "#595959", fontSize: 12 }}>
					{visibleReports.length} of {reports.length} reports
				</Text>
			</Space>

			<DarkTableCard<MonitorReportRow>
				rowKey="key"
				columns={columns}
				dataSource={visibleReports}
				loading={loading && reports.length === 0}
				size="small"
				pagination={{ pageSize: 20, showSizeChanger: true }}
				expandable={{
					expandedRowRender: (report) => <CompaniesTable report={report} />,
					rowExpandable: (report) => report.companies.length > 0,
				}}
				locale={{ emptyText: "No report runs in the current window" }}
			/>
		</>
	);
}
