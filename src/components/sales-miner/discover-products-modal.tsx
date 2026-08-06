"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
	Alert,
	App,
	Button,
	Collapse,
	Descriptions,
	Drawer,
	Form,
	Input,
	Modal,
	Space,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import type {
	DiscoveredProductPayload,
	ProductDiscoveryRun,
} from "../../hooks/api/useSalesMinerCustomersService";
import { api } from "../../lib/api-client";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Props {
	open: boolean;
	onClose: () => void;
	customerId: string;
	run: ProductDiscoveryRun | null;
	existingProductCount: number;
	onApplied?: () => void;
}

interface Row extends DiscoveredProductPayload {
	key: string;
}

/**
 * The 16-column contract, in the order the client's template uses. Discovery
 * fills the first four; the rest are Epics 4–5 and arrive empty, which is
 * exactly why they need to be typeable — a reviewer who already knows the
 * answer should not have to wait for a pipeline to guess it.
 */
const FIELDS: Array<{
	key: keyof DiscoveredProductPayload;
	label: string;
	long?: boolean;
}> = [
	{ key: "groupCategory", label: "Group / Category" },
	{ key: "subCategory", label: "Sub-Category" },
	{ key: "productName", label: "Product name" },
	{ key: "internalDescription", label: "Internal Description", long: true },
	{ key: "orgUnit", label: "Org Unit" },
	{ key: "valueProposition", label: "Value Proposition", long: true },
	{ key: "painPoint", label: "Customer Pain Point", long: true },
	{ key: "markets", label: "Markets" },
	{ key: "geographies", label: "Geographies" },
	{ key: "price", label: "Price" },
	{ key: "buyingTriggerSignals", label: "Buying Trigger Signals", long: true },
	{ key: "landAnchor", label: "Land Anchor", long: true },
	{ key: "expandAnchor", label: "Expand Anchor", long: true },
	{ key: "scaleAnchor", label: "Scale Anchor", long: true },
	{
		key: "crossPortfolioConnection",
		label: "Cross-Portfolio Connection",
		long: true,
	},
];

/**
 * Review step between a finished discovery run and the product table.
 *
 * The import endpoint deactivates every product the payload does not mention,
 * so applying a run to a customer who already has a hand-built portfolio
 * replaces it wholesale. That is a legitimate thing to want and a terrible
 * thing to do by accident, which is the whole reason this modal exists rather
 * than the run writing straight through.
 *
 * Edits live here and nowhere else. Nothing is written until Apply, so a
 * corrected group or a deselected junk row costs nothing to change your mind
 * about — which is what makes editing safe at this point and not after import.
 */
