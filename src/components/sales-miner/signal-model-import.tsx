"use client";

import {
	CheckCircleOutlined,
	LoadingOutlined,
	UploadOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import {
	Alert,
	App,
	Button,
	Modal,
	Space,
	Spin,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import React, {
	forwardRef,
	type ChangeEvent,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import {
	useAnalyzeSignalModel,
	useImportSignalModel,
	type AnalysisResult,
	type RowAction,
} from "../../hooks/api/useSalesMinerSignalCatalogService";
import {
	EXPECTED_FIXED_HEADERS,
	type GicsColumnDef,
	type ColumnMismatch,
	type CellError,
	type ParsedSignalModelRow,
	type SignalModelWorkbook,
	SIGNAL_MODEL_SHEET_NAME_PATTERN,
	parseSignalModelWorkbook,
} from "../../shared/signal-model-xlsx";

const { Text } = Typography;

export interface SignalModelImportHandle {
	openFileDialog: () => void;
}

interface Props {
	onImported?: () => void;
}

function makeFixedHeader(
	colIndex: number,
	label: string,
	mismatchMap: Map<number, ColumnMismatch>,
) {
	const mismatch = mismatchMap.get(colIndex);
	if (!mismatch) {
		return (
			<Space size={4}>
				<CheckCircleOutlined style={{ color: "#52c41a", fontSize: 11 }} />
				<Text style={{ color: "#d9d9d9", fontSize: 12 }}>{label}</Text>
			</Space>
		);
	}
	return (
		<Tooltip
			title={
				mismatch.actual
					? `Expected "${mismatch.expected}", got "${mismatch.actual}"`
					: `Column "${mismatch.expected}" not found`
			}
		>
			<Space size={4}>
				<WarningOutlined style={{ color: "#ff4d4f", fontSize: 11 }} />
				<Text style={{ color: "#ff4d4f", fontSize: 12 }}>
					{mismatch.expected}
				</Text>
			</Space>
		</Tooltip>
	);
}

function ConfirmSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div
			style={{
				background: "#141414",
				border: "1px solid #303030",
				borderRadius: 6,
				padding: "10px 0 6px",
			}}
		>
			<Text
				style={{
					color: "#595959",
					fontSize: 11,
					textTransform: "uppercase",
					letterSpacing: "0.8px",
					display: "block",
					padding: "0 12px 6px",
				}}
			>
				{title}
			</Text>
			{children}
		</div>
	);
}

function ConfirmRow({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color: string;
}) {
	if (value === 0) return null;
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				padding: "3px 12px",
			}}
		>
			<Text style={{ color: "#8c8c8c", fontSize: 13 }}>{label}</Text>
			<Text
				strong
				style={{ color, fontSize: 15, minWidth: 28, textAlign: "right" }}
			>
				{value}
			</Text>
		</div>
	);
}

