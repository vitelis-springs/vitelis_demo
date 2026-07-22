"use client";

import { App, Button, Modal, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";
import {
	parseProductsWorkbook,
	type ParsedProductRow,
} from "../../shared/products-import-xlsx";
import { triggerProductsSetupWebhook } from "../../shared/products-setup-webhook";

function apiErr(err: unknown): string {
	if (typeof err === "object" && err !== null && "response" in err) {
		const r = err as { response?: { data?: { error?: string } } };
		if (r.response?.data?.error) return r.response.data.error;
	}
	if (err instanceof Error) return err.message;
	return "Import failed";
}

const { Text, Paragraph } = Typography;

const PREVIEW_FIELDS = [
	["Org Unit", "orgUnit"],
	["Group/Category", "groupCategory"],
	["Sub-Category", "subCategory"],
	["Internal Description", "internalDescription"],
	["Value Proposition", "valueProposition"],
	["Customer Pain Point", "painPoint"],
	["Markets", "markets"],
	["Geographies", "geographies"],
	["Price", "price"],
	["Buying Trigger Signals", "buyingTriggerSignals"],
	["Land Anchor", "landAnchor"],
	["Expand Anchor", "expandAnchor"],
	["Scale Anchor", "scaleAnchor"],
	["Cross-Portfolio Connection", "crossPortfolioConnection"],
] as const satisfies ReadonlyArray<[string, keyof ParsedProductRow]>;

interface Props {
	open: boolean;
	onClose: () => void;
	customerId: string;
	onImported?: () => void;
	/** Called with the n8n execution id once the setup workflow is triggered. */
	onExecutionStarted?: (executionId: string) => void;
}

export default function ImportProductsModal({
	open,
	onClose,
	customerId,
	onImported,
	onExecutionStarted,
}: Props) {
	const { message } = App.useApp();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [rows, setRows] = useState<ParsedProductRow[]>([]);
	const [sheetName, setSheetName] = useState<string | null>(null);
	const [isParsing, setIsParsing] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [previewRow, setPreviewRow] = useState<ParsedProductRow | null>(null);

	const reset = () => {
		setRows([]);
		setSheetName(null);
		setPreviewRow(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleFileChange = async (file: File) => {
		setIsParsing(true);
		reset();
		try {
			const wb = await parseProductsWorkbook(file);
			if (wb.rows.length === 0) {
				message.warning("No product rows found in the workbook");
				return;
			}
			setSheetName(wb.sheetName);
			setRows(wb.rows);
			message.success(
				`Parsed ${wb.rows.length} products from "${wb.sheetName}"`,
			);
		} catch (err) {
			message.error(
				err instanceof Error ? err.message : "Failed to parse XLSX",
			);
		} finally {
			setIsParsing(false);
		}
	};

	const handleConfirmImport = async () => {
		setIsImporting(true);
		try {
			const dbRes = await api.post(
				`/sales-miner/customers/${customerId}/products/import`,
				{
					products: rows.map((r) => ({
						groupCategory: r.groupCategory,
						productName: r.productName,
						internalDescription: r.internalDescription,
						valueProposition: r.valueProposition,
						painPoint: r.painPoint,
						orgUnit: r.orgUnit,
						subCategory: r.subCategory,
						markets: r.markets,
						geographies: r.geographies,
						price: r.price,
						buyingTriggerSignals: r.buyingTriggerSignals,
						landAnchor: r.landAnchor,
						expandAnchor: r.expandAnchor,
						scaleAnchor: r.scaleAnchor,
						crossPortfolioConnection: r.crossPortfolioConnection,
					})),
				},
			);
			if (!dbRes.data?.success) {
				throw new Error(dbRes.data?.error || "Failed to save products");
			}

			const productsQueryKey = [
				"sales-miner",
				"customer-products",
				customerId,
			] as const;
			// Reflect the reset/upserted rows (including blank L2 descriptions,
			// which drive the "generating…" spinner) right away.
			void queryClient.invalidateQueries({ queryKey: productsQueryKey });

			// The webhook responds immediately with an execution id and the
			// workflow keeps running on n8n's side for minutes — don't await
			// completion here. The Product Portfolio tab tracks that execution
			// id via useGetExecutionDetails for a precise done/failed signal;
			// only a failure to *start* the run (bad URL, validation error,
			// network failure) surfaces here.
			triggerProductsSetupWebhook(customerId)
				.then((executionId) => {
					if (executionId) onExecutionStarted?.(executionId);
				})
				.catch((err: unknown) => {
					console.error("sm-products-setup webhook trigger failed", err);
					message.error(
						`Failed to start the AI description/tags workflow (${
							err instanceof Error ? err.message : "unknown error"
						})`,
						8,
					);
				});

			message.success(
				`Imported ${rows.length} products — descriptions & tags are generating in the background`,
			);
			onImported?.();
			reset();
			onClose();
		} catch (err) {
			message.error(apiErr(err));
		} finally {
			setIsImporting(false);
		}
	};

	const columns: ColumnsType<ParsedProductRow> = [
		{ title: "#", dataIndex: "rowNumber", width: 48 },
		{ title: "Org Unit", dataIndex: "orgUnit", width: 110 },
		{ title: "Group/Category", dataIndex: "groupCategory", width: 160 },
		{ title: "Sub-Category", dataIndex: "subCategory", width: 160 },
		{ title: "Product name", dataIndex: "productName" },
		{
			title: "",
			key: "actions",
			width: 90,
			render: (_, row) => (
				<Button size="small" onClick={() => setPreviewRow(row)}>
					View
				</Button>
			),
		},
	];

	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept=".xlsx"
				style={{ display: "none" }}
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) {
						handleFileChange(file).catch((err) => {
							console.error("Products import error", err);
						});
					}
				}}
			/>

			<Modal
				title="Import Product Portfolio from XLSX"
				open={open}
				onCancel={() => {
					reset();
					onClose();
				}}
				width="80vw"
				style={{ top: "8vh" }}
				styles={{
					body: { maxHeight: "calc(78vh - 120px)", overflowY: "auto" },
				}}
				footer={[
					<Button
						key="pick"
						onClick={() => fileInputRef.current?.click()}
						loading={isParsing}
					>
						{rows.length > 0 ? "Choose another file" : "Choose file"}
					</Button>,
					<Button
						key="cancel"
						onClick={() => {
							reset();
							onClose();
						}}
					>
						Cancel
					</Button>,
					<Button
						key="confirm"
						type="primary"
						loading={isImporting}
						disabled={rows.length === 0}
						onClick={() => {
							handleConfirmImport().catch((err) => {
								console.error("Products import failed", err);
							});
						}}
					>
						Confirm Import ({rows.length})
					</Button>,
				]}
				destroyOnHidden
			>
				<Typography.Text
					type="secondary"
					style={{ display: "block", marginBottom: 8, fontSize: 12 }}
				>
					{sheetName ? `Sheet: "${sheetName}". ` : ""}
					Nothing is saved until you click &quot;Confirm Import&quot; — the
					parsed catalogue is then sent to the automated product-setup workflow
					for this customer.
				</Typography.Text>
				<Table<ParsedProductRow>
					rowKey="rowNumber"
					size="small"
					dataSource={rows}
					columns={columns}
					pagination={{ pageSize: 20 }}
					locale={{
						emptyText: isParsing
							? "Parsing file…"
							: "Choose an .xlsx file with a product catalogue sheet",
					}}
				/>
			</Modal>

			<Modal
				title={previewRow?.productName}
				open={previewRow != null}
				onCancel={() => setPreviewRow(null)}
				footer={<Button onClick={() => setPreviewRow(null)}>Close</Button>}
				width="70vw"
				styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
				destroyOnHidden
			>
				{previewRow && (
					<Space direction="vertical" size="middle" style={{ width: "100%" }}>
						{PREVIEW_FIELDS.map(([label, key]) => (
							<div key={key}>
								<Text strong style={{ display: "block", marginBottom: 4 }}>
									{label}
								</Text>
								<Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
									{previewRow[key] || <Text type="secondary">—</Text>}
								</Paragraph>
							</div>
						))}
					</Space>
				)}
			</Modal>
		</>
	);
}
