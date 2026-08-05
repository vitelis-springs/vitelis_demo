"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
	Alert,
	App,
	Button,
	Descriptions,
	Modal,
	Space,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import type {
	DiscoveredProductPayload,
	ProductDiscoveryRun,
} from "../../hooks/api/useSalesMinerCustomersService";
import { api } from "../../lib/api-client";

const { Text, Paragraph } = Typography;

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
 * Review step between a finished discovery run and the product table.
 *
 * The import endpoint deactivates every product the payload does not mention,
 * so applying a run to a customer who already has a hand-built portfolio
 * replaces it wholesale. That is a legitimate thing to want and a terrible
 * thing to do by accident, which is the whole reason this modal exists rather
 * than the run writing straight through.
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

	const rows = useMemo<Row[]>(
		() =>
			(run?.products ?? []).map((p, index) => ({
				...p,
				key: `${p.groupCategory}:${p.productName}:${index}`,
			})),
		[run],
	);

	const summary = run?.summary ?? null;

	const columns: ColumnsType<Row> = [
		{
			title: "Group",
			dataIndex: "groupCategory",
			width: 200,
			render: (group: string, row) =>
				row.discovery?.unfiled ? (
					<Tooltip title="Discovery found this product but could not place it in the hierarchy. Often it is not a product at all — on one customer this pile was WordPress and Google Analytics.">
						<Tag color="orange">unfiled</Tag>
					</Tooltip>
				) : (
					<Text>{group}</Text>
				),
		},
		{
			title: "Product",
			dataIndex: "productName",
			render: (name: string, row) => (
				<Space direction="vertical" size={0}>
					<Text>{name}</Text>
					{row.subCategory ? (
						<Text type="secondary" style={{ fontSize: 12 }}>
							{row.subCategory}
						</Text>
					) : null}
				</Space>
			),
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
			width: 120,
			render: (_: unknown, row) => {
				const urls = row.discovery?.evidence_urls ?? [];
				if (urls.length === 0) return <Text type="secondary">none</Text>;
				return (
					<Tooltip title={urls.join("\n")}>
						<a href={urls[0]} target="_blank" rel="noreferrer">
							{urls.length} source{urls.length > 1 ? "s" : ""}
						</a>
					</Tooltip>
				);
			},
		},
	];

	const handleApply = async () => {
		if (!run?.products?.length) return;
		setIsApplying(true);
		try {
			const res = await api.post(
				`/sales-miner/customers/${customerId}/products/import`,
				{ products: run.products },
			);
			if (!res.data?.success) {
				throw new Error(res.data?.error || "Failed to save products");
			}
			message.success(`Applied ${run.products.length} discovered products`);
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
			width={1000}
			title="Discovered products — review before applying"
			footer={
				<Space>
					<Button onClick={onClose}>Cancel</Button>
					<Button
						type="primary"
						loading={isApplying}
						disabled={rows.length === 0}
						onClick={() => void handleApply()}
					>
						Apply {rows.length} products
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
						${summary.cost_usd.toFixed(2)}
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
				pagination={{ pageSize: 20, showSizeChanger: false }}
				scroll={{ y: 380 }}
			/>
		</Modal>
	);
}
