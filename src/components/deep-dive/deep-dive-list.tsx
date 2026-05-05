"use client";

import { FileExcelOutlined } from "@ant-design/icons";
import {
	Button,
	Card,
	DatePicker,
	Input,
	Select,
	Space,
	Table,
	Tag,
	Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import {
	type DeepDiveListItem,
	type DeepDiveStatus,
	useGetDeepDives,
} from "../../hooks/api/useDeepDiveService";
import useServerSortedTable from "../../hooks/useServerSortedTable";
import { ReportCostModal } from "../report-steps/ReportCostModal";
import CreateReportModal, { CloneReportButton } from "./create-report-modal";
import ExportXlsxModal from "./export-xlsx-modal";
import PageHeader from "./shared/page-header";
import DeepDivePageLayout from "./shared/page-layout";
import DeepDiveStatusTag from "./status-tag";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const STATUS_OPTIONS: Array<{ label: string; value: DeepDiveStatus | "" }> = [
	{ label: "All Statuses", value: "" },
	{ label: "Pending", value: "PENDING" },
	{ label: "Processing", value: "PROCESSING" },
	{ label: "Done", value: "DONE" },
	{ label: "Error", value: "ERROR" },
];

const REPORT_TYPE_OPTIONS: Array<{ label: string; value: string | "" }> = [
	{ label: "All Types", value: "" },
	{ label: "BizMiner", value: "biz_miner" },
	{ label: "SalesMiner", value: "sales_miner" },
	{ label: "Internal", value: "internal" },
];

/**
 * TODO(human): Implement renderBadges — render tag badges for a report row.
 *
 * @param record - a DeepDiveListItem with useCase, industryName, and settings fields
 * @returns JSX with Tag components for each available badge
 *
 * Design constraints:
 * - Use Ant Design <Tag> with color="cyan" for Use Case, color="green" for Industry,
 *   color="purple" for Settings — or choose your own color scheme
 * - Only render a tag if the value exists (non-null)
 * - Keep it compact: tags should be inline, small, with marginTop: 8
 */
function renderBadges(record: DeepDiveListItem): React.ReactNode {
	const tags: React.ReactNode[] = [];

	// TODO(human): Replace this placeholder with your badge implementation.
	// Use record.useCase, record.industryName, record.settings to render Tag components.
	// Example: if (record.useCase) tags.push(<Tag color="cyan" key="uc">{record.useCase.name}</Tag>);
	void record;
	void Tag;

	if (tags.length === 0) return null;
	return (
		<div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
			{tags}
		</div>
	);
}

interface DeepDiveListProps {
	fixedReportType?: string;
}

export default function DeepDiveList({ fixedReportType }: DeepDiveListProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const {
		page,
		pageSize,
		offset,
		sortBy,
		sortOrder,
		handleTableChange,
		resetPage,
	} = useServerSortedTable({
		defaultPageSize: 20,
		defaultSortBy: "id",
		defaultSortOrder: "desc",
	});
	const [searchText, setSearchText] = useState("");
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState<DeepDiveStatus | "">("");
	const [useCaseId, setUseCaseId] = useState<number | undefined>(undefined);
	const [industryId, setIndustryId] = useState<number | undefined>(undefined);
	const [reportType, setReportType] = useState<string | undefined>(
		fixedReportType,
	);
	const [cloneFromId, setCloneFromId] = useState<number | null>(null);
	const [xlsxModalOpen, setXlsxModalOpen] = useState(false);

	const createdFromParam = searchParams.get("createdFrom");
	const createdToParam = searchParams.get("createdTo");
	const createdRange: [Dayjs | null, Dayjs | null] | null =
		createdFromParam || createdToParam
			? [
					createdFromParam ? dayjs(createdFromParam) : null,
					createdToParam ? dayjs(createdToParam) : null,
				]
			: null;

	const setCreatedRange = (range: [Dayjs | null, Dayjs | null] | null) => {
		const params = new URLSearchParams(searchParams.toString());
		if (range?.[0]) {
			params.set("createdFrom", range[0].toISOString());
		} else {
			params.delete("createdFrom");
		}
		if (range?.[1]) {
			params.set("createdTo", range[1].endOf("day").toISOString());
		} else {
			params.delete("createdTo");
		}
		router.replace(`${pathname}?${params.toString()}`);
	};

	const { data, isLoading } = useGetDeepDives({
		limit: pageSize,
		offset,
		q: query || undefined,
		status: status || undefined,
		useCaseId,
		industryId,
		reportType,
		sortBy,
		sortOrder,
		createdFrom: createdFromParam ?? undefined,
		createdTo: createdToParam ?? undefined,
	});

	const items = data?.data.items ?? [];
	const total = data?.data.total ?? 0;
	const filters = data?.data.filters;
	const useCasesForModal = filters?.useCases ?? [];

	const pageTitle =
		fixedReportType === "biz_miner"
			? "Biz Miner Reports"
			: fixedReportType === "sales_miner"
				? "Sales Miner Reports"
				: fixedReportType === "internal"
					? "Vitelis Sales Reports"
					: "Deep Dive Admin";

	const useCaseOptions = useMemo(
		() => [
			{ label: "All Use Cases", value: 0 },
			...(filters?.useCases.map((uc) => ({ label: uc.name, value: uc.id })) ??
				[]),
		],
		[filters?.useCases],
	);

	const industryOptions = useMemo(
		() => [
			{ label: "All Industries", value: 0 },
			...(filters?.industries.map((ind) => ({
				label: ind.name,
				value: ind.id,
			})) ?? []),
		],
		[filters?.industries],
	);

	const columns = useMemo(
		() => [
			{
				title: "ID",
				dataIndex: "id",
				key: "id",
				width: 70,
				sorter: true,
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
				sorter: true,
				render: (_: unknown, record: DeepDiveListItem) => (
					<div>
						<Text strong style={{ color: "#e0e0e0", fontSize: 15 }}>
							{record.name || `Deep Dive #${record.id}`}
						</Text>
						{record.description && (
							<div
								style={{
									color: "#8c8c8c",
									fontSize: 13,
									marginTop: 2,
									maxWidth: 500,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
							>
								{record.description}
							</div>
						)}
						{renderBadges(record)}
					</div>
				),
			},
			...(!fixedReportType
				? [
						{
							title: "Type",
							dataIndex: "reportType",
							key: "reportType",
							width: 130,
							render: (value: string | null) => {
								if (!value) return <Text style={{ color: "#8c8c8c" }}>—</Text>;
								const colors: Record<string, string> = {
									biz_miner: "blue",
									sales_miner: "green",
									internal: "purple",
								};
								const labels: Record<string, string> = {
									biz_miner: "BizMiner",
									sales_miner: "SalesMiner",
									internal: "Internal",
								};
								return (
									<Tag color={colors[value] ?? "default"}>
										{labels[value] ?? value}
									</Tag>
								);
							},
						},
					]
				: []),
			{
				title: "Status",
				dataIndex: "status",
				key: "status",
				width: 120,
				render: (value: DeepDiveStatus) => <DeepDiveStatusTag status={value} />,
			},
			{
				title: "Stats",
				key: "stats",
				width: 140,
				render: (_: unknown, record: DeepDiveListItem) => (
					<div style={{ lineHeight: 1.6 }}>
						<div style={{ color: "#d9d9d9", fontSize: 13 }}>
							{record.counts.companies}{" "}
							{record.counts.companies === 1 ? "company" : "companies"}
						</div>
						<div style={{ color: "#8c8c8c", fontSize: 12 }}>
							{record.counts.steps}{" "}
							{record.counts.steps === 1 ? "step" : "steps"}
						</div>
					</div>
				),
			},
			{
				title: "Cost",
				key: "cost",
				width: 130,
				render: (_: unknown, record: DeepDiveListItem) => {
					const totalCost = record.cost?.totalCost ?? 0;
					const hasNoPricing = (record.cost?.callsWithoutPricing ?? 0) > 0;
					return (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 6,
								whiteSpace: "nowrap",
							}}
						>
							{totalCost > 0 ? (
								<>
									<Text
										strong
										style={{
											fontSize: 13,
											color: hasNoPricing ? "#faad14" : "#52c41a",
										}}
										title={
											hasNoPricing
												? "Some calls have no pricing data"
												: undefined
										}
									>
										{totalCost < 0.001
											? `$${totalCost.toFixed(6)}`
											: totalCost < 0.01
												? `$${totalCost.toFixed(4)}`
												: `$${totalCost.toFixed(3)}`}
									</Text>
									<ReportCostModal reportId={record.id} />
								</>
							) : (
								<Text style={{ color: "#595959", fontSize: 12 }}>—</Text>
							)}
						</div>
					);
				},
			},
			{
				title: "Created",
				dataIndex: "createdAt",
				key: "created_at",
				width: 140,
				sorter: true,
				render: (value: string | null) => (
					<Text style={{ color: "#8c8c8c", fontSize: 13 }}>
						{value ? dayjs(value).format("D MMM YYYY") : "—"}
					</Text>
				),
			},
			{
				title: "Updated",
				dataIndex: "updatedAt",
				key: "updated_at",
				width: 140,
				sorter: true,
				render: (value: string | null) => (
					<Text style={{ color: "#8c8c8c", fontSize: 13 }}>
						{value ? dayjs(value).format("D MMM YYYY") : "—"}
					</Text>
				),
			},
			...(fixedReportType === "biz_miner" || fixedReportType === "sales_miner"
				? [
						{
							title: "",
							key: "actions",
							width: 48,
							render: (_: unknown, record: DeepDiveListItem) => (
								<CloneReportButton onClone={() => setCloneFromId(record.id)} />
							),
						},
					]
				: []),
		],
		[fixedReportType],
	);

	const getRecordHref = useCallback(
		(record: DeepDiveListItem) => {
			const type = fixedReportType ?? record.reportType;
			if (type === "biz_miner") return `/biz-miner/${record.id}`;
			if (type === "sales_miner") return `/sales-miner/${record.id}`;
			if (type === "internal") return `/vitelis-sales/${record.id}`;
			return `/deep-dive/${record.id}`;
		},
		[fixedReportType],
	);

	const handleSearch = () => {
		resetPage();
		setQuery(searchText.trim());
	};

	return (
		<DeepDivePageLayout>
			<PageHeader
				breadcrumbs={[{ label: pageTitle }]}
				title={pageTitle}
				extra={
					fixedReportType === "biz_miner" ||
					fixedReportType === "sales_miner" ? (
						<>
							{fixedReportType === "biz_miner" && (
								<>
									<Button
										onClick={() => router.push("/biz-miner/company-reports")}
									>
										Company Reports
									</Button>
									<Button
										icon={<FileExcelOutlined />}
										onClick={() => setXlsxModalOpen(true)}
									>
										Export XLSX Report
									</Button>
								</>
							)}
							<CreateReportModal
								reportType={fixedReportType}
								useCases={useCasesForModal}
							/>
							{cloneFromId !== null && (
								<CreateReportModal
									reportType={fixedReportType}
									useCases={useCasesForModal}
									cloneFromId={cloneFromId}
									onCloneClose={() => setCloneFromId(null)}
								/>
							)}
						</>
					) : (
						<Text style={{ color: "#8c8c8c" }}>
							Track progress, queries, and company statuses
						</Text>
					)
				}
			/>

			<Card
				style={{ ...DARK_CARD_STYLE, marginBottom: 16 }}
				styles={{ body: { padding: 16 } }}
			>
				<Space wrap size="middle" style={{ width: "100%" }}>
					<Input.Search
						value={searchText}
						onChange={(event) => setSearchText(event.target.value)}
						onSearch={handleSearch}
						placeholder="Search deep dives"
						allowClear
						style={{ width: 260 }}
					/>
					<Select
						value={status}
						onChange={(v) => {
							resetPage();
							setStatus(v);
						}}
						options={STATUS_OPTIONS}
						style={{ width: 160 }}
					/>
					{!fixedReportType && (
						<Select
							value={reportType ?? ""}
							onChange={(v) => {
								resetPage();
								setReportType(v || undefined);
							}}
							options={REPORT_TYPE_OPTIONS}
							style={{ width: 160 }}
						/>
					)}
					<Select
						value={useCaseId ?? 0}
						onChange={(v) => {
							resetPage();
							setUseCaseId(v || undefined);
						}}
						options={useCaseOptions}
						style={{ width: 200 }}
					/>
					<Select
						value={industryId ?? 0}
						onChange={(v) => {
							resetPage();
							setIndustryId(v || undefined);
						}}
						options={industryOptions}
						style={{ width: 200 }}
					/>
					<RangePicker
						value={createdRange}
						onChange={(range) => {
							resetPage();
							setCreatedRange(range);
						}}
						placeholder={["Created from", "Created to"]}
						style={{ width: 280 }}
					/>
				</Space>
			</Card>

			<Card style={DARK_CARD_STYLE} styles={{ body: { padding: 0 } }}>
				<Table
					dataSource={items}
					columns={columns}
					rowKey="id"
					loading={isLoading}
					onChange={handleTableChange}
					pagination={{
						current: page,
						pageSize,
						total,
						showSizeChanger: true,
						pageSizeOptions: ["10", "20", "50"],
					}}
					style={{ background: "#1f1f1f" }}
					onRow={(record) => ({
						onClick: (e) => {
							const target = e.target as HTMLElement;
							if (
								target.closest(
									'button, a, .ant-modal-root, [role="button"], .ant-select, .ant-dropdown',
								)
							)
								return;
							router.push(getRecordHref(record));
						},
						style: { cursor: "pointer" },
					})}
					rowClassName={() => "deep-dive-row"}
				/>
				<style jsx global>{`
          .deep-dive-row:hover td { background: #2a2a2a !important; }
          .deep-dive-row td { transition: background 0.2s ease; }
        `}</style>
			</Card>

			{fixedReportType === "biz_miner" && (
				<ExportXlsxModal
					open={xlsxModalOpen}
					onClose={() => setXlsxModalOpen(false)}
				/>
			)}
		</DeepDivePageLayout>
	);
}