export default function DiscoverProductsModal({
	open,
	onClose,
	customerId,
	run,
	existingProductCount,
	onApplied,
}: Props) {
	const { message } = App.useApp();
	const queryClient = useQueryClient();
	const [isApplying, setIsApplying] = useState(false);
	const [edits, setEdits] = useState<Record<string, DiscoveredProductPayload>>(
		{},
	);
	const [selected, setSelected] = useState<string[]>([]);
	const [editingKey, setEditingKey] = useState<string | null>(null);
	const [form] = Form.useForm();

	const rows = useMemo<Row[]>(
		() =>
			(run?.products ?? []).map((p, index) => ({
				...p,
				key: `${p.groupCategory}:${p.productName}:${index}`,
			})),
		[run],
	);

	// A new run discards the previous one's edits, and everything starts
	// selected: applying the whole catalogue is the common case.
	useEffect(() => {
		setEdits({});
		setSelected(rows.map((r) => r.key));
		setEditingKey(null);
	}, [rows]);

	const rowFor = (row: Row): DiscoveredProductPayload => edits[row.key] ?? row;
	const summary = run?.summary ?? null;
	const editingRow = rows.find((r) => r.key === editingKey) ?? null;

	const openEditor = (row: Row) => {
		setEditingKey(row.key);
		form.setFieldsValue(rowFor(row));
	};

	const saveEditor = () => {
		if (!editingRow) return;
		setEdits((prev) => ({
			...prev,
			[editingRow.key]: { ...rowFor(editingRow), ...form.getFieldsValue() },
		}));
		setEditingKey(null);
	};

	const columns: ColumnsType<Row> = [
		{
			title: "Group",
			dataIndex: "groupCategory",
			width: 190,
			render: (_: string, row) => {
				const current = rowFor(row);
				return current.discovery?.unfiled ? (
					<Tooltip title="Discovery found this product but could not place it in the hierarchy. Often it is not a product at all — on one customer this pile was WordPress and Google Analytics.">
						<Tag color="orange">unfiled</Tag>
					</Tooltip>
				) : (
					<Text>{current.groupCategory}</Text>
				);
			},
		},
		{
			title: "Product",
			dataIndex: "productName",
			render: (_: string, row) => {
				const current = rowFor(row);
				return (
					<Space direction="vertical" size={0}>
						<Text>{current.productName}</Text>
						{current.subCategory ? (
							<Text type="secondary" style={{ fontSize: 12 }}>
								{current.subCategory}
							</Text>
						) : null}
					</Space>
				);
			},
		},
		{
			title: "Confidence",
			width: 110,
			align: "right",
			sorter: (a, b) =>
				(a.discovery?.confidence ?? 0) - (b.discovery?.confidence ?? 0),
			render: (_: unknown, row) => {
				const value = row.discovery?.confidence;
				if (value == null) return <Text type="secondary">—</Text>;
				// Below 0.5 is where the false positives concentrate; colour it
				// so a reviewer's attention lands there rather than on row one.
				const colour = value >= 0.7 ? "green" : value >= 0.5 ? "gold" : "red";
				return <Tag color={colour}>{value.toFixed(2)}</Tag>;
			},
		},
		{
			title: "Evidence",
			width: 110,
			render: (_: unknown, row) => {
				const urls = row.discovery?.evidence_urls ?? [];
				if (urls.length === 0) return <Text type="secondary">none</Text>;
				// Open the offering's own page when there is one. Checking a row
				// against the hub page it was listed on tells the reviewer
				// nothing — that same hub backs dozens of other rows.
				const own = row.discovery?.link_url;
				return (
					<Tooltip title={[own, ...urls].filter(Boolean).join("\n")}>
						<a href={own || urls[0]} target="_blank" rel="noreferrer">
							{own
								? "own page"
								: `${urls.length} source${urls.length > 1 ? "s" : ""}`}
						</a>
					</Tooltip>
				);
			},
		},
		{
			title: "",
			width: 76,
			render: (_: unknown, row) => (
				<Button size="small" type="link" onClick={() => openEditor(row)}>
					{edits[row.key] ? "Edited" : "Edit"}
				</Button>
			),
		},
	];

	const handleApply = async () => {
		const products = rows
			.filter((r) => selected.includes(r.key))
			.map((r) => {
				const { key: _key, ...payload } = { ...rowFor(r), key: r.key };
				return payload;
			});
		if (products.length === 0) return;

		setIsApplying(true);
		try {
			const res = await api.post(
				`/sales-miner/customers/${customerId}/products/import`,
				{ products },
			);
			if (!res.data?.success) {
				throw new Error(res.data?.error || "Failed to save products");
			}
			message.success(`Applied ${products.length} discovered products`);
			void queryClient.invalidateQueries({
				queryKey: ["sales-miner", "customer-products", customerId],
			});
			onApplied?.();
			onClose();
		} catch (err) {
			message.error(
				`Failed to apply: ${err instanceof Error ? err.message : "unknown error"}`,
				8,
			);
		} finally {
			setIsApplying(false);
		}
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			width={1080}
			title="Discovered products — review before applying"
			footer={
				<Space>
					<Button onClick={onClose}>Cancel</Button>
					<Button
						type="primary"
						loading={isApplying}
						disabled={selected.length === 0}
						onClick={() => void handleApply()}
					>
						Apply {selected.length} of {rows.length} products
					</Button>
				</Space>
			}
		>
			{run?.status === "failed" ? (
				<Alert
					type="error"
					showIcon
					message="Discovery failed"
					description={run.error ?? "No further detail was recorded."}
				/>
			) : null}

			{existingProductCount > 0 ? (
				<Alert
					type="warning"
					showIcon
					style={{ marginBottom: 16 }}
					message={`This customer already has ${existingProductCount} products`}
					description="Applying replaces the portfolio: anything not in this list is deactivated, and products that reappear keep their id and their enrichment."
				/>
			) : null}

			{summary ? (
				<Descriptions
					size="small"
					column={4}
					style={{ marginBottom: 16 }}
					bordered
				>
					<Descriptions.Item label="Products">
						{summary.products}
					</Descriptions.Item>
					<Descriptions.Item label="Groups">{summary.groups}</Descriptions.Item>
					<Descriptions.Item label="Unfiled">
						{summary.unfiled > 0 ? (
							<Text type="warning">{summary.unfiled}</Text>
						) : (
							0
						)}
					</Descriptions.Item>
					<Descriptions.Item label="Hierarchy">
						{summary.taxonomy_origin === "client"
							? "yours"
							: summary.taxonomy_origin === "proposed"
								? "proposed"
								: "—"}
					</Descriptions.Item>
					<Descriptions.Item label="Cost">
						<Space size={4}>
							<Text>${summary.cost_usd.toFixed(2)}</Text>
							{summary.cached_calls > 0 ? (
								<Tooltip title="Calls served from cache. An earlier run paid for these, so they cost nothing here.">
									<Text type="secondary" style={{ fontSize: 12 }}>
										+{summary.cached_calls} cached
									</Text>
								</Tooltip>
							) : null}
						</Space>
					</Descriptions.Item>
					<Descriptions.Item label="Duration">
						{Math.round(summary.duration_s)}s
					</Descriptions.Item>
					<Descriptions.Item label="Sources" span={2}>
						{summary.preflight_verdict === "clear" ? (
							<Tag color="green">all reachable</Tag>
						) : (
							<Tooltip
								title={summary.sources
									.filter((s) => s.verdict !== "ok" || !s.crawlable)
									.map((s) => `${s.verdict} (${s.status}) ${s.url}`)
									.join("\n")}
							>
								<Tag color="orange">{summary.preflight_verdict}</Tag>
							</Tooltip>
						)}
					</Descriptions.Item>
				</Descriptions>
			) : null}

			{summary?.taxonomy_origin === "proposed" ? (
				<Paragraph type="secondary" style={{ fontSize: 12 }}>
					No hierarchy was supplied for this customer, so discovery proposed
					one. Expect the top-level groups to be roughly the right shape and the
					contents to need correcting — that is the cheaper direction to be
					wrong in, and correcting the groups is a short conversation.
				</Paragraph>
			) : null}

			{summary?.errors?.length ? (
				<Alert
					type="info"
					showIcon
					style={{ marginBottom: 16 }}
					message={`${summary.errors.length} non-fatal issues during the run`}
					description={
						<ul style={{ margin: 0, paddingLeft: 18 }}>
							{summary.errors.slice(0, 5).map((e) => (
								<li key={e}>
									<Text type="secondary" style={{ fontSize: 12 }}>
										{e}
									</Text>
								</li>
							))}
						</ul>
					}
				/>
			) : null}

			<Table<Row>
				size="small"
				columns={columns}
				dataSource={rows}
				rowSelection={{
					selectedRowKeys: selected,
					onChange: (keys) => setSelected(keys as string[]),
				}}
				pagination={{ pageSize: 20, showSizeChanger: false }}
				scroll={{ y: 360 }}
			/>

			{summary?.rejected_total ? (
				<Collapse
					size="small"
					style={{ marginTop: 12 }}
					items={[
						{
							key: "rejected",
							label: `${summary.rejected_total} products excluded by the scope rule`,
							children: (
								<>
									<Paragraph type="secondary" style={{ fontSize: 12 }}>
										Dropped before filing, against this customer&apos;s
										&quot;what counts as in scope&quot; rule. If things you want
										are listed here, the rule is too tight — that is a settings
										change, not a bug.
									</Paragraph>
									<ul style={{ margin: 0, paddingLeft: 18 }}>
										{summary.rejected.map((r) => (
											<li key={r.name}>
												<Text style={{ fontSize: 12 }}>{r.name}</Text>{" "}
												<Text type="secondary" style={{ fontSize: 12 }}>
													— {r.reason}
												</Text>
											</li>
										))}
									</ul>
									{summary.rejected_total > summary.rejected.length ? (
										<Text type="secondary" style={{ fontSize: 12 }}>
											…and {summary.rejected_total - summary.rejected.length}{" "}
											more.
										</Text>
									) : null}
								</>
							),
						},
					]}
				/>
			) : null}

			<Drawer
				open={editingRow !== null}
				onClose={() => setEditingKey(null)}
				width={520}
				title={editingRow ? rowFor(editingRow).productName : ""}
				extra={
					<Space>
						<Button onClick={() => setEditingKey(null)}>Cancel</Button>
						<Button type="primary" onClick={saveEditor}>
							Save row
						</Button>
					</Space>
				}
			>
				<Paragraph type="secondary" style={{ fontSize: 12 }}>
					All sixteen columns of the product template. Discovery fills the first
					four; the rest are not generated yet and can be filled in by hand.
					Changes take effect when you press Apply, not before.
				</Paragraph>
				<Form form={form} layout="vertical" size="small">
					{FIELDS.map((field) => (
						<Form.Item key={field.key} name={field.key} label={field.label}>
							{field.long ? <TextArea rows={2} /> : <Input />}
						</Form.Item>
					))}
				</Form>
			</Drawer>
		</Modal>
	);
}