function buildColumns(
	gicsColumns: GicsColumnDef[],
	mismatchMap: Map<number, ColumnMismatch>,
	rowActionMap: Map<number, RowAction> | null,
	isAnalyzing: boolean,
): ColumnsType<ParsedSignalModelRow> {
	const fixed: ColumnsType<ParsedSignalModelRow> = [
		{
			title: makeFixedHeader(0, EXPECTED_FIXED_HEADERS[0], mismatchMap),
			dataIndex: "catCode",
			width: 80,
			fixed: "left",
			render: (v: string) => (
				<Text code style={{ color: "#595959", fontSize: 11 }}>
					{v}
				</Text>
			),
		},
		{
			title: makeFixedHeader(1, EXPECTED_FIXED_HEADERS[1], mismatchMap),
			dataIndex: "catName",
			width: 180,
			fixed: "left",
			render: (v: string) => (
				<Text style={{ color: "#d9d9d9", fontSize: 13 }}>{v}</Text>
			),
		},
		{
			title: makeFixedHeader(2, EXPECTED_FIXED_HEADERS[2], mismatchMap),
			dataIndex: "tier",
			width: 70,
			render: (v: number) => <Tag>{v}</Tag>,
		},
		{
			title: makeFixedHeader(3, EXPECTED_FIXED_HEADERS[3], mismatchMap),
			dataIndex: "subCode",
			width: 80,
			render: (v: string) => (
				<Text code style={{ color: "#595959", fontSize: 11 }}>
					{v}
				</Text>
			),
		},
		{
			title: makeFixedHeader(4, EXPECTED_FIXED_HEADERS[4], mismatchMap),
			dataIndex: "signalClass",
			width: 110,
			render: (v: string) =>
				v ? (
					<Tag color="blue">{v}</Tag>
				) : (
					<Text style={{ color: "#595959" }}>—</Text>
				),
		},
		{
			title: makeFixedHeader(5, EXPECTED_FIXED_HEADERS[5], mismatchMap),
			dataIndex: "signalName",
			width: 240,
			render: (v: string) => (
				<Tooltip title={v} placement="topLeft">
					<Text style={{ color: "#d9d9d9", fontSize: 13 }} ellipsis>
						{v}
					</Text>
				</Tooltip>
			),
		},
		{
			title: makeFixedHeader(6, EXPECTED_FIXED_HEADERS[6], mismatchMap),
			dataIndex: "description",
			width: 260,
			render: (v: string) => (
				<Tooltip title={v} placement="topLeft">
					<Text style={{ color: "#8c8c8c", fontSize: 12 }} ellipsis>
						{v}
					</Text>
				</Tooltip>
			),
		},
		{
			title: makeFixedHeader(7, EXPECTED_FIXED_HEADERS[7], mismatchMap),
			dataIndex: "backbonePrompt",
			width: 130,
			render: (v: string | null) =>
				v ? (
					<Tooltip title={v} placement="topLeft">
						<Tag color="green">yes</Tag>
					</Tooltip>
				) : (
					<Text style={{ color: "#595959" }}>—</Text>
				),
		},
	];

	const gics: ColumnsType<ParsedSignalModelRow> = gicsColumns.map((col) => {
		const mismatch = mismatchMap.get(col.colIndex);
		return {
			key: `gics_${col.colIndex}`,
			width: col.type === "status" ? 90 : 200,
			title: (
				<div
					style={{ whiteSpace: "normal", wordBreak: "break-word", minWidth: 0 }}
				>
					<Text style={{ color: "#8c8c8c", fontSize: 11, display: "block" }}>
						{col.label}
					</Text>
					{mismatch ? (
						<Tooltip
							title={
								mismatch.actual
									? `Expected "${mismatch.expected}", got "${mismatch.actual}"`
									: `"${mismatch.expected}" not found`
							}
						>
							<Space size={4}>
								<WarningOutlined style={{ color: "#ff4d4f", fontSize: 10 }} />
								<Text style={{ color: "#ff4d4f", fontSize: 10 }}>
									{col.type}
								</Text>
							</Space>
						</Tooltip>
					) : (
						<Text style={{ color: "#595959", fontSize: 10 }}>{col.type}</Text>
					)}
				</div>
			),
			render: (_: unknown, row: ParsedSignalModelRow) => {
				const val = row.allValues[col.colIndex] ?? null;
				if (!val) return <Text style={{ color: "#595959" }}>—</Text>;
				if (col.type === "status") {
					return <Tag color="green">{val}</Tag>;
				}
				return (
					<Tooltip title={val} placement="topLeft">
						<Text style={{ color: "#8c8c8c", fontSize: 12 }} ellipsis>
							{val}
						</Text>
					</Tooltip>
				);
			},
		};
	});

	const actionsCol: ColumnsType<ParsedSignalModelRow>[number] = {
		key: "actions",
		title: isAnalyzing ? (
			<Space size={4}>
				<Spin indicator={<LoadingOutlined />} size="small" />
				<Text style={{ color: "#8c8c8c", fontSize: 12 }}>Analyzing…</Text>
			</Space>
		) : (
			<Text style={{ color: "#d9d9d9", fontSize: 12 }}>Actions</Text>
		),
		width: 220,
		fixed: "right",
		render: (_: unknown, row: ParsedSignalModelRow) => {
			if (isAnalyzing) {
				return <Spin indicator={<LoadingOutlined />} size="small" />;
			}
			const action = rowActionMap?.get(row.rowNumber);
			if (!action) return <Text style={{ color: "#595959" }}>—</Text>;

			const allNone =
				action.catAction === "none" &&
				action.subAction === "none" &&
				action.versionAction === "none" &&
				action.industryChanges === 0;

			const notesTooltip =
				action.notes.length > 0 ? (
					<ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12 }}>
						{action.notes.map((n, i) => (
							<li key={i}>{n}</li>
						))}
					</ul>
				) : undefined;

			if (allNone) {
				return (
					<Tooltip title={notesTooltip} placement="left">
						<Text style={{ color: "#595959", fontSize: 11 }}>no changes</Text>
					</Tooltip>
				);
			}

			const catColor =
				action.catAction === "create"
					? "success"
					: action.catAction === "update"
						? "warning"
						: action.catAction === "activate"
							? "processing"
							: undefined;

			const subColor =
				action.subAction === "create"
					? "success"
					: action.subAction === "update"
						? "warning"
						: action.subAction === "activate"
							? "processing"
							: undefined;

			const verColor =
				action.versionAction === "create"
					? "success"
					: action.versionAction === "set_current"
						? "processing"
						: undefined;

			return (
				<Tooltip title={notesTooltip} placement="left">
					<Space size={2} wrap>
						{catColor && (
							<Tag color={catColor} style={{ fontSize: 10, margin: 1 }}>
								cat:{action.catAction}
							</Tag>
						)}
						{subColor && (
							<Tag color={subColor} style={{ fontSize: 10, margin: 1 }}>
								sub:{action.subAction}
							</Tag>
						)}
						{verColor && (
							<Tag color={verColor} style={{ fontSize: 10, margin: 1 }}>
								{action.versionAction === "create" ? "new ver" : "set current"}
							</Tag>
						)}
						{action.industryChanges > 0 && (
							<Tag color="cyan" style={{ fontSize: 10, margin: 1 }}>
								{action.industryChanges} ind
							</Tag>
						)}
					</Space>
				</Tooltip>
			);
		},
	};

	return [...fixed, ...gics, actionsCol];
}

