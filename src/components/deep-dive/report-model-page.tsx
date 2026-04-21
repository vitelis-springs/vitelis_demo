"use client";

import {
	DeleteOutlined,
	EditOutlined,
	ImportOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import {
	App,
	Button,
	Card,
	Col,
	Input,
	InputNumber,
	Modal,
	Result,
	Row,
	Segmented,
	Space,
	Spin,
	Switch,
	Table,
	Tabs,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import {
	useGetReportModel,
	useCreateReportModelItem,
	useDeleteReportModelItem,
	useUpdateReportModelItem,
	useReplaceReportModel,
	type ReportModelItem,
} from "../../hooks/api/useDeepDiveService";
import { buildReportHref, resolveReportSection } from "./shared/report-route";
import DeepDivePageLayout from "./shared/page-layout";
import JsonEditor from "./json-editor";
import KpiModelImport, { type KpiModelImportHandle } from "./kpi-model-import";
import PageHeader from "./shared/page-header";
import StatCard from "./shared/stat-card";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const BASE_COLUMN_MIN_WIDTH = 180;
const WIDE_COLUMN_MIN_WIDTH = 280;
const COMPACT_DYNAMIC_COLUMN_WIDTHS: Record<string, number> = {
	index: 96,
	"KPI Category": 140,
};

interface ReportModelPageProps {
	reportId: number;
	backHref?: string;
}

interface ReportModelItemModalProps {
	open: boolean;
	title: string;
	okText: string;
	confirmLoading: boolean;
	dataPointId?: string;
	initialName: string;
	initialSettings: Record<string, unknown>;
	requiredFields?: string[];
	onCancel: () => void;
	onSubmit: (payload: {
		name: string;
		settings: Record<string, unknown>;
	}) => Promise<void>;
}

const REQUIRED_KPI_CREATE_FIELDS = [
	"Name",
	"KPI Category",
	"Key question",
	"Quality Criteria (1 = Low)",
	"Quality Criteria (2 = Low-Medium)",
	"Quality Criteria (3 = Medium)",
	"Quality Criteria (4 = Medium-High)",
	"Quality Criteria (5 = High)",
	"ID",
] as const;

function hasExistingKpi(items: ReportModelItem[]): boolean {
	return items.some((item) => item.type?.startsWith("kpi_"));
}

function hasExistingRdp(items: ReportModelItem[]): boolean {
	return items.some((item) => item.type === "raw_data_point");
}

function getTypeTagColor(type: string | null): string {
	if (type === "kpi_category") return "gold";
	if (type === "kpi_driver") return "blue";
	if (type === "raw_data_point") return "green";
	return "default";
}

function stringifyCellValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean")
		return String(value);

	if (Array.isArray(value)) {
		return value
			.map((item) => stringifyCellValue(item))
			.filter(Boolean)
			.join(", ");
	}

	if (typeof value === "object") {
		try {
			return JSON.stringify(value);
		} catch {
			return "[object]";
		}
	}

	return String(value);
}

function getCellColumnWidth(values: unknown[]): number {
	const hasComplexValue = values.some(
		(value) => Array.isArray(value) || (!!value && typeof value === "object"),
	);

	if (hasComplexValue) return WIDE_COLUMN_MIN_WIDTH;

	const maxLength = values.reduce<number>((acc, value) => {
		return Math.max(acc, stringifyCellValue(value).length);
	}, 0);

	if (maxLength > 80) return WIDE_COLUMN_MIN_WIDTH;
	if (maxLength > 35) return 220;
	return BASE_COLUMN_MIN_WIDTH;
}

function renderDynamicValue(value: unknown) {
	if (value === null || value === undefined || value === "") {
		return <Text style={{ color: "#8c8c8c" }}>—</Text>;
	}

	if (typeof value === "boolean") {
		return (
			<Tag color={value ? "success" : "error"}>{value ? "true" : "false"}</Tag>
		);
	}

	if (typeof value === "number") {
		return <Text style={{ color: "#d9d9d9" }}>{value}</Text>;
	}

	const text = stringifyCellValue(value);

	return (
		<Tooltip title={text} placement="topLeft">
			<Paragraph
				style={{ marginBottom: 0, color: "#d9d9d9" }}
				ellipsis={{ rows: 4, expandable: true }}
			>
				{text}
			</Paragraph>
		</Tooltip>
	);
}

function parseSettingsObject(value: string): Record<string, unknown> | null {
	try {
		const parsed = value.trim() ? JSON.parse(value) : {};
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
			return null;
		return parsed as Record<string, unknown>;
	} catch {
		return null;
	}
}

function stringifySettingsObject(value: Record<string, unknown>): string {
	return JSON.stringify(value, null, 2);
}

function getEmptyValueFromTemplate(
	value: unknown,
	fallbackNumber?: number,
): unknown {
	if (typeof value === "string") return "";
	if (typeof value === "number") return fallbackNumber ?? value;
	if (typeof value === "boolean") return false;
	if (Array.isArray(value)) return [];
	if (value && typeof value === "object") return {};
	return null;
}

function buildSettingsTemplate(
	templateItem: ReportModelItem | undefined,
	typeItems: ReportModelItem[],
): Record<string, unknown> {
	if (!templateItem?.settings) return {};

	const nextIndex =
		Math.max(
			0,
			...typeItems.map((item) =>
				typeof item.settings?.index === "number" ? item.settings.index : 0,
			),
		) + 1;

	return Object.fromEntries(
		Object.entries(templateItem.settings).map(([key, value]) => [
			key,
			getEmptyValueFromTemplate(value, key === "index" ? nextIndex : undefined),
		]),
	);
}

function getNextTypeIndex(typeItems: ReportModelItem[]): number {
	return (
		Math.max(
			0,
			...typeItems.map((item) =>
				typeof item.settings?.index === "number" ? item.settings.index : 0,
			),
		) + 1
	);
}

function buildTypeColumns(
	typeItems: ReportModelItem[],
	isUpdating: boolean,
	onEdit: (item: ReportModelItem) => void,
	onDelete: (item: ReportModelItem) => void,
	onToggleInclude: (
		dataPointId: string,
		includeToReport: boolean,
	) => Promise<void>,
) {
	const dynamicKeys = Array.from(
		typeItems.reduce((keys, item) => {
			Object.keys(item.settings ?? {}).forEach((key) => keys.add(key));
			return keys;
		}, new Set<string>()),
	);

	return [
		{
			title: "Actions",
			key: "actions",
			width: 84,
			fixed: "left" as const,
			render: (_value: unknown, row: ReportModelItem) => (
				<Space size={8}>
					<Button
						size="small"
						icon={<EditOutlined />}
						disabled={isUpdating}
						onClick={() => onEdit(row)}
					/>
					{row.type !== "kpi_category" ? (
						<Button
							size="small"
							danger
							icon={<DeleteOutlined />}
							disabled={isUpdating}
							onClick={() => onDelete(row)}
						/>
					) : null}
				</Space>
			),
		},
		{
			title: "Include",
			key: "includeToReport",
			dataIndex: "includeToReport",
			width: 88,
			fixed: "left" as const,
			render: (value: boolean, row: ReportModelItem) => (
				<Switch
					checked={value}
					checkedChildren="on"
					unCheckedChildren="off"
					disabled={isUpdating}
					onChange={(checked) => {
						void onToggleInclude(row.dataPointId, checked);
					}}
				/>
			),
		},
		{
			title: "ID",
			key: "dataPointId",
			width: 180,
			fixed: "left" as const,
			render: (_value: unknown, row: ReportModelItem) => (
				<Text code style={{ color: "#d9d9d9" }}>
					{row.dataPointId}
				</Text>
			),
		},
		{
			title: "Name",
			key: "name",
			dataIndex: "name",
			width: 320,
			fixed: "left" as const,
			render: (value: string | null) => (
				<Paragraph
					style={{ marginBottom: 0, color: value ? "#d9d9d9" : "#8c8c8c" }}
					ellipsis={{ rows: 3, expandable: true }}
				>
					{value || "—"}
				</Paragraph>
			),
		},
		{
			title: "Manual",
			key: "manualMethod",
			dataIndex: "manualMethod",
			width: 92,
			render: (value: boolean | null) =>
				value === null ? (
					<Text style={{ color: "#8c8c8c" }}>—</Text>
				) : (
					<Tag color={value ? "gold" : "default"}>
						{value ? "manual" : "auto"}
					</Tag>
				),
		},
		...dynamicKeys.map((key) => ({
			title: key,
			key,
			width:
				COMPACT_DYNAMIC_COLUMN_WIDTHS[key] ??
				getCellColumnWidth(typeItems.map((item) => item.settings?.[key])),
			render: (_value: unknown, row: ReportModelItem) =>
				renderDynamicValue(row.settings?.[key]),
		})),
	];
}

function ReportModelItemModal({
	open,
	title,
	okText,
	confirmLoading,
	dataPointId,
	initialName,
	initialSettings,
	requiredFields = [],
	onCancel,
	onSubmit,
}: ReportModelItemModalProps) {
	const { message } = App.useApp();
	const [name, setName] = useState(initialName);
	const [settingsObj, setSettingsObj] =
		useState<Record<string, unknown>>(initialSettings);
	const [settingsJson, setSettingsJson] = useState("{}");
	const [mode, setMode] = useState<"fields" | "json">("fields");

	useEffect(() => {
		if (!open) return;
		setName(initialName);
		setSettingsObj(initialSettings);
		setSettingsJson(stringifySettingsObject(initialSettings));
		setMode("fields");
	}, [initialName, initialSettings, open]);

	const handleSettingsFieldChange = (key: string, value: unknown) => {
		setSettingsObj((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	const handleModeChange = (value: "fields" | "json") => {
		if (value === "fields") {
			const parsed = parseSettingsObject(settingsJson);
			if (!parsed) {
				void message.error("Fix invalid JSON before switching to fields");
				return;
			}
			setSettingsObj(parsed);
		} else {
			setSettingsJson(stringifySettingsObject(settingsObj));
		}

		setMode(value);
	};

	const handleOk = async () => {
		let parsedSettings = settingsObj;
		if (mode === "json") {
			const parsed = parseSettingsObject(settingsJson);
			if (!parsed) {
				void message.error("Settings JSON is invalid");
				return;
			}
			parsedSettings = parsed;
		}

		const missingFields = requiredFields.filter((field) => {
			if (field === "Name") return !name.trim();
			if (field === "ID") return !dataPointId?.trim();

			const value = parsedSettings[field];
			if (typeof value === "string") return !value.trim();
			if (value === null || value === undefined) return true;
			if (Array.isArray(value)) return value.length === 0;
			return false;
		});

		if (missingFields.length > 0) {
			void message.error(`Fill required fields: ${missingFields.join(", ")}`);
			return;
		}

		await onSubmit({
			name,
			settings: parsedSettings,
		});
	};

	return (
		<Modal
			title={title}
			open={open}
			onCancel={onCancel}
			onOk={() => void handleOk()}
			okText={okText}
			width={900}
			confirmLoading={confirmLoading}
			destroyOnHidden
		>
			<Space direction="vertical" size="middle" style={{ width: "100%" }}>
				{dataPointId ? (
					<div>
						<Text
							style={{ color: "#8c8c8c", display: "block", marginBottom: 8 }}
						>
							ID
							{requiredFields.includes("ID") ? (
								<Text style={{ color: "#ff4d4f" }}> *</Text>
							) : null}
						</Text>
						<Input value={dataPointId} readOnly />
					</div>
				) : null}
				<div>
					<Text style={{ color: "#8c8c8c", display: "block", marginBottom: 8 }}>
						Name
						{requiredFields.includes("Name") ? (
							<Text style={{ color: "#ff4d4f" }}> *</Text>
						) : null}
					</Text>
					<Input
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Model item name"
					/>
				</div>
				<div>
					<Space
						align="center"
						style={{
							width: "100%",
							justifyContent: "space-between",
							marginBottom: 8,
						}}
					>
						<Text style={{ color: "#8c8c8c" }}>Settings</Text>
						<Segmented<"fields" | "json">
							value={mode}
							options={[
								{ label: "Fields", value: "fields" },
								{ label: "JSON", value: "json" },
							]}
							onChange={handleModeChange}
						/>
					</Space>

					{mode === "json" ? (
						<JsonEditor
							value={settingsJson}
							onChange={setSettingsJson}
							height="calc(90vh - 420px)"
						/>
					) : (
						<Space direction="vertical" size="middle" style={{ width: "100%" }}>
							{Object.entries(settingsObj).map(([key, value]) => {
								const inputKey = `${dataPointId ?? title}-${key}`;

								if (typeof value === "boolean") {
									return (
										<div key={inputKey}>
											<Text
												style={{
													color: "#8c8c8c",
													display: "block",
													marginBottom: 8,
												}}
											>
												{key}
												{requiredFields.includes(key) ? (
													<Text style={{ color: "#ff4d4f" }}> *</Text>
												) : null}
											</Text>
											<Switch
												checked={value}
												onChange={(checked) =>
													handleSettingsFieldChange(key, checked)
												}
											/>
										</div>
									);
								}

								if (typeof value === "number") {
									return (
										<div key={inputKey}>
											<Text
												style={{
													color: "#8c8c8c",
													display: "block",
													marginBottom: 8,
												}}
											>
												{key}
												{requiredFields.includes(key) ? (
													<Text style={{ color: "#ff4d4f" }}> *</Text>
												) : null}
											</Text>
											<InputNumber
												value={value}
												onChange={(nextValue) =>
													handleSettingsFieldChange(key, nextValue ?? null)
												}
												style={{ width: "100%" }}
											/>
										</div>
									);
								}

								if (typeof value === "string" || value === null) {
									return (
										<div key={inputKey}>
											<Text
												style={{
													color: "#8c8c8c",
													display: "block",
													marginBottom: 8,
												}}
											>
												{key}
												{requiredFields.includes(key) ? (
													<Text style={{ color: "#ff4d4f" }}> *</Text>
												) : null}
											</Text>
											<Input
												value={value ?? ""}
												onChange={(event) =>
													handleSettingsFieldChange(key, event.target.value)
												}
											/>
										</div>
									);
								}

								return (
									<div key={inputKey}>
										<Text
											style={{
												color: "#8c8c8c",
												display: "block",
												marginBottom: 8,
											}}
										>
											{key}
											{requiredFields.includes(key) ? (
												<Text style={{ color: "#ff4d4f" }}> *</Text>
											) : null}
										</Text>
										<TextArea
											rows={4}
											value={JSON.stringify(value, null, 2)}
											onChange={(event) => {
												try {
													handleSettingsFieldChange(
														key,
														JSON.parse(event.target.value),
													);
												} catch {
													handleSettingsFieldChange(key, event.target.value);
												}
											}}
										/>
									</div>
								);
							})}
						</Space>
					)}
				</div>
			</Space>
		</Modal>
	);
}

export default function ReportModelPage({
	reportId,
	backHref,
}: ReportModelPageProps) {
	const { message, modal } = App.useApp();
	const router = useRouter();
	const importRef = useRef<KpiModelImportHandle>(null);
	const [searchValue, setSearchValue] = useState("");
	const [isImportButtonLoading, setIsImportButtonLoading] = useState(false);
	const [activeType, setActiveType] = useState("");
	const [editingItem, setEditingItem] = useState<ReportModelItem | null>(null);
	const [creatingItem, setCreatingItem] = useState<{
		type: "kpi_driver" | "raw_data_point";
		dataPointId: string;
		initialSettings: Record<string, unknown>;
	} | null>(null);
	const deferredSearchValue = useDeferredValue(
		searchValue.trim().toLowerCase(),
	);

	const { data, error, isLoading, isFetching, refetch } =
		useGetReportModel(reportId);
	const replaceModel = useReplaceReportModel(reportId);
	const createModelItem = useCreateReportModelItem(reportId);
	const updateModelItem = useUpdateReportModelItem(reportId);
	const deleteModelItem = useDeleteReportModelItem(reportId);

	const reportSection = resolveReportSection(backHref);
	const reportHref = backHref ?? buildReportHref(backHref, reportId);
	const reportName = data?.data.report.name ?? `Report #${reportId}`;
	const useCaseName = data?.data.report.useCase?.name ?? null;
	const reportPrefix = data?.data.report.prefix ?? reportId * 1000000;
	const items = data?.data.items ?? [];
	const summary = data?.data.summary;
	const importDisabled = hasExistingKpi(items) && hasExistingRdp(items);
	const kpiItems = items.filter((item) => item.type === "kpi_driver");
	const rdpItems = items.filter((item) => item.type === "raw_data_point");
	const kpiTemplateItem = kpiItems[0];
	const rdpTemplateItem = rdpItems[0];

	const filteredItems = deferredSearchValue
		? items.filter((item) =>
				[
					item.dataPointId,
					item.name ?? "",
					item.type ?? "",
					item.manualMethod === null
						? ""
						: item.manualMethod
							? "manual"
							: "auto",
					...Object.values(item.settings ?? {}).map((value) =>
						stringifyCellValue(value),
					),
				].some((value) => value.toLowerCase().includes(deferredSearchValue)),
			)
		: items;

	const typeOrder = (summary?.byType ?? []).map((item) => item.type);
	const itemsByType = new Map<string, ReportModelItem[]>();

	filteredItems.forEach((item) => {
		const type = item.type ?? "unknown";
		const typeItems = itemsByType.get(type);
		if (typeItems) {
			typeItems.push(item);
			return;
		}

		itemsByType.set(type, [item]);
	});

	const visibleTypes = typeOrder.filter((type) => itemsByType.has(type));

	useEffect(() => {
		if (!visibleTypes.length) {
			setActiveType("");
			return;
		}

		if (!activeType || !visibleTypes.includes(activeType)) {
			setActiveType(visibleTypes[0] ?? "");
		}
	}, [activeType, visibleTypes]);

	const handleToggleInclude = async (
		dataPointId: string,
		includeToReport: boolean,
	) => {
		try {
			await replaceModel.mutateAsync({
				rows: items.map((item) => ({
					dataPointId: item.dataPointId,
					includeToReport:
						item.dataPointId === dataPointId
							? includeToReport
							: item.includeToReport,
				})),
			});
			void message.success("Model row updated");
		} catch {
			void message.error("Failed to update model row");
		}
	};

	const handleOpenEdit = (item: ReportModelItem) => {
		setEditingItem(item);
	};

	const handleCloseEdit = () => {
		setEditingItem(null);
	};

	const handleSaveEdit = async (payload: {
		name: string;
		settings: Record<string, unknown>;
	}) => {
		if (!editingItem) return;

		try {
			await updateModelItem.mutateAsync({
				dataPointId: editingItem.dataPointId,
				name: payload.name,
				settings: payload.settings,
			});
			void message.success("Model item updated");
			handleCloseEdit();
		} catch {
			void message.error("Failed to update model item");
		}
	};

	const handleDelete = (item: ReportModelItem) => {
		const noun = item.type === "kpi_driver" ? "driver" : "model item";

		const dependentKpis =
			item.type === "raw_data_point"
				? kpiItems.filter((kpi) => {
						const deps = kpi.settings?.["Dependencies"];
						return (
							Array.isArray(deps) &&
							(deps as unknown[]).includes(item.dataPointId)
						);
					})
				: [];

		const warningContent =
			dependentKpis.length > 0 ? (
				<Space direction="vertical" size={4}>
					<Text>
						This will remove the item from the report model and delete its
						results for all companies in this report.
					</Text>
					<Text style={{ color: "#faad14" }}>
						⚠ The following KPI drivers reference this RDP in their
						Dependencies:
					</Text>
					<ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
						{dependentKpis.map((kpi) => (
							<li key={kpi.dataPointId}>
								<Text code style={{ fontSize: 12 }}>
									{kpi.dataPointId}
								</Text>
								{kpi.name ? (
									<Text
										style={{ color: "#8c8c8c", marginLeft: 8, fontSize: 12 }}
									>
										{kpi.name}
									</Text>
								) : null}
							</li>
						))}
					</ul>
				</Space>
			) : item.type === "kpi_driver" ? (
				"When deleting this driver, results for all companies will also be deleted."
			) : (
				"This will remove the item from the report model and delete its results for all companies in this report."
			);

		modal.confirm({
			title: `Delete ${noun}?`,
			content: warningContent,
			okText: "Delete",
			okButtonProps: { danger: true },
			onOk: async () => {
				try {
					await deleteModelItem.mutateAsync(item.dataPointId);
					void message.success("Model item deleted");
				} catch {
					void message.error("Failed to delete model item");
				}
			},
		});
	};

	const handleOpenCreate = (type: "kpi_driver" | "raw_data_point") => {
		const templateItem =
			type === "kpi_driver" ? kpiTemplateItem : rdpTemplateItem;
		const typeItems = type === "kpi_driver" ? kpiItems : rdpItems;
		const initialSettings = buildSettingsTemplate(templateItem, typeItems);
		const nextIndex = getNextTypeIndex(typeItems);
		const nextDataPointId =
			type === "kpi_driver"
				? `kpi_driver_${nextIndex}`
				: `raw_data_point_${nextIndex}`;

		setCreatingItem({
			type,
			dataPointId: nextDataPointId,
			initialSettings,
		});
	};

	const handleCloseCreate = () => {
		setCreatingItem(null);
	};

	const handleSaveCreate = async (payload: {
		name: string;
		settings: Record<string, unknown>;
	}) => {
		if (!creatingItem) return;

		try {
			await createModelItem.mutateAsync({
				dataPointId: creatingItem.dataPointId,
				type: creatingItem.type,
				name: payload.name,
				settings: payload.settings,
			});
			void message.success(
				creatingItem.type === "kpi_driver" ? "KPI created" : "RDP created",
			);
			handleCloseCreate();
		} catch {
			void message.error("Failed to create model item");
		}
	};

	if (isLoading) {
		return (
			<DeepDivePageLayout maxWidth="none">
				<PageHeader
					breadcrumbs={[
						reportSection,
						{ label: `Report #${reportId}`, href: reportHref },
						{ label: "Model" },
					]}
					title={`KPI Model — Report #${reportId}`}
				/>
				<div
					style={{
						minHeight: 360,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Spin size="large" />
				</div>
			</DeepDivePageLayout>
		);
	}

	if (error || !data) {
		return (
			<DeepDivePageLayout maxWidth="none">
				<PageHeader
					breadcrumbs={[
						reportSection,
						{ label: `Report #${reportId}`, href: reportHref },
						{ label: "Model" },
					]}
					title={`KPI Model — Report #${reportId}`}
				/>
				<Result
					status="error"
					title="Failed to load report model"
					subTitle="The report model could not be loaded."
					extra={
						<Space>
							<Button onClick={() => void refetch()} icon={<ReloadOutlined />}>
								Retry
							</Button>
							<Button type="primary" onClick={() => router.push(reportHref)}>
								Back to report
							</Button>
						</Space>
					}
				/>
			</DeepDivePageLayout>
		);
	}

	return (
		<DeepDivePageLayout maxWidth="none">
			<PageHeader
				breadcrumbs={[
					reportSection,
					{ label: reportName, href: reportHref },
					{ label: "Model" },
				]}
				title={`KPI Model — ${reportName}`}
				extra={
					<Space wrap>
						<Button
							type="primary"
							icon={<ImportOutlined />}
							onClick={() => importRef.current?.openFileDialog()}
							disabled={importDisabled}
							loading={isImportButtonLoading}
						>
							Import XLSX
						</Button>
						<Button
							icon={<ReloadOutlined />}
							onClick={() => void refetch()}
							loading={isFetching}
						>
							Refresh
						</Button>
					</Space>
				}
			/>

			<Space direction="vertical" size="large" style={{ width: "100%" }}>
				{useCaseName ? (
					<Text style={{ color: "#8c8c8c" }}>
						Use Case: <Text style={{ color: "#d9d9d9" }}>{useCaseName}</Text>
					</Text>
				) : null}

				<Row gutter={[16, 16]}>
					<Col xs={24} md={8}>
						<StatCard label="Rows in Model" value={summary?.total ?? 0} />
					</Col>
					<Col xs={24} md={8}>
						<StatCard
							label="Included in Report"
							value={summary?.included ?? 0}
							valueColor="#52c41a"
						/>
					</Col>
					<Col xs={24} md={8}>
						<StatCard
							label="Excluded from Report"
							value={summary?.excluded ?? 0}
							valueColor="#faad14"
						/>
					</Col>
				</Row>

				<KpiModelImport
					ref={importRef}
					reportId={reportId}
					prefix={reportPrefix}
					existingItems={items}
					onFileDialogOpen={() => setIsImportButtonLoading(true)}
					onFileDialogSettled={() => setIsImportButtonLoading(false)}
					onImported={() => void refetch()}
				/>

				<Card
					title="Current Report Model"
					extra={
						<Space wrap>
							<Button
								onClick={() => handleOpenCreate("kpi_driver")}
								disabled={!kpiTemplateItem}
							>
								Add KPI
							</Button>
							<Button
								onClick={() => handleOpenCreate("raw_data_point")}
								disabled={!rdpTemplateItem}
							>
								Add RDP
							</Button>
							<Input
								allowClear
								placeholder="Search by id, name, type, or any field"
								value={searchValue}
								onChange={(event) => setSearchValue(event.target.value)}
								style={{ width: 360 }}
							/>
							<Text style={{ color: "#8c8c8c" }}>
								{filteredItems.length} / {items.length} rows
							</Text>
						</Space>
					}
					style={DARK_CARD_STYLE}
				>
					<Space direction="vertical" size="middle" style={{ width: "100%" }}>
						{visibleTypes.length ? (
							<Tabs
								activeKey={activeType}
								onChange={setActiveType}
								items={visibleTypes.map((type) => {
									const typeItems = itemsByType.get(type) ?? [];

									return {
										key: type,
										label: (
											<Space size={8}>
												<Tag
													color={getTypeTagColor(type)}
													style={{ marginInlineEnd: 0 }}
												>
													{type}
												</Tag>
												<Text style={{ color: "#8c8c8c" }}>
													{typeItems.length}
												</Text>
											</Space>
										),
										children: (
											<Table<ReportModelItem>
												rowKey="id"
												dataSource={typeItems}
												pagination={{ pageSize: 20, showSizeChanger: false }}
												scroll={{ x: "max-content" }}
												size="small"
												columns={buildTypeColumns(
													typeItems,
													replaceModel.isPending ||
														createModelItem.isPending ||
														updateModelItem.isPending ||
														deleteModelItem.isPending,
													handleOpenEdit,
													handleDelete,
													handleToggleInclude,
												)}
											/>
										),
									};
								})}
							/>
						) : (
							<Result
								status="info"
								title="No rows match the current filter"
								subTitle="Try a different search query or clear the filter."
							/>
						)}
					</Space>
				</Card>
			</Space>

			<ReportModelItemModal
				open={editingItem !== null}
				title={
					editingItem ? `Edit ${editingItem.dataPointId}` : "Edit model item"
				}
				okText="Save"
				confirmLoading={updateModelItem.isPending}
				dataPointId={
					editingItem?.type === "kpi_driver"
						? editingItem.dataPointId
						: undefined
				}
				initialName={editingItem?.name ?? ""}
				initialSettings={editingItem?.settings ?? {}}
				requiredFields={
					editingItem?.type === "kpi_driver"
						? [...REQUIRED_KPI_CREATE_FIELDS]
						: []
				}
				onCancel={handleCloseEdit}
				onSubmit={handleSaveEdit}
			/>

			<ReportModelItemModal
				open={creatingItem !== null}
				title={
					creatingItem?.type === "kpi_driver"
						? "Add KPI"
						: creatingItem?.type === "raw_data_point"
							? "Add RDP"
							: "Add model item"
				}
				okText="Create"
				confirmLoading={createModelItem.isPending}
				dataPointId={creatingItem?.dataPointId}
				initialName=""
				initialSettings={creatingItem?.initialSettings ?? {}}
				requiredFields={
					creatingItem?.type === "kpi_driver"
						? [...REQUIRED_KPI_CREATE_FIELDS]
						: []
				}
				onCancel={handleCloseCreate}
				onSubmit={handleSaveCreate}
			/>
		</DeepDivePageLayout>
	);
}
