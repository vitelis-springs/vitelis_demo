"use client";

import {
	CheckCircleOutlined,
	RetweetOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import {
	Alert,
	App,
	Button,
	Card,
	Checkbox,
	Popover,
	Select,
	Space,
	Spin,
	Table,
	Tabs,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import React, {
	forwardRef,
	startTransition,
	useImperativeHandle,
	useRef,
	useState,
	type ChangeEvent,
} from "react";
import { flushSync } from "react-dom";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import {
	useImportKpiModel,
	type ImportKpiModelPayload,
	type ReportModelItem,
} from "../../hooks/api/useDeepDiveService";
import {
	detectKpiFieldMapping,
	detectRdpFieldMapping,
	KPI_FIELD_LABELS,
	KPI_SHEET_NAME_PATTERN,
	parseKpiModelWorkbook,
	RDP_FIELD_LABELS,
	RDP_SHEET_NAME_PATTERN,
	type KpiFieldKey,
	type KpiModelWorkbook,
	type ParsedSheet,
	type RdpFieldKey,
} from "../../shared/kpi-model-xlsx";

const { Text } = Typography;

interface KpiModelImportProps {
	reportId: number;
	prefix: number;
	existingItems: ReportModelItem[];
	onClose?: () => void;
	onFileDialogOpen?: () => void;
	onFileDialogSettled?: () => void;
	onImported?: () => void;
}

type KpiUserMapping = Partial<Record<KpiFieldKey, string>>;
type RdpUserMapping = Partial<Record<RdpFieldKey, string>>;

export interface KpiModelImportHandle {
	openFileDialog: () => void;
}

function hasExistingKpi(items: ReportModelItem[]): boolean {
	return items.some((item) => item.type?.startsWith("kpi_"));
}

function hasExistingRdp(items: ReportModelItem[]): boolean {
	return items.some((item) => item.type === "raw_data_point");
}

function resolveColumnIndex(
	headers: string[],
	autoMapping: Map<string, number>,
	userMapping: Partial<Record<string, string>>,
	fieldKey: string,
): number | undefined {
	const userHeader = userMapping[fieldKey];
	if (userHeader !== undefined) {
		const idx = headers.indexOf(userHeader);
		return idx >= 0 ? idx : undefined;
	}
	return autoMapping.get(fieldKey);
}

// Excel serial for Jan 1 2000 — serials above this are real dates, not RDP numbers
const EXCEL_DATE_SERIAL_MIN = 36526;

function excelSerialToParts(serial: number): number[] {
	const ms = (serial - 25569) * 86400000;
	const d = new Date(ms);
	const month = d.getUTCMonth() + 1;
	const day = d.getUTCDate();
	const year2 = d.getUTCFullYear() % 100;
	const currentYear2 = new Date().getUTCFullYear() % 100;
	// If year differs from current year it was explicitly entered as a 2-digit RDP reference
	return year2 !== currentYear2 ? [month, day, year2] : [month, day];
}

function parseDependencies(raw: string | null, prefix: number): string[] {
	if (!raw) return [];
	const trimmed = raw.trim();
	if (!trimmed) return [];

	const asNumber = Number(trimmed);
	if (Number.isFinite(asNumber) && asNumber > 0) {
		if (asNumber >= EXCEL_DATE_SERIAL_MIN) {
			// Unconverted Excel date serial (parseDateStyleMap missed the style) — decode it
			return excelSerialToParts(asNumber).map(
				(n) => `raw_data_point_${n + prefix}`,
			);
		}
		// Plain RDP number, possibly "7.0" from Excel decimal storage
		return [`raw_data_point_${Math.round(asNumber) + prefix}`];
	}

	// Already-converted date string "7/26", "9/13/18", or text "(9, 13)"
	const matches = trimmed.match(/\d+/g);
	if (!matches) return [];
	return matches.map((n) => `raw_data_point_${Number(n) + prefix}`);
}

function getRequiredIndices<TKey extends string>(
	sheet: ParsedSheet,
	fieldLabels: Record<TKey, string>,
	autoMap: Map<TKey, number>,
	userMapping: Partial<Record<string, string>>,
): Set<number> {
	const indices = new Set<number>();
	(Object.keys(fieldLabels) as TKey[]).forEach((key) => {
		const idx = resolveColumnIndex(
			sheet.headers,
			autoMap as unknown as Map<string, number>,
			userMapping,
			key,
		);
		if (idx !== undefined) indices.add(idx);
	});
	return indices;
}

function buildKpiDataPoints(
	sheet: ParsedSheet,
	prefix: number,
	userMapping: KpiUserMapping,
	excludedOptionals: Set<string>,
): ImportKpiModelPayload["dataPoints"] {
	const autoMap = detectKpiFieldMapping(sheet.headers);

	const getIndex = (key: KpiFieldKey) =>
		resolveColumnIndex(
			sheet.headers,
			autoMap as Map<string, number>,
			userMapping,
			key,
		);

	const numberIdx = getIndex("number");
	const requiredIndices = getRequiredIndices(
		sheet,
		KPI_FIELD_LABELS,
		autoMap,
		userMapping,
	);

	return sheet.rows
		.map((row) => {
			const rawNumber =
				numberIdx !== undefined ? (row.values[numberIdx] ?? null) : null;
			const rowNum = rawNumber !== null ? Number(rawNumber) : null;
			if (!Number.isFinite(rowNum) || rowNum === null) return null;

			const index = rowNum + prefix;
			const dataPointId = `kpi_driver_${index}`;
			const nameIdx = getIndex("name");
			const name = nameIdx !== undefined ? (row.values[nameIdx] ?? null) : null;

			const settings: Record<string, unknown> = { index };

			(Object.keys(KPI_FIELD_LABELS) as KpiFieldKey[]).forEach((key) => {
				if (key === "number" || key === "name") return;
				const idx = getIndex(key);
				if (idx === undefined) return;
				const rawVal = row.values[idx] ?? null;
				if (key === "dependencies") {
					settings[KPI_FIELD_LABELS[key]] = parseDependencies(rawVal, prefix);
				} else {
					settings[KPI_FIELD_LABELS[key]] = rawVal;
				}
			});

			sheet.headers.forEach((header, idx) => {
				if (!header || excludedOptionals.has(header)) return;
				if (requiredIndices.has(idx)) return;
				settings[header] = row.values[idx] ?? null;
			});

			return { id: dataPointId, type: "kpi_driver" as const, name, settings };
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);
}

function buildRdpDataPoints(
	sheet: ParsedSheet,
	prefix: number,
	userMapping: RdpUserMapping,
	excludedOptionals: Set<string>,
): ImportKpiModelPayload["dataPoints"] {
	const autoMap = detectRdpFieldMapping(sheet.headers);

	const getIndex = (key: RdpFieldKey) =>
		resolveColumnIndex(
			sheet.headers,
			autoMap as Map<string, number>,
			userMapping,
			key,
		);

	const numberIdx = getIndex("number");
	const requiredIndices = getRequiredIndices(
		sheet,
		RDP_FIELD_LABELS,
		autoMap,
		userMapping,
	);

	return sheet.rows
		.map((row) => {
			const rawNumber =
				numberIdx !== undefined ? (row.values[numberIdx] ?? null) : null;
			const rowNum = rawNumber !== null ? Number(rawNumber) : null;
			if (!Number.isFinite(rowNum) || rowNum === null) return null;

			const index = rowNum + prefix;
			const dataPointId = `raw_data_point_${index}`;
			const nameIdx = getIndex("name");
			const name = nameIdx !== undefined ? (row.values[nameIdx] ?? null) : null;

			const settings: Record<string, unknown> = { index };

			(Object.keys(RDP_FIELD_LABELS) as RdpFieldKey[]).forEach((key) => {
				if (key === "number" || key === "name") return;
				const idx = getIndex(key);
				if (idx === undefined) return;
				settings[RDP_FIELD_LABELS[key]] = row.values[idx] ?? null;
			});

			sheet.headers.forEach((header, idx) => {
				if (!header || excludedOptionals.has(header)) return;
				if (requiredIndices.has(idx)) return;
				settings[header] = row.values[idx] ?? null;
			});

			return {
				id: dataPointId,
				type: "raw_data_point" as const,
				name,
				settings,
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);
}

// ---- UI sub-components ----

function RemapPopover({
	headers,
	currentValue,
	onSelect,
}: {
	headers: string[];
	currentValue: string | undefined;
	onSelect: (header: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const options = headers
		.filter((h) => h.trim() !== "")
		.map((h) => ({ label: h, value: h }));

	return (
		<Popover
			open={open}
			onOpenChange={setOpen}
			trigger="click"
			title="Map to column from file"
			content={
				<Select
					style={{ width: 260 }}
					placeholder="Choose column…"
					value={currentValue}
					options={options}
					onChange={(val: string) => {
						onSelect(val);
						setOpen(false);
					}}
					allowClear
					onClear={() => {
						onSelect("");
						setOpen(false);
					}}
					showSearch
					filterOption={(input, option) =>
						(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
					}
					autoFocus
				/>
			}
		>
			<Button
				size="small"
				type="link"
				icon={<RetweetOutlined />}
				style={{ color: "#faad14", padding: 0, height: "auto" }}
			/>
		</Popover>
	);
}

function FieldMappingHeader<TKey extends string>({
	fieldKey,
	label,
	headers,
	autoMappingIndex,
	userMapping,
	onRemap,
}: {
	fieldKey: TKey;
	label: string;
	headers: string[];
	autoMappingIndex: number | undefined;
	userMapping: Partial<Record<TKey, string>>;
	onRemap: (key: TKey, header: string) => void;
}) {
	const userOverride = userMapping[fieldKey];
	const isMapped =
		userOverride !== undefined
			? headers.includes(userOverride)
			: autoMappingIndex !== undefined;

	return (
		<div style={{ whiteSpace: "normal", wordBreak: "break-word", minWidth: 0 }}>
			<Space size={4} align="start" style={{ flexWrap: "nowrap" }}>
				{isMapped ? (
					<CheckCircleOutlined
						style={{ color: "#52c41a", fontSize: 11, marginTop: 2 }}
					/>
				) : (
					<WarningOutlined
						style={{ color: "#faad14", fontSize: 11, marginTop: 2 }}
					/>
				)}
				<Tooltip
					title={isMapped ? undefined : `"${label}" not found. Click ↺ to map.`}
				>
					<Text
						style={{ color: isMapped ? "#d9d9d9" : "#faad14", fontSize: 12 }}
					>
						{label}
					</Text>
				</Tooltip>
				<RemapPopover
					headers={headers}
					currentValue={userOverride}
					onSelect={(h) => onRemap(fieldKey, h)}
				/>
			</Space>
		</div>
	);
}

// ── Column widths (px) — edit here to adjust individual columns ──────────────
const KPI_COLUMN_WIDTHS: Partial<Record<KpiFieldKey, number>> = {
	name: 200, // Metric (KPI Driver)
	dependencies: 180, // Dependencies
	kpiCategory: 150, // KPI Category
	definition: 200, // Definition (KPI)
	keyQuestion: 180, // Key question
	qc1: 200, // Quality Criteria (1 = Low)
	qc2: 200, // Quality Criteria (2 = Low-Medium)
	qc3: 200, // Quality Criteria (3 = Medium)
	qc4: 200, // Quality Criteria (4 = Medium-High)
	qc5: 200, // Quality Criteria (5 = High)
};

const RDP_COLUMN_WIDTHS: Partial<Record<RdpFieldKey, number>> = {
	name: 220, // Raw Data Point
	rdpCategory: 150, // RDP Category
	definition: 200, // Definition
	outputVariable: 160, // Output Variable
};

const ID_COLUMN_WIDTH = 160;
const OPTIONAL_COL_WIDTH = 130;
// ─────────────────────────────────────────────────────────────────────────────

function buildPreviewColumns<TKey extends string>(
	sheet: ParsedSheet,
	prefix: number,
	fieldLabels: Record<TKey, string>,
	autoMapping: Map<TKey, number>,
	userMapping: Partial<Record<TKey, string>>,
	idPrefix: string,
	excludedOptionals: Set<string>,
	columnWidths: Partial<Record<TKey, number>>,
	cellRenderers: Partial<Record<TKey, (val: string | null) => React.ReactNode>>,
	onRemap: (key: TKey, header: string) => void,
	onToggleOptional: (header: string, included: boolean) => void,
) {
	const numberIdx = resolveColumnIndex(
		sheet.headers,
		autoMapping as unknown as Map<string, number>,
		userMapping as Partial<Record<string, string>>,
		"number",
	);

	const requiredKeys = (Object.keys(fieldLabels) as TKey[]).filter(
		(k) => k !== ("number" as TKey),
	);

	const idColumn = {
		title: <Text style={{ color: "#8c8c8c", fontSize: 12 }}>ID</Text>,
		key: "__id",
		width: ID_COLUMN_WIDTH,
		fixed: "left" as const,
		ellipsis: true,
		render: (_: unknown, row: { values: (string | null)[] }) => {
			const rawNum =
				numberIdx !== undefined ? (row.values[numberIdx] ?? null) : null;
			const num = rawNum !== null ? Number(rawNum) : null;
			if (!Number.isFinite(num) || num === null) {
				return (
					<Text style={{ color: "#ff7875", fontSize: 11 }}>invalid #</Text>
				);
			}
			const fullId = `${idPrefix}${num + prefix}`;
			return (
				<Text code style={{ color: "#d9d9d9", fontSize: 11 }}>
					{fullId}
				</Text>
			);
		},
	};

	const requiredColumns = requiredKeys.map((key) => {
		const label = fieldLabels[key];
		const autoIdx = autoMapping.get(key);
		const idx = resolveColumnIndex(
			sheet.headers,
			autoMapping as unknown as Map<string, number>,
			userMapping as Partial<Record<string, string>>,
			key as string,
		);

		return {
			title: (
				<FieldMappingHeader
					fieldKey={key}
					label={label}
					headers={sheet.headers}
					autoMappingIndex={autoIdx}
					userMapping={userMapping}
					onRemap={onRemap}
				/>
			),
			key: `req_${key as string}`,
			width: columnWidths[key] ?? 160,
			ellipsis: true,
			render: (_: unknown, row: { values: (string | null)[] }) => {
				if (idx === undefined)
					return <Text style={{ color: "#595959", fontSize: 12 }}>—</Text>;
				const val = row.values[idx];
				if (!val)
					return <Text style={{ color: "#595959", fontSize: 12 }}>—</Text>;
				const customRenderer = cellRenderers[key];
				if (customRenderer) return customRenderer(val);
				return (
					<Tooltip title={val} placement="topLeft">
						<Text style={{ color: "#d9d9d9", fontSize: 12 }} ellipsis>
							{val}
						</Text>
					</Tooltip>
				);
			},
		};
	});

	const requiredIndices = getRequiredIndices(
		sheet,
		fieldLabels,
		autoMapping,
		userMapping as Partial<Record<string, string>>,
	);

	const optionalColumns = sheet.headers
		.map((header, colIdx) => ({ header, colIdx }))
		.filter(
			({ header, colIdx }) =>
				header.trim() !== "" && !requiredIndices.has(colIdx),
		)
		.map(({ header, colIdx }) => {
			const included = !excludedOptionals.has(header);
			return {
				title: (
					<div
						style={{
							whiteSpace: "normal",
							wordBreak: "break-word",
							minWidth: 0,
						}}
					>
						<Space size={4} align="start" style={{ flexWrap: "nowrap" }}>
							<Checkbox
								checked={included}
								onChange={(e) => onToggleOptional(header, e.target.checked)}
							/>
							<Text
								style={{
									color: included ? "#8c8c8c" : "#434343",
									fontSize: 12,
								}}
							>
								{header}
							</Text>
						</Space>
					</div>
				),
				key: `opt_${colIdx}`,
				width: OPTIONAL_COL_WIDTH,
				ellipsis: true,
				render: (_: unknown, row: { values: (string | null)[] }) => {
					const val = row.values[colIdx];
					if (!val)
						return <Text style={{ color: "#595959", fontSize: 12 }}>—</Text>;
					return (
						<Tooltip title={val} placement="topLeft">
							<Text
								style={{
									color: included ? "#8c8c8c" : "#434343",
									fontSize: 12,
								}}
								ellipsis
							>
								{val}
							</Text>
						</Tooltip>
					);
				},
			};
		});

	const allColumns = [idColumn, ...requiredColumns, ...optionalColumns];
	const totalWidth =
		ID_COLUMN_WIDTH +
		requiredColumns.reduce((sum, col) => sum + (col.width ?? 160), 0) +
		optionalColumns.length * OPTIONAL_COL_WIDTH;

	return { columns: allColumns, totalWidth };
}

function SheetPreview<TKey extends string>({
	sheet,
	prefix,
	fieldLabels,
	idPrefix,
	userMapping,
	excludedOptionals,
	columnWidths,
	cellRenderers,
	onRemap,
	onToggleOptional,
	detectMapping,
}: {
	sheet: ParsedSheet;
	prefix: number;
	fieldLabels: Record<TKey, string>;
	idPrefix: string;
	userMapping: Partial<Record<TKey, string>>;
	excludedOptionals: Set<string>;
	columnWidths: Partial<Record<TKey, number>>;
	cellRenderers: Partial<Record<TKey, (val: string | null) => React.ReactNode>>;
	onRemap: (key: TKey, header: string) => void;
	onToggleOptional: (header: string, included: boolean) => void;
	detectMapping: (headers: string[]) => Map<TKey, number>;
}) {
	const autoMapping = detectMapping(sheet.headers);

	const missingRequired = (Object.keys(fieldLabels) as TKey[]).filter((key) => {
		const idx = resolveColumnIndex(
			sheet.headers,
			autoMapping as unknown as Map<string, number>,
			userMapping as Partial<Record<string, string>>,
			key as string,
		);
		return idx === undefined;
	});

	const { columns, totalWidth } = buildPreviewColumns(
		sheet,
		prefix,
		fieldLabels,
		autoMapping,
		userMapping,
		idPrefix,
		excludedOptionals,
		columnWidths,
		cellRenderers,
		onRemap,
		onToggleOptional,
	);

	const previewRows = sheet.rows.slice(0, 100);

	return (
		<Space direction="vertical" size="middle" style={{ width: "100%" }}>
			<Space wrap>
				<Tag color="blue">{sheet.sheetName}</Tag>
				<Text style={{ color: "#8c8c8c" }}>{sheet.rows.length} rows</Text>
				{missingRequired.length > 0 && (
					<Tag color="warning" icon={<WarningOutlined />}>
						{missingRequired.length} required field
						{missingRequired.length > 1 ? "s" : ""} not mapped
					</Tag>
				)}
				{excludedOptionals.size > 0 && (
					<Tag color="default">
						{excludedOptionals.size} optional field
						{excludedOptionals.size > 1 ? "s" : ""} excluded
					</Tag>
				)}
			</Space>

			{missingRequired.length > 0 && (
				<Alert
					type="warning"
					showIcon
					message="Some required fields could not be auto-detected"
					description={
						<Text>
							Click the <RetweetOutlined style={{ color: "#faad14" }} /> button
							next to each highlighted field header to map it to a column from
							the imported file.
						</Text>
					}
				/>
			)}

			<Table
				rowKey={(row) => `${row.rowNumber}`}
				dataSource={previewRows}
				pagination={false}
				scroll={{ x: totalWidth }}
				size="small"
				columns={columns}
			/>
			{sheet.rows.length > 100 && (
				<Text style={{ color: "#8c8c8c" }}>
					Showing first 100 of {sheet.rows.length} rows
				</Text>
			)}
		</Space>
	);
}

// ---- Main component ----

const KpiModelImport = forwardRef<KpiModelImportHandle, KpiModelImportProps>(
	function KpiModelImport(
		{
			reportId,
			prefix,
			existingItems,
			onClose,
			onFileDialogOpen,
			onFileDialogSettled,
			onImported,
		}: KpiModelImportProps,
		ref,
	) {
		const { message } = App.useApp();
		const fileInputRef = useRef<HTMLInputElement>(null);
		const [workbook, setWorkbook] = useState<KpiModelWorkbook | null>(null);
		const [fileName, setFileName] = useState<string | null>(null);
		const [isParsing, setIsParsing] = useState(false);
		const [kpiUserMapping, setKpiUserMapping] = useState<KpiUserMapping>({});
		const [rdpUserMapping, setRdpUserMapping] = useState<RdpUserMapping>({});
		const [kpiExcludedOptionals, setKpiExcludedOptionals] = useState<
			Set<string>
		>(new Set());
		const [rdpExcludedOptionals, setRdpExcludedOptionals] = useState<
			Set<string>
		>(new Set());
		const [activeTab, setActiveTab] = useState("kpi");

		const importModel = useImportKpiModel(reportId);
		const reportHasKpi = hasExistingKpi(existingItems);
		const reportHasRdp = hasExistingRdp(existingItems);

		useImperativeHandle(
			ref,
			() => ({
				openFileDialog() {
					if (isParsing || importModel.isPending) return;
					flushSync(() => {
						onFileDialogOpen?.();
					});
					fileInputRef.current?.click();
				},
			}),
			[importModel.isPending, isParsing, onFileDialogOpen],
		);

		const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			event.target.value = "";
			if (!file) {
				onFileDialogSettled?.();
				return;
			}

			if (!file.name.toLowerCase().endsWith(".xlsx")) {
				void message.error("Only .xlsx files are supported");
				onFileDialogSettled?.();
				return;
			}

			setIsParsing(true);
			try {
				const parsed = await parseKpiModelWorkbook(file);
				const incomingHasKpi = Boolean(parsed.kpiSheet);
				const incomingHasRdp = Boolean(parsed.rdpSheet);

				if (
					(incomingHasKpi || incomingHasRdp) &&
					reportHasKpi &&
					reportHasRdp
				) {
					startTransition(() => {
						setWorkbook(null);
						setFileName(null);
						setKpiUserMapping({});
						setRdpUserMapping({});
						setKpiExcludedOptionals(new Set());
						setRdpExcludedOptionals(new Set());
					});
					void message.error(
						"Import is not possible: this report already contains KPI and RDP. Please update KPI Model manually.",
					);
					onFileDialogSettled?.();
					return;
				}

				const nextWorkbook: KpiModelWorkbook = {
					...parsed,
					kpiSheet: reportHasKpi ? null : parsed.kpiSheet,
					rdpSheet: reportHasRdp ? null : parsed.rdpSheet,
				};

				startTransition(() => {
					setWorkbook(nextWorkbook);
					setFileName(file.name);
					setKpiUserMapping({});
					setRdpUserMapping({});
					setKpiExcludedOptionals(new Set());
					setRdpExcludedOptionals(new Set());
					setActiveTab(
						nextWorkbook.kpiSheet
							? "kpi"
							: nextWorkbook.rdpSheet
								? "rdp"
								: "kpi",
					);
				});

				const sheets = [];
				if (nextWorkbook.kpiSheet) sheets.push("KPI");
				if (nextWorkbook.rdpSheet) sheets.push("RDP");

				if (incomingHasKpi && reportHasKpi) {
					void message.warning(
						"KPI sheet was skipped: this report already contains KPI. Please update KPI Model manually.",
					);
				}

				if (incomingHasRdp && reportHasRdp) {
					void message.warning(
						"RDP sheet was skipped: this report already contains RDP. Please update KPI Model manually.",
					);
				}

				if (!sheets.length) {
					if (incomingHasKpi && reportHasKpi) {
						void message.error(
							"KPI import is not possible: this report already contains KPI. Please update KPI Model manually.",
						);
					} else if (incomingHasRdp && reportHasRdp) {
						void message.error(
							"RDP import is not possible: this report already contains RDP. Please update KPI Model manually.",
						);
					} else {
						void message.warning(
							`No sheets matching "${KPI_SHEET_NAME_PATTERN}" or "${RDP_SHEET_NAME_PATTERN}" were found`,
						);
					}
					onFileDialogSettled?.();
				} else {
					void message.success(
						`Parsed sheets: ${sheets.join(", ")} from ${file.name}`,
					);
					onFileDialogSettled?.();
				}
			} catch (err) {
				void message.error(
					err instanceof Error ? err.message : "Failed to parse XLSX file",
				);
				onFileDialogSettled?.();
			} finally {
				setIsParsing(false);
			}
		};

		const resetImportedWorkbook = () => {
			startTransition(() => {
				setWorkbook(null);
				setFileName(null);
				setKpiUserMapping({});
				setRdpUserMapping({});
				setKpiExcludedOptionals(new Set());
				setRdpExcludedOptionals(new Set());
			});
		};

		const buildImportDataPoints = (
			type: "kpi" | "rdp" | "all",
		): ImportKpiModelPayload["dataPoints"] => {
			if (!workbook) return [];

			const dataPoints: ImportKpiModelPayload["dataPoints"] = [];

			if ((type === "kpi" || type === "all") && workbook.kpiSheet) {
				dataPoints.push(
					...buildKpiDataPoints(
						workbook.kpiSheet,
						prefix,
						kpiUserMapping,
						kpiExcludedOptionals,
					),
				);
			}

			if ((type === "rdp" || type === "all") && workbook.rdpSheet) {
				dataPoints.push(
					...buildRdpDataPoints(
						workbook.rdpSheet,
						prefix,
						rdpUserMapping,
						rdpExcludedOptionals,
					),
				);
			}

			return dataPoints;
		};

		const handleApply = async (type: "kpi" | "rdp" | "all") => {
			if (!workbook) return;

			const dataPoints = buildImportDataPoints(type);

			if (!dataPoints.length) {
				void message.error(
					"No valid rows found — check that the # field is mapped and has numeric values",
				);
				return;
			}

			try {
				await importModel.mutateAsync({ dataPoints });

				if (type === "all") {
					resetImportedWorkbook();
				} else {
					startTransition(() => {
						setWorkbook((prev) => {
							if (!prev) return prev;
							const nextWorkbook: KpiModelWorkbook = {
								...prev,
								kpiSheet: type === "kpi" ? null : prev.kpiSheet,
								rdpSheet: type === "rdp" ? null : prev.rdpSheet,
							};

							if (!nextWorkbook.kpiSheet && !nextWorkbook.rdpSheet) {
								return null;
							}

							return nextWorkbook;
						});

						setActiveTab((prev) => {
							if (type === "kpi" && workbook.rdpSheet) return "rdp";
							if (type === "rdp" && workbook.kpiSheet) return "kpi";
							return prev;
						});
					});
				}

				const importedLabel =
					type === "all" ? "KPI and RDP" : type === "kpi" ? "KPI" : "RDP";
				void message.success(
					`Imported ${dataPoints.length} ${importedLabel} data points`,
				);
				onImported?.();
			} catch (err) {
				const msg =
					(err as { response?: { data?: { error?: string } } }).response?.data
						?.error ?? "Import failed";
				void message.error(msg);
			}
		};

		const handleClose = () => {
			resetImportedWorkbook();
			onClose?.();
		};

		const toggleOptional = (
			setter: React.Dispatch<React.SetStateAction<Set<string>>>,
			header: string,
			included: boolean,
		) => {
			setter((prev) => {
				const next = new Set(prev);
				if (included) next.delete(header);
				else next.add(header);
				return next;
			});
		};

		const tabItems = workbook
			? [
					...(workbook.kpiSheet
						? [
								{
									key: "kpi",
									label: (
										<Space size={6}>
											<Tag color="blue" style={{ marginInlineEnd: 0 }}>
												KPI
											</Tag>
											<Text style={{ color: "#8c8c8c" }}>
												{workbook.kpiSheet.rows.length}
											</Text>
										</Space>
									),
									children: (
										<Space
											direction="vertical"
											size="middle"
											style={{ width: "100%" }}
										>
											<Button
												type="primary"
												onClick={() => void handleApply("kpi")}
												loading={importModel.isPending}
												disabled={isParsing}
											>
												Apply KPI import
											</Button>
											<SheetPreview
												sheet={workbook.kpiSheet}
												prefix={prefix}
												fieldLabels={KPI_FIELD_LABELS}
												idPrefix="kpi_driver_"
												userMapping={kpiUserMapping}
												excludedOptionals={kpiExcludedOptionals}
												columnWidths={KPI_COLUMN_WIDTHS}
												cellRenderers={{
													dependencies: (val) => {
														const ids = parseDependencies(val, prefix);
														if (!ids.length)
															return (
																<Text
																	style={{ color: "#595959", fontSize: 12 }}
																>
																	—
																</Text>
															);
														return (
															<Space size={2} wrap>
																{ids.map((id) => (
																	<Tag
																		key={id}
																		style={{ fontSize: 11, margin: 0 }}
																		color="green"
																	>
																		{id}
																	</Tag>
																))}
															</Space>
														);
													},
												}}
												onRemap={(key, header) =>
													setKpiUserMapping((prev) => ({
														...prev,
														[key]: header || undefined,
													}))
												}
												onToggleOptional={(header, included) =>
													toggleOptional(
														setKpiExcludedOptionals,
														header,
														included,
													)
												}
												detectMapping={detectKpiFieldMapping}
											/>
										</Space>
									),
								},
							]
						: []),
					...(workbook.rdpSheet
						? [
								{
									key: "rdp",
									label: (
										<Space size={6}>
											<Tag color="green" style={{ marginInlineEnd: 0 }}>
												RDP
											</Tag>
											<Text style={{ color: "#8c8c8c" }}>
												{workbook.rdpSheet.rows.length}
											</Text>
										</Space>
									),
									children: (
										<Space
											direction="vertical"
											size="middle"
											style={{ width: "100%" }}
										>
											<Button
												type="primary"
												onClick={() => void handleApply("rdp")}
												loading={importModel.isPending}
												disabled={isParsing}
											>
												Apply RDP import
											</Button>
											<SheetPreview
												sheet={workbook.rdpSheet}
												prefix={prefix}
												fieldLabels={RDP_FIELD_LABELS}
												idPrefix="raw_data_point_"
												userMapping={rdpUserMapping}
												excludedOptionals={rdpExcludedOptionals}
												columnWidths={RDP_COLUMN_WIDTHS}
												cellRenderers={{}}
												onRemap={(key, header) =>
													setRdpUserMapping((prev) => ({
														...prev,
														[key]: header || undefined,
													}))
												}
												onToggleOptional={(header, included) =>
													toggleOptional(
														setRdpExcludedOptionals,
														header,
														included,
													)
												}
												detectMapping={detectRdpFieldMapping}
											/>
										</Space>
									),
								},
							]
						: []),
				]
			: [];
		const canApplyAll = Boolean(workbook?.kpiSheet && workbook?.rdpSheet);

		const fileInput = (
			<input
				ref={fileInputRef}
				type="file"
				accept=".xlsx"
				style={{ display: "none" }}
				onChange={(e) => {
					void handleFileChange(e);
				}}
			/>
		);

		if (!workbook) return fileInput;

		return (
			<>
				{fileInput}
				<Card
					title="Import KPI Model from XLSX"
					style={DARK_CARD_STYLE}
					extra={
						<Space size="middle">
							{fileName ? (
								<Text style={{ color: "#8c8c8c" }}>
									File: <Text style={{ color: "#d9d9d9" }}>{fileName}</Text>
								</Text>
							) : null}
							{canApplyAll ? (
								<Button
									type="primary"
									onClick={() => void handleApply("all")}
									loading={importModel.isPending}
									disabled={isParsing}
								>
									Apply all
								</Button>
							) : null}
							<Button onClick={handleClose}>Close</Button>
						</Space>
					}
				>
					<Space direction="vertical" size="large" style={{ width: "100%" }}>
						{(reportHasKpi || reportHasRdp) &&
							!(reportHasKpi && reportHasRdp) && (
								<Alert
									type="warning"
									showIcon
									message="Existing model constraints"
									description={
										<Space direction="vertical" size={2}>
											{reportHasKpi && (
												<Text>
													KPI sheets will not be opened from XLSX because this
													report already contains KPI.
												</Text>
											)}
											{reportHasRdp && (
												<Text>
													RDP sheets will not be opened from XLSX because this
													report already contains RDP.
												</Text>
											)}
											{reportHasKpi && reportHasRdp && (
												<Text>
													Import is unavailable for this report. Update KPI
													Model manually.
												</Text>
											)}
										</Space>
									}
								/>
							)}

						{isParsing && (
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: 12,
									padding: "8px 0",
								}}
							>
								<Spin size="small" />
								<Text style={{ color: "#8c8c8c" }}>Parsing file…</Text>
							</div>
						)}

						{workbook && !workbook.kpiSheet && !workbook.rdpSheet && (
							<Alert
								type="warning"
								showIcon
								message="No matching sheets found"
								description={
									<Space direction="vertical" size={2}>
										<Text>
											Expected sheets containing{" "}
											<Text code>{KPI_SHEET_NAME_PATTERN}</Text> or{" "}
											<Text code>{RDP_SHEET_NAME_PATTERN}</Text> in their name.
										</Text>
										<Text>
											Found:{" "}
											{workbook.allSheets.map((s) => (
												<Tag key={s.sheetName}>{s.sheetName}</Tag>
											))}
										</Text>
									</Space>
								}
							/>
						)}

						{workbook && tabItems.length > 0 && (
							<Tabs
								activeKey={activeTab}
								onChange={setActiveTab}
								items={tabItems}
							/>
						)}
					</Space>
				</Card>
			</>
		);
	},
);

export default KpiModelImport;