const SignalModelImport = forwardRef<SignalModelImportHandle, Props>(
	function SignalModelImport({ onImported }, ref) {
		const { message } = App.useApp();
		const fileInputRef = useRef<HTMLInputElement>(null);
		const [workbook, setWorkbook] = useState<SignalModelWorkbook | null>(null);
		const [fileName, setFileName] = useState<string | null>(null);
		const [isParsing, setIsParsing] = useState(false);
		const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
			null,
		);
		const [isAnalyzing, setIsAnalyzing] = useState(false);
		const [showConfirmModal, setShowConfirmModal] = useState(false);
		const [pageSize, setPageSize] = useState(10);

		const importMutation = useImportSignalModel();
		const analyzeMutation = useAnalyzeSignalModel();

		useImperativeHandle(ref, () => ({
			openFileDialog() {
				fileInputRef.current?.click();
			},
		}));

		const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			e.target.value = "";
			if (!file) return;

			if (!file.name.toLowerCase().endsWith(".xlsx")) {
				message.error("Only .xlsx files are supported");
				return;
			}

			setIsParsing(true);
			setAnalysisResult(null);
			try {
				const wb = await parseSignalModelWorkbook(file);

				if (!wb.rows) {
					message.warning(
						`Sheet "${SIGNAL_MODEL_SHEET_NAME_PATTERN}" not found. Found: ${wb.allSheetNames.join(", ")}`,
					);
					return;
				}

				if (wb.rows.length === 0) {
					message.warning("No data rows found in the Signal Model sheet");
					return;
				}

				setWorkbook(wb);
				setFileName(file.name);

				if (wb.columnMismatches.length > 0) {
					message.warning(
						`${wb.columnMismatches.length} column(s) have unexpected names — import is blocked`,
					);
				} else if (wb.cellErrors.length > 0) {
					message.error(
						`${wb.cellErrors.length} row(s) have empty Cat # or Sub # — import is blocked`,
					);
				} else {
					message.success(
						`Parsed ${wb.rows.length} rows from "${wb.sheetName}"`,
					);
					setIsAnalyzing(true);
					try {
						const res = await analyzeMutation.mutateAsync({
							rows: wb.rows.map((r) => ({
								rowNumber: r.rowNumber,
								catCode: r.catCode,
								catName: r.catName,
								tier: r.tier,
								subCode: r.subCode,
								signalClass: r.signalClass,
								signalName: r.signalName,
								description: r.description,
								backbonePrompt: r.backbonePrompt,
								gicsData: r.gicsData,
							})),
						});
						setAnalysisResult(res.data);
					} catch {
						message.error("Analysis failed");
					} finally {
						setIsAnalyzing(false);
					}
				}
			} catch (err) {
				message.error(
					err instanceof Error ? err.message : "Failed to parse XLSX",
				);
			} finally {
				setIsParsing(false);
			}
		};

		const handleImport = async () => {
			if (!workbook?.rows) return;
			try {
				const result = await importMutation.mutateAsync({
					rows: workbook.rows.map((r) => ({
						rowNumber: r.rowNumber,
						catCode: r.catCode,
						catName: r.catName,
						tier: r.tier,
						subCode: r.subCode,
						signalClass: r.signalClass,
						signalName: r.signalName,
						description: r.description,
						backbonePrompt: r.backbonePrompt,
						gicsData: r.gicsData,
					})),
				});
				const d = result.data;
				message.success(
					`Import complete: ${d.categoriesCreated} cats created, ${d.subcategoriesCreated} subs created, ${d.versionsCreated} versions, ${d.industriesCreated} industries`,
				);
				setWorkbook(null);
				setFileName(null);
				setAnalysisResult(null);
				setShowConfirmModal(false);
				onImported?.();
			} catch (err) {
				const msg =
					(err as { response?: { data?: { error?: string } } }).response?.data
						?.error ?? "Import failed";
				message.error(msg);
			}
		};

		const mismatchMap = useMemo(
			() =>
				new Map((workbook?.columnMismatches ?? []).map((m) => [m.colIndex, m])),
			[workbook?.columnMismatches],
		);

		const rowActionMap = useMemo(
			() =>
				analysisResult
					? new Map(analysisResult.rowActions.map((a) => [a.rowNumber, a]))
					: null,
			[analysisResult],
		);

		const hasColumnErrors = (workbook?.columnMismatches ?? []).length > 0;
		const cellErrors: CellError[] = workbook?.cellErrors ?? [];
		const hasCellErrors = cellErrors.length > 0;

		const hasNoChanges = (() => {
			const s = analysisResult?.summary;
			if (!s) return false;
			return (
				s.categories.create === 0 &&
				s.categories.update === 0 &&
				s.categories.activate === 0 &&
				s.categories.deactivate === 0 &&
				s.subcategories.create === 0 &&
				s.subcategories.update === 0 &&
				s.subcategories.activate === 0 &&
				s.subcategories.deactivate === 0 &&
				s.versions.create === 0 &&
				s.versions.setCurrent === 0 &&
				s.industries.create === 0 &&
				s.industries.updateInstruction === 0 &&
				s.industries.updateStatus === 0
			);
		})();

		const columns = useMemo(
			() =>
				buildColumns(
					workbook?.gicsColumns ?? [],
					mismatchMap,
					rowActionMap,
					isAnalyzing,
				),
			[workbook?.gicsColumns, mismatchMap, rowActionMap, isAnalyzing],
		);

		const totalWidth = useMemo(() => {
			const fixedWidth = 80 + 180 + 70 + 80 + 110 + 240 + 260 + 130 + 220;
			const gicsWidth = (workbook?.gicsColumns ?? []).reduce(
				(sum, col) => sum + (col.type === "status" ? 90 : 200),
				0,
			);
			return fixedWidth + gicsWidth;
		}, [workbook?.gicsColumns]);

		const fileInput = (
			<input
				ref={fileInputRef}
				type="file"
				accept=".xlsx"
				style={{ display: "none" }}
				onChange={(e) => {
					handleFileChange(e).catch((err) => {
						console.error("Signal model import error", err);
					});
				}}
			/>
		);

		if (!workbook) {
			return (
				<>
					{fileInput}
					{isParsing && <Spin size="small" />}
				</>
			);
		}

		const rows = workbook.rows ?? [];
		const uniqueCats = new Set(rows.map((r) => r.catCode)).size;
		const uniqueSubs = new Set(rows.map((r) => r.subCode)).size;
		const s = analysisResult?.summary;

		return (
			<>
				{fileInput}

				<Modal
					title="Confirm Import"
					open={showConfirmModal}
					width={620}
					onCancel={() => setShowConfirmModal(false)}
					footer={[
						<Button key="cancel" onClick={() => setShowConfirmModal(false)}>
							Cancel
						</Button>,
						<Button
							key="confirm"
							type="primary"
							danger={
								s
									? s.categories.deactivate > 0 ||
										s.subcategories.deactivate > 0
									: false
							}
							loading={importMutation.isPending}
							onClick={() => {
								handleImport().catch((err) => {
									console.error("Signal model import failed", err);
								});
							}}
						>
							Confirm Import
						</Button>,
					]}
				>
					{s && (
						<Space orientation="vertical" size={12} style={{ width: "100%" }}>
							<Text style={{ color: "#8c8c8c" }}>
								The following changes will be applied to the database:
							</Text>

							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: 8,
								}}
							>
								{/* Categories */}
								<ConfirmSection title="Categories (L1)">
									<ConfirmRow
										label="Create"
										value={s.categories.create}
										color="#52c41a"
									/>
									<ConfirmRow
										label="Update"
										value={s.categories.update}
										color="#fa8c16"
									/>
									<ConfirmRow
										label="Activate"
										value={s.categories.activate}
										color="#1677ff"
									/>
									<ConfirmRow
										label="Deactivate"
										value={s.categories.deactivate}
										color="#ff4d4f"
									/>
								</ConfirmSection>

								{/* Subcategories */}
								<ConfirmSection title="Subcategories (L2)">
									<ConfirmRow
										label="Create"
										value={s.subcategories.create}
										color="#52c41a"
									/>
									<ConfirmRow
										label="Update"
										value={s.subcategories.update}
										color="#fa8c16"
									/>
									<ConfirmRow
										label="Activate"
										value={s.subcategories.activate}
										color="#1677ff"
									/>
									<ConfirmRow
										label="Deactivate"
										value={s.subcategories.deactivate}
										color="#ff4d4f"
									/>
								</ConfirmSection>

								{/* Versions */}
								<ConfirmSection title="Signal Versions">
									<ConfirmRow
										label="Create"
										value={s.versions.create}
										color="#52c41a"
									/>
									<ConfirmRow
										label="Set current"
										value={s.versions.setCurrent}
										color="#1677ff"
									/>
								</ConfirmSection>

								{/* Industries */}
								<ConfirmSection title="Industry Data (GICS)">
									<ConfirmRow
										label="Create"
										value={s.industries.create}
										color="#52c41a"
									/>
									<ConfirmRow
										label="Update instruction"
										value={s.industries.updateInstruction}
										color="#fa8c16"
									/>
									<ConfirmRow
										label="Update status"
										value={s.industries.updateStatus}
										color="#fa8c16"
									/>
								</ConfirmSection>
							</div>

							{s.categories.deactivateList.length > 0 && (
								<Alert
									type="error"
									showIcon
									title={`Categories to deactivate (${s.categories.deactivateList.length})`}
									description={
										<ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
											{s.categories.deactivateList.map((c) => (
												<li key={c.external_id}>
													<Text code style={{ fontSize: 11 }}>
														{c.external_id}
													</Text>
													{" — "}
													{c.name}
												</li>
											))}
										</ul>
									}
								/>
							)}
						</Space>
					)}
				</Modal>

				<Modal
					title={
						<Space size={8}>
							<span>Import Signal Model from XLSX</span>
							{fileName && (
								<Text
									style={{ color: "#8c8c8c", fontWeight: 400, fontSize: 13 }}
								>
									— {fileName}
								</Text>
							)}
						</Space>
					}
					open={true}
					width="95vw"
					style={{ top: "10vh" }}
					styles={{
						body: { maxHeight: "calc(80vh - 130px)", overflowY: "auto" },
					}}
					onCancel={() => {
						setWorkbook(null);
						setFileName(null);
						setAnalysisResult(null);
					}}
					footer={[
						<Button
							key="cancel"
							onClick={() => {
								setWorkbook(null);
								setFileName(null);
								setAnalysisResult(null);
							}}
						>
							Cancel
						</Button>,
						<Tooltip
							key="import"
							title={
								hasColumnErrors
									? "Fix column mismatches before importing"
									: hasCellErrors
										? "Fix empty ID cells before importing"
										: isAnalyzing
											? "Waiting for analysis…"
											: hasNoChanges
												? "Nothing to import — database is up to date"
												: undefined
							}
						>
							<Button
								type="primary"
								icon={<UploadOutlined />}
								loading={importMutation.isPending}
								disabled={
									hasColumnErrors ||
									hasCellErrors ||
									isAnalyzing ||
									hasNoChanges
								}
								onClick={() => setShowConfirmModal(true)}
							>
								Import all ({rows.length})
							</Button>
						</Tooltip>,
					]}
				>
					<Space orientation="vertical" size="middle" style={{ width: "100%" }}>
						<Space wrap>
							<Tag color="blue">{rows.length} signals</Tag>
							<Tag>{uniqueCats} categories</Tag>
							<Tag>{uniqueSubs} subcategories</Tag>
							<Tag>{workbook.gicsColumns.length} GICS columns</Tag>
						</Space>

						{hasColumnErrors && (
							<Alert
								type="error"
								showIcon
								title="Column mismatch — import blocked"
								description={
									<ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
										{(workbook?.columnMismatches ?? []).map((m) => (
											<li key={m.colIndex}>
												Col {m.colIndex}: expected{" "}
												<Text code>&quot;{m.expected}&quot;</Text>
												{m.actual ? (
													<>
														, got <Text code>&quot;{m.actual}&quot;</Text>
													</>
												) : (
													" — not found"
												)}
											</li>
										))}
									</ul>
								}
							/>
						)}

						{hasCellErrors && (
							<Alert
								type="error"
								showIcon
								title={`Empty ID cells found (${cellErrors.length}) — import blocked`}
								description={
									<ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
										{cellErrors.map((e, i) => (
											<li key={i}>
												Row {e.rowNumber}:{" "}
												<Text code>&quot;{e.colName}&quot;</Text> is empty
											</li>
										))}
									</ul>
								}
							/>
						)}

						{s && (
							<Alert
								type="info"
								showIcon
								title={
									<Space wrap size={[4, 4]}>
										<Text style={{ color: "#8c8c8c" }}>Cats:</Text>
										{s.categories.create > 0 && (
											<Tag color="success">+{s.categories.create} create</Tag>
										)}
										{s.categories.update > 0 && (
											<Tag color="warning">~{s.categories.update} update</Tag>
										)}
										{s.categories.activate > 0 && (
											<Tag color="processing">
												{s.categories.activate} activate
											</Tag>
										)}
										{s.categories.deactivate > 0 && (
											<Tag color="error">
												×{s.categories.deactivate} deactivate
											</Tag>
										)}
										{s.categories.create === 0 &&
											s.categories.update === 0 &&
											s.categories.activate === 0 &&
											s.categories.deactivate === 0 && <Tag>no changes</Tag>}
										<Text style={{ color: "#595959", margin: "0 4px" }}>|</Text>
										<Text style={{ color: "#8c8c8c" }}>Subs:</Text>
										{s.subcategories.create > 0 && (
											<Tag color="success">
												+{s.subcategories.create} create
											</Tag>
										)}
										{s.subcategories.update > 0 && (
											<Tag color="warning">
												~{s.subcategories.update} update
											</Tag>
										)}
										{s.subcategories.activate > 0 && (
											<Tag color="processing">
												{s.subcategories.activate} activate
											</Tag>
										)}
										{s.subcategories.deactivate > 0 && (
											<Tag color="error">
												×{s.subcategories.deactivate} deactivate
											</Tag>
										)}
										{s.subcategories.create === 0 &&
											s.subcategories.update === 0 &&
											s.subcategories.activate === 0 &&
											s.subcategories.deactivate === 0 && <Tag>no changes</Tag>}
										<Text style={{ color: "#595959", margin: "0 4px" }}>|</Text>
										<Text style={{ color: "#8c8c8c" }}>Versions:</Text>
										{s.versions.create > 0 && (
											<Tag color="success">+{s.versions.create} new</Tag>
										)}
										{s.versions.setCurrent > 0 && (
											<Tag color="processing">
												{s.versions.setCurrent} set current
											</Tag>
										)}
										{s.versions.create === 0 && s.versions.setCurrent === 0 && (
											<Tag>no changes</Tag>
										)}
										<Text style={{ color: "#595959", margin: "0 4px" }}>|</Text>
										<Text style={{ color: "#8c8c8c" }}>Industries:</Text>
										{s.industries.create > 0 && (
											<Tag color="success">+{s.industries.create} new</Tag>
										)}
										{s.industries.updateInstruction > 0 && (
											<Tag color="warning">
												{s.industries.updateInstruction} instr upd
											</Tag>
										)}
										{s.industries.updateStatus > 0 && (
											<Tag color="warning">
												{s.industries.updateStatus} status upd
											</Tag>
										)}
										{s.industries.create === 0 &&
											s.industries.updateInstruction === 0 &&
											s.industries.updateStatus === 0 && <Tag>no changes</Tag>}
									</Space>
								}
							/>
						)}

						<Table<ParsedSignalModelRow>
							rowKey="rowNumber"
							dataSource={rows}
							columns={columns}
							size="small"
							scroll={{ x: totalWidth }}
							pagination={{
								pageSize,
								showSizeChanger: true,
								pageSizeOptions: ["5", "10", "20", "50"],
								onShowSizeChange: (_, size) => setPageSize(size),
							}}
						/>
					</Space>
				</Modal>
			</>
		);
	},
);

export default SignalModelImport;
