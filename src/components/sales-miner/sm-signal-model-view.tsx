"use client";

import { Input, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import { useState } from "react";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import {
	type SmCategoryRow,
	type SmSubcategoryRow,
	type SmIndustryRow,
	useSmSignalCategories,
	useSmSignalSubcategories,
	useSmSignalIndustries,
} from "../../hooks/api/useSalesMinerSignalCatalogService";
import { GICS_INDUSTRY_GROUP_CODE_MAP } from "../../shared/signal-model-xlsx";

const { Text } = Typography;

const NESTED_BG = "#1a1a1a";
const DEEP_BG = "#141414";

// Reverse map: gics_code → group name
const GICS_CODE_TO_GROUP = Object.fromEntries(
	Object.entries(GICS_INDUSTRY_GROUP_CODE_MAP).map(([name, code]) => [
		code,
		name,
	]),
) as Record<string, string>;

function IndustriesTable({ subcategoryId }: { subcategoryId: string }) {
	const { data, isLoading } = useSmSignalIndustries(subcategoryId);
	const items = (data?.data ?? []).filter(
		(i) => i.status || i.current_instruction,
	);

	const columns: ColumnsType<SmIndustryRow> = [
		{
			title: "GICS Code",
			dataIndex: "gics_code",
			width: 100,
			render: (v: string | null) => (
				<Text code style={{ fontSize: 12 }}>
					{v ?? "—"}
				</Text>
			),
		},
		{
			title: "Industry Group",
			dataIndex: "gics_code",
			width: 280,
			render: (v: string | null) => GICS_CODE_TO_GROUP[v ?? ""] ?? "—",
		},
		{
			title: "Status",
			dataIndex: "status",
			width: 80,
			align: "center" as const,
			render: (v: boolean | null) =>
				v ? <Tag color="green">yes</Tag> : <Tag color="default">no</Tag>,
		},
		{
			title: "Instruction",
			dataIndex: ["current_instruction", "instruction"],
			render: (v: string | undefined) =>
				v ? (
					<Text style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{v}</Text>
				) : (
					<Text type="secondary" style={{ fontSize: 12 }}>
						—
					</Text>
				),
		},
	];

	return (
		<div style={{ background: DEEP_BG, padding: "8px 24px" }}>
			<Table<SmIndustryRow>
				rowKey="id"
				columns={columns}
				dataSource={items}
				loading={isLoading}
				size="small"
				pagination={false}
				style={{ background: DEEP_BG }}
			/>
		</div>
	);
}

function SubcategoriesTable({ categoryId }: { categoryId: string }) {
	const { data, isLoading } = useSmSignalSubcategories(categoryId);
	const items = data?.data ?? [];

	const columns: ColumnsType<SmSubcategoryRow> = [
		{
			title: "Sub #",
			dataIndex: "external_id",
			width: 110,
			render: (v: string) => (
				<Text code style={{ fontSize: 12 }}>
					{v}
				</Text>
			),
		},
		{
			title: "Signal Class",
			dataIndex: "signal_class",
			width: 150,
		},
		{
			title: "Signal Name",
			dataIndex: "name",
			width: 260,
		},
		{
			title: "Current Definition",
			dataIndex: ["current_version", "definition"],
			ellipsis: true,
			render: (v: string | undefined) =>
				v ? (
					<Text style={{ fontSize: 12, color: "#8c8c8c" }}>
						{v.length > 120 ? v.slice(0, 120) + "…" : v}
					</Text>
				) : (
					<Text type="secondary" style={{ fontSize: 12 }}>
						—
					</Text>
				),
		},
		{
			title: "Versions",
			dataIndex: ["_count", "versions"],
			width: 80,
			align: "center" as const,
		},
		{
			title: "Active GICS",
			dataIndex: ["_count", "industries"],
			width: 100,
			align: "center" as const,
		},
		{
			title: "Status",
			dataIndex: "is_active",
			width: 80,
			align: "center" as const,
			render: (v: boolean) =>
				v ? (
					<Tag color="green">active</Tag>
				) : (
					<Tag color="default">inactive</Tag>
				),
		},
	];

	return (
		<div style={{ background: NESTED_BG, padding: "8px 16px" }}>
			<Table<SmSubcategoryRow>
				rowKey="id"
				columns={columns}
				dataSource={items}
				loading={isLoading}
				size="small"
				expandable={{
					expandedRowRender: (row) => (
						<IndustriesTable subcategoryId={row.id} />
					),
					rowExpandable: (row) => row._count.industries > 0,
				}}
				pagination={false}
				style={{ background: NESTED_BG }}
			/>
		</div>
	);
}

const categoryColumns: ColumnsType<SmCategoryRow> = [
	{
		title: "Cat #",
		dataIndex: "external_id",
		width: 110,
		render: (v: string) => (
			<Text code style={{ fontSize: 12 }}>
				{v}
			</Text>
		),
	},
	{
		title: "Name",
		dataIndex: "name",
		width: 280,
	},
	{
		title: "Tier",
		dataIndex: "tier",
		width: 70,
		align: "center" as const,
	},
	{
		title: "Subcategories",
		dataIndex: ["_count", "subcategories"],
		width: 120,
		align: "center" as const,
	},
	{
		title: "Status",
		dataIndex: "is_active",
		width: 90,
		align: "center" as const,
		render: (v: boolean) =>
			v ? <Tag color="green">active</Tag> : <Tag color="default">inactive</Tag>,
	},
];

export default function SmSignalModelView() {
	const [q, setQ] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);

	const { data, isLoading, error } = useSmSignalCategories({
		q,
		page,
		limit: pageSize,
	});
	const items = data?.data.items ?? [];
	const total = data?.data.total ?? 0;

	return (
		<div style={{ ...DARK_CARD_STYLE, padding: 16 }}>
			<Space orientation="vertical" size="middle" style={{ width: "100%" }}>
				{error ? (
					<Text type="danger">
						{error instanceof Error ? error.message : "Failed to load"}
					</Text>
				) : null}
				<Input
					prefix={<SearchOutlined />}
					value={q}
					onChange={(e) => {
						setPage(1);
						setQ(e.target.value);
					}}
					placeholder="Search categories"
					style={{ width: 320 }}
					allowClear
				/>
				<Table<SmCategoryRow>
					rowKey="id"
					columns={categoryColumns}
					dataSource={items}
					loading={isLoading}
					size="small"
					expandable={{
						expandedRowRender: (row) => (
							<SubcategoriesTable categoryId={row.id} />
						),
						rowExpandable: (row) => row._count.subcategories > 0,
					}}
					pagination={{
						current: page,
						pageSize,
						total,
						showSizeChanger: true,
						pageSizeOptions: ["10", "20", "50", "100"],
						showTotal: (t) => `${t} categories`,
					}}
					onChange={(p) => {
						setPage(p.current ?? 1);
						setPageSize(p.pageSize ?? 20);
					}}
				/>
			</Space>
		</div>
	);
}
