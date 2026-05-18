"use client";

import {
	App,
	Button,
	Card,
	Checkbox,
	Form,
	Input,
	InputNumber,
	Layout,
	Modal,
	Select,
	Space,
	Switch,
	Table,
	Tabs,
	Tag,
	Tooltip,
	TreeSelect,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
	ArrowLeftOutlined,
	DeleteOutlined,
	DownloadOutlined,
	EditOutlined,
	EyeOutlined,
	PlusOutlined,
	SearchOutlined,
	StarOutlined,
	UploadOutlined,
} from "@ant-design/icons";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import DeepDiveBreadcrumbs from "../deep-dive/breadcrumbs";
import SignalModelImport, {
	type SignalModelImportHandle,
} from "./signal-model-import";
import SmSignalModelView from "./sm-signal-model-view";
import {
	type CurrentSignalRow,
	type GicsCodeRow,
	type SignalCategoryRow,
	type SignalDefinitionRow,
	useCreateSignalCategory,
	useCreateSignalDefinition,
	useDeactivateSignalDefinition,
	useGicsCodes,
	useSetCurrentSignalVersion,
	useSetCurrentIndustrySignalVersion,
	useSignalCatalogCategories,
	useSignalCatalogSignalTypes,
	useSignalCatalogSubcategories,
	useSignalVersionsByCategoryId,
	useSubcategoryCurrentSignals,
	useToggleSignalCategoryActive,
	useUpdateSignalCategory,
	useExportSignalModel,
} from "../../hooks/api/useSalesMinerSignalCatalogService";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const BG = "#141414";
const NESTED_BG = "#1a1a1a";

interface CategoryFormValues {
	name: string;
	description?: string;
	tier: number;
	isActive: boolean;
}

interface SignalFormValues {
	name: string;
	description: string;
	signalTypeId: string;
	parentCategoryId?: string;
	isActive: boolean;
	gicsCodes?: string[];
	phrases?: Array<{ phrase: string }>;
}

interface GicsTreeNode {
	title: string;
	value: string;
	children: GicsTreeNode[];
}

function buildGicsTree(items: GicsCodeRow[]): GicsTreeNode[] {
	const map = new Map<string, GicsTreeNode>();
	for (const item of items) {
		map.set(item.code, {
			title: `${item.code} — ${item.name}`,
			value: item.code,
			children: [],
		});
	}
	const roots: GicsTreeNode[] = [];
	for (const item of items) {
		const node = map.get(item.code)!;
		if (item.parent_code && map.has(item.parent_code)) {
			map.get(item.parent_code)!.children.push(node);
		} else {
			roots.push(node);
		}
	}
	return roots;
}

function autoCode(): string {
	return `sig_${crypto.randomUUID().replace(/-/g, "")}`;
}

function extractApiError(error: unknown, fallback: string): string {
	if (error && typeof error === "object" && "response" in error) {
		const data = (error as { response?: { data?: { error?: string } } })
			.response?.data;
		if (data?.error) return data.error;
	}
	return error instanceof Error ? error.message : fallback;
}

interface SignalVersionsTableProps {
	categoryId: string;
	signalCode: string;
	linkType: "universal" | "industry";
	subcatRow: SignalCategoryRow;
	onNewVersion: (
		signal: SignalDefinitionRow,
		subcatRow: SignalCategoryRow,
	) => void;
}

function SignalVersionsTable({
	categoryId,
	signalCode,
	linkType,
	subcatRow,
	onNewVersion,
}: SignalVersionsTableProps) {
	const { data, isLoading } = useSignalVersionsByCategoryId(categoryId);
	const { data: gicsData } = useGicsCodes();
	const { modal, message } = App.useApp();
	const setCurrent = useSetCurrentSignalVersion();
	const setCurrentIndustry = useSetCurrentIndustrySignalVersion();
	const deactivate = useDeactivateSignalDefinition();
	const [viewingSignal, setViewingSignal] =
		useState<SignalDefinitionRow | null>(null);

	const gicsMap = useMemo(() => {
		const m = new Map<string, string>();
		for (const g of gicsData?.data ?? []) m.set(g.code, g.name);
		return m;
	}, [gicsData?.data]);

	const items = (data?.data.items ?? []).filter(
		(s) => s.is_active && s.code === signalCode,
	);

	const columns: ColumnsType<SignalDefinitionRow> = [
		{
			title: "ID",
			dataIndex: "id",
			width: 70,
			render: (id: string) => (
				<Text style={{ color: "#595959", fontSize: 12 }}>#{id}</Text>
			),
		},
		{
			title: "Name",
			dataIndex: "name",
			render: (name: string) => (
				<Text style={{ color: "#d9d9d9", fontSize: 13 }}>{name}</Text>
			),
		},
		{
			title: "Description",
			dataIndex: "description",
			render: (v: string) =>
				v ? (
					<Text style={{ color: "#8c8c8c", fontSize: 12 }}>{v}</Text>
				) : (
					<Text style={{ color: "#595959" }}>—</Text>
				),
		},
		{
			title: "Created",
			dataIndex: "created_at",
			width: 160,
			render: (v: string) => (
				<Text style={{ color: "#595959", fontSize: 12 }}>
					{new Date(v).toLocaleString()}
				</Text>
			),
		},
		{
			title: "Current",
			width: 80,
			render: (_: unknown, row) => (
				<Switch
					checked={!!row.is_latest}
					size="small"
					loading={setCurrent.isPending || setCurrentIndustry.isPending}
					onChange={(checked) => {
						if (!checked) return;
						modal.confirm({
							title: "Set as current version?",
							content:
								"This version will be used as the current signal. The previous current version will be replaced.",
							okText: "Set Current",
							onOk: () =>
								(linkType === "industry"
									? setCurrentIndustry.mutateAsync({
											signalId: row.id,
											subcategoryId: subcatRow.id,
										})
									: setCurrent.mutateAsync({
											row: subcatRow,
											signalDefinitionId: row.id,
										})
								).catch((err: unknown) => {
									message.error(
										extractApiError(err, "Failed to set current version"),
									);
								}),
						});
					}}
				/>
			),
		},
		{
			title: "",
			key: "actions",
			width: 210,
			render: (_: unknown, row) => (
				<Space size={8}>
					<Button
						size="small"
						icon={<EyeOutlined />}
						onClick={() => setViewingSignal(row)}
					/>
					<Button
						size="small"
						icon={<StarOutlined />}
						onClick={() => onNewVersion(row, subcatRow)}
					>
						New Version
					</Button>
					<Button
						size="small"
						danger
						icon={<DeleteOutlined />}
						disabled={!!row.is_latest}
						loading={deactivate.isPending}
						onClick={() => {
							modal.confirm({
								title: "Delete this version?",
								content:
									"This version will be deactivated and will no longer be available.",
								okText: "Delete",
								okType: "danger",
								onOk: () => deactivate.mutateAsync(row.id),
							});
						}}
					/>
				</Space>
			),
		},
	];

	return (
		<>
			<Table<SignalDefinitionRow>
				rowKey="id"
				size="small"
				dataSource={items}
				columns={columns}
				loading={isLoading}
				pagination={false}
			/>
			<Modal
				title={`Version — ${viewingSignal?.name}`}
				open={viewingSignal !== null}
				onCancel={() => setViewingSignal(null)}
				footer={<Button onClick={() => setViewingSignal(null)}>Close</Button>}
				width={820}
				destroyOnHidden
			>
				{viewingSignal && (
					<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
						<div>
							<Text style={{ color: "#8c8c8c", fontSize: 12 }}>Name</Text>
							<div style={{ marginTop: 4 }}>
								<Text style={{ color: "#d9d9d9" }}>{viewingSignal.name}</Text>
							</div>
						</div>
						<div>
							<Text style={{ color: "#8c8c8c", fontSize: 12 }}>
								Description
							</Text>
							<div style={{ marginTop: 4 }}>
								<Text style={{ color: "#d9d9d9" }}>
									{viewingSignal.description}
								</Text>
							</div>
						</div>
						<div>
							<Text style={{ color: "#8c8c8c", fontSize: 12 }}>
								Signal Type
							</Text>
							<div style={{ marginTop: 4 }}>
								<Tag>{viewingSignal.signal_type_name}</Tag>
							</div>
						</div>
						<div>
							<Text style={{ color: "#8c8c8c", fontSize: 12 }}>GICS Codes</Text>
							<div
								style={{
									marginTop: 4,
									display: "flex",
									flexWrap: "wrap",
									gap: 4,
								}}
							>
								{viewingSignal.gics_codes.length > 0 ? (
									viewingSignal.gics_codes.map((gc) => (
										<Tag key={gc} color="blue">
											{gc} — {gicsMap.get(gc) ?? gc}
										</Tag>
									))
								) : (
									<Tag color="default">Universal</Tag>
								)}
							</div>
						</div>
						<div>
							<Text style={{ color: "#8c8c8c", fontSize: 12 }}>
								Search Phrases
							</Text>
							<div
								style={{
									marginTop: 8,
									display: "flex",
									flexDirection: "column",
									gap: 4,
								}}
							>
								{viewingSignal.search_phrases.length > 0 ? (
									viewingSignal.search_phrases.map((p) => (
										<div
											key={p.id}
											style={{
												padding: "6px 10px",
												background: "#1f1f1f",
												borderRadius: 4,
												color: "#d9d9d9",
												fontSize: 13,
											}}
										>
											{p.phrase}
										</div>
									))
								) : (
									<Text style={{ color: "#595959" }}>—</Text>
								)}
							</div>
						</div>
					</div>
				)}
			</Modal>
		</>
	);
}

interface CurrentSignalsTableProps {
	subcatRow: SignalCategoryRow;
	onVersions: (subcatRow: SignalCategoryRow, signal: CurrentSignalRow) => void;
}

function CurrentSignalsTable({
	subcatRow,
	onVersions,
}: CurrentSignalsTableProps) {
	const { data, isLoading } = useSubcategoryCurrentSignals(subcatRow.id);
	const { data: gicsData } = useGicsCodes();
	const items = data?.data ?? [];

	const gicsMap = useMemo(() => {
		const m = new Map<string, string>();
		for (const g of gicsData?.data ?? []) m.set(g.code, g.name);
		return m;
	}, [gicsData?.data]);

	const columns: ColumnsType<CurrentSignalRow> = [
		{
			title: "ID",
			dataIndex: "id",
			width: 100,
			render: (id: string) => (
				<Text code style={{ color: "#595959", fontSize: 11 }}>
					#{id}
				</Text>
			),
		},
		{
			title: "Type",
			dataIndex: "link_type",
			width: 110,
			render: (t: "universal" | "industry") =>
				t === "universal" ? (
					<Tag color="blue">Universal</Tag>
				) : (
					<Tag color="purple">Industry</Tag>
				),
		},
		{
			title: "GICS Codes",
			dataIndex: "gics_codes",
			width: 260,
			render: (codes: string[]) =>
				codes.length > 0 ? (
					<div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
						{codes.map((c) => (
							<Tag key={c} style={{ fontSize: 11, margin: 0 }}>
								{c} — {gicsMap.get(c) ?? c}
							</Tag>
						))}
					</div>
				) : (
					<Text style={{ color: "#595959" }}>—</Text>
				),
		},
		{
			title: "Name",
			dataIndex: "name",
			render: (name: string) => (
				<Text style={{ color: "#d9d9d9", fontSize: 13 }}>{name}</Text>
			),
		},
		{
			title: "Description",
			dataIndex: "description",
			render: (v: string) =>
				v ? (
					<Text style={{ color: "#8c8c8c", fontSize: 12 }}>{v}</Text>
				) : (
					<Text style={{ color: "#595959" }}>—</Text>
				),
		},
		{
			title: "Created",
			dataIndex: "created_at",
			width: 160,
			render: (v: string) => (
				<Text style={{ color: "#595959", fontSize: 12 }}>
					{new Date(v).toLocaleString()}
				</Text>
			),
		},
		{
			title: "",
			key: "actions",
			width: 110,
			render: (_: unknown, row: CurrentSignalRow) => (
				<Button size="small" onClick={() => onVersions(subcatRow, row)}>
					Versions ({row.versions_count})
				</Button>
			),
		},
	];

	return (
		<Table<CurrentSignalRow>
			rowKey="id"
			size="small"
			dataSource={items}
			columns={columns}
			loading={isLoading}
			pagination={false}
			locale={{ emptyText: "No current signals" }}
		/>
	);
}

interface SubcategoriesTableProps {
	parentId: string;
	onNewVersion: (
		signal: SignalDefinitionRow,
		subcatRow: SignalCategoryRow,
	) => void;
	onAddSignal: (subcatRow: SignalCategoryRow) => void;
	onEditSubcat: (subcatRow: SignalCategoryRow) => void;
}

function SubcategoriesTable({
	parentId,
	onNewVersion,
	onAddSignal,
	onEditSubcat,
}: SubcategoriesTableProps) {
	const { data, isLoading } = useSignalCatalogSubcategories(parentId);
	const toggleActive = useToggleSignalCategoryActive();
	const items = data?.data.items ?? [];

	const [versionsContext, setVersionsContext] = useState<{
		subcat: SignalCategoryRow;
		signalCode: string;
		linkType: "universal" | "industry";
	} | null>(null);

	const columns: ColumnsType<SignalCategoryRow> = [
		{
			title: "Subcategory",
			dataIndex: "name",
			render: (name: string) => (
				<Text style={{ color: "#d9d9d9", fontSize: 13 }}>{name}</Text>
			),
		},
		{
			title: "Is Active",
			dataIndex: "is_active",
			width: 90,
			render: (_: unknown, row) => (
				<Switch
					checked={row.is_active}
					loading={toggleActive.isPending}
					onChange={(checked) =>
						toggleActive.mutate({ row, isActive: checked })
					}
					size="small"
				/>
			),
		},
		{
			title: "",
			key: "actions",
			width: 110,
			render: (_: unknown, row) => (
				<Space size={6}>
					<Tooltip title="Add signal to this subcategory">
						<Button
							size="small"
							type="primary"
							icon={<PlusOutlined />}
							onClick={() => onAddSignal(row)}
						/>
					</Tooltip>
					<Button
						size="small"
						icon={<EditOutlined />}
						onClick={() => onEditSubcat(row)}
					/>
				</Space>
			),
		},
	];

	return (
		<>
			<div style={{ padding: "8px 0 8px 24px", background: NESTED_BG }}>
				<Table<SignalCategoryRow>
					rowKey="id"
					size="small"
					dataSource={items}
					columns={columns}
					loading={isLoading}
					pagination={false}
					style={{ background: NESTED_BG }}
					expandable={{
						expandedRowRender: (row) => (
							<div style={{ padding: "8px 0 8px 24px" }}>
								<CurrentSignalsTable
									subcatRow={row}
									onVersions={(subcat, signal) =>
										setVersionsContext({
											subcat,
											signalCode: signal.code,
											linkType: signal.link_type,
										})
									}
								/>
							</div>
						),
					}}
				/>
			</div>
			<Modal
				title={`Versions — ${versionsContext?.subcat.name}`}
				open={versionsContext !== null}
				onCancel={() => setVersionsContext(null)}
				footer={null}
				width={1400}
				destroyOnHidden
			>
				{versionsContext && (
					<SignalVersionsTable
						categoryId={versionsContext.subcat.id}
						signalCode={versionsContext.signalCode}
						linkType={versionsContext.linkType}
						subcatRow={versionsContext.subcat}
						onNewVersion={onNewVersion}
					/>
				)}
			</Modal>
		</>
	);
}

export default function SalesMinerGlobalSignalCatalogPage() {
	const router = useRouter();
	const { message } = App.useApp();
	const importRef = useRef<SignalModelImportHandle>(null);
	const [categorySearch, setCategorySearch] = useState("");
	const [categoryPage, setCategoryPage] = useState(1);
	const [categoryPageSize, setCategoryPageSize] = useState(20);
	const [categoryModalOpen, setCategoryModalOpen] = useState(false);
	const [editingCategory, setEditingCategory] =
		useState<SignalCategoryRow | null>(null);
	const [signalModalOpen, setSignalModalOpen] = useState(false);
	const [sourceSignal, setSourceSignal] = useState<SignalDefinitionRow | null>(
		null,
	);
	const [signalParentCategoryId, setSignalParentCategoryId] = useState<
		string | null
	>(null);
	const [signalExistingCategoryId, setSignalExistingCategoryId] = useState<
		string | null
	>(null);
	const [signalSubcatRow, setSignalSubcatRow] =
		useState<SignalCategoryRow | null>(null);
	const [subcatModalOpen, setSubcatModalOpen] = useState(false);
	const [editingSubcat, setEditingSubcat] = useState<SignalCategoryRow | null>(
		null,
	);
	const [subcatForm] = Form.useForm<{ name: string; isActive: boolean }>();
	const [categoryForm] = Form.useForm<CategoryFormValues>();
	const [signalForm] = Form.useForm<SignalFormValues>();

	const categoriesQuery = useSignalCatalogCategories({
		q: categorySearch,
		page: categoryPage,
		limit: categoryPageSize,
	});
	const signalTypesQuery = useSignalCatalogSignalTypes();
	const gicsQuery = useGicsCodes();
	const createCategory = useCreateSignalCategory();
	const updateCategory = useUpdateSignalCategory();
	const createSignal = useCreateSignalDefinition();
	const exportSignalModel = useExportSignalModel();

	const parentCategories = useMemo(
		() => categoriesQuery.data?.data.items ?? [],
		[categoriesQuery.data?.data.items],
	);
	const parentCategoryOptions = useMemo(
		() =>
			(categoriesQuery.data?.data.items ?? []).map((c) => ({
				label: `${c.name} (#${c.id})`,
				value: c.id,
			})),
		[categoriesQuery.data?.data.items],
	);
	const signalTypeOptions = useMemo(
		() =>
			(signalTypesQuery.data?.data ?? []).map((t) => ({
				label: t.name,
				value: t.id,
			})),
		[signalTypesQuery.data?.data],
	);

	const gicsTree = useMemo(
		() => buildGicsTree(gicsQuery.data?.data ?? []),
		[gicsQuery.data?.data],
	);

	const categoryBasedTypeId = useMemo(
		() =>
			(signalTypesQuery.data?.data ?? []).find(
				(t) => t.name === "Category-based signal",
			)?.id ?? null,
		[signalTypesQuery.data?.data],
	);

	const universalExists = signalSubcatRow?.signal_definition_id != null;
	const sourceIsUniversal =
		sourceSignal != null &&
		signalSubcatRow?.signal_definition_id === sourceSignal.id;

	const validationSubcatId =
		signalExistingCategoryId ?? sourceSignal?.category_id ?? null;
	const { data: subcatCurrentSignals } =
		useSubcategoryCurrentSignals(validationSubcatId);

	const openCreateCategory = () => {
		setEditingCategory(null);
		categoryForm.setFieldsValue({
			name: "",
			description: "",
			tier: 1,
			isActive: true,
		});
		setCategoryModalOpen(true);
	};

	const openEditCategory = (category: SignalCategoryRow) => {
		setEditingCategory(category);
		categoryForm.setFieldsValue({
			name: category.name,
			description: category.description ?? "",
			tier: category.tier,
			isActive: category.is_active,
		});
		setCategoryModalOpen(true);
	};

	const saveCategory = async () => {
		const values = await categoryForm.validateFields();
		if (editingCategory) {
			await updateCategory.mutateAsync({
				id: editingCategory.id,
				code: editingCategory.code,
				name: values.name.trim(),
				description: values.description?.trim() || null,
				tier: values.tier,
				parentId: editingCategory.parent_id ?? null,
				signalDefinitionId: editingCategory.signal_definition_id ?? null,
				isActive: values.isActive,
			});
			message.success("Category updated");
		} else {
			await createCategory.mutateAsync({
				code: autoCode(),
				name: values.name.trim(),
				description: values.description?.trim() || null,
				tier: values.tier,
				isActive: values.isActive,
			});
			message.success("Category created");
		}
		setCategoryModalOpen(false);
	};

	const openCreateSignal = (parentCategoryId?: string) => {
		setSourceSignal(null);
		setSignalSubcatRow(null);
		setSignalParentCategoryId(parentCategoryId ?? null);
		setSignalExistingCategoryId(null);
		signalForm.resetFields();
		signalForm.setFieldsValue({
			parentCategoryId: parentCategoryId,
			signalTypeId: categoryBasedTypeId ?? undefined,
			isActive: true,
			gicsCodes: [],
			phrases: [],
		});
		setSignalModalOpen(true);
	};

	const openCreateSignalForSubcat = (subcatRow: SignalCategoryRow) => {
		setSourceSignal(null);
		setSignalSubcatRow(subcatRow);
		setSignalParentCategoryId(null);
		setSignalExistingCategoryId(subcatRow.id);
		signalForm.resetFields();
		signalForm.setFieldsValue({
			signalTypeId: categoryBasedTypeId ?? undefined,
			isActive: true,
			gicsCodes: [],
			phrases: [],
		});
		setSignalModalOpen(true);
	};

	const openEditSubcat = (subcat: SignalCategoryRow) => {
		setEditingSubcat(subcat);
		subcatForm.resetFields();
		subcatForm.setFieldsValue({
			name: subcat.name,
			isActive: subcat.is_active,
		});
		setSubcatModalOpen(true);
	};

	const saveSubcat = async () => {
		if (!editingSubcat) return;
		const values = await subcatForm.validateFields();
		await updateCategory.mutateAsync({
			id: editingSubcat.id,
			code: editingSubcat.code,
			name: values.name.trim(),
			description: editingSubcat.description ?? null,
			tier: editingSubcat.tier ?? 2,
			parentId: editingSubcat.parent_id ?? null,
			signalDefinitionId: editingSubcat.signal_definition_id ?? null,
			isActive: values.isActive,
		});
		message.success("Subcategory updated");
		setSubcatModalOpen(false);
	};

	const openCreateSignalVersion = (
		signal: SignalDefinitionRow,
		subcatRow: SignalCategoryRow,
	) => {
		setSourceSignal(signal);
		setSignalSubcatRow(subcatRow);
		setSignalParentCategoryId(null);
		setSignalExistingCategoryId(null);
		signalForm.resetFields();
		signalForm.setFieldsValue({
			name: signal.name,
			description: signal.description,
			signalTypeId: categoryBasedTypeId ?? signal.signal_type_id,
			isActive: true,
			gicsCodes: signal.gics_codes,
			phrases: signal.search_phrases.map((p) => ({ phrase: p.phrase })),
		});
		setSignalModalOpen(true);
	};

	const saveSignal = async () => {
		const values = await signalForm.validateFields();
		const code = sourceSignal ? sourceSignal.code : autoCode();
		const phrases = (values.phrases ?? [])
			.filter((item) => item.phrase?.trim())
			.map((item, index) => ({
				phrase: item.phrase.trim(),
				phraseType: "core",
				languageCode: "en",
				priority: (index + 1) * 10,
				isActive: true,
			}));
		await createSignal.mutateAsync({
			sourceSignalId: sourceSignal?.id ?? null,
			code,
			name: values.name.trim(),
			description: values.description.trim(),
			signalTypeId: values.signalTypeId,
			...(sourceSignal
				? { categoryId: sourceSignal.category_id ?? null }
				: signalExistingCategoryId
					? { categoryId: signalExistingCategoryId }
					: { parentCategoryId: values.parentCategoryId ?? null }),
			scope: "company",
			searchLevel: "entity",
			requiresCompanyBinding: true,
			isActive: values.isActive,
			gicsCodes: sourceIsUniversal ? [] : (values.gicsCodes ?? []),
			searchPhrases: phrases,
		});
		message.success(sourceSignal ? "Signal version created" : "Signal created");
		setSignalModalOpen(false);
	};

	const categoryColumns: ColumnsType<SignalCategoryRow> = [
		{
			title: "Category",
			dataIndex: "name",
			render: (name: string, row) => (
				<Space orientation="vertical" size={1}>
					<Text style={{ color: "#d9d9d9" }}>{name}</Text>
					<Text code style={{ color: "#595959", fontSize: 11 }}>
						{row.code}
					</Text>
				</Space>
			),
		},
		{
			title: "Description",
			dataIndex: "description",
			render: (v: string | null) =>
				v ? (
					<Text style={{ color: "#8c8c8c" }}>{v}</Text>
				) : (
					<Text style={{ color: "#595959" }}>—</Text>
				),
		},
		{
			title: "Subcategories",
			dataIndex: "child_count",
			width: 120,
			render: (count: number) => <Tag>{count}</Tag>,
		},
		{
			title: "Status",
			dataIndex: "is_active",
			width: 100,
			render: (v: boolean) => (
				<Tag color={v ? "success" : "default"}>{v ? "active" : "inactive"}</Tag>
			),
		},
		{
			title: "",
			key: "actions",
			width: 140,
			render: (_: unknown, row) => (
				<Space size={8}>
					<Button
						size="small"
						type="primary"
						icon={<PlusOutlined />}
						onClick={() => openCreateSignal(row.id)}
					>
						Add Signal
					</Button>
					<Button
						size="small"
						icon={<EditOutlined />}
						onClick={() => openEditCategory(row)}
					/>
				</Space>
			),
		},
	];

	return (
		<Layout style={{ minHeight: "100vh", background: BG }}>
			<Content style={{ padding: 24, background: BG, minHeight: "100vh" }}>
				<div style={{ maxWidth: 1400, width: "100%" }}>
					<div style={{ marginBottom: 24 }}>
						<DeepDiveBreadcrumbs
							items={[
								{ label: "Sales Miner", href: "/sales-miner" },
								{ label: "Signal Catalog" },
							]}
						/>
						<Space size="middle" align="center" wrap style={{ marginTop: 8 }}>
							<Button
								icon={<ArrowLeftOutlined />}
								onClick={() => router.push("/sales-miner")}
							>
								Back
							</Button>
							<Title level={2} style={{ margin: 0, color: "#58bfce" }}>
								Signal Catalog
							</Title>
						</Space>
					</div>

					<Tabs
						defaultActiveKey="v1"
						items={[
							{
								key: "v1",
								label: "V1",
								children: (
									<Card style={DARK_CARD_STYLE}>
										<Space
											orientation="vertical"
											size="middle"
											style={{ width: "100%" }}
										>
											{categoriesQuery.error ? (
												<Text type="danger">
													{categoriesQuery.error instanceof Error
														? categoriesQuery.error.message
														: "Failed to load categories"}
												</Text>
											) : null}
											<Space wrap>
												<Input
													prefix={<SearchOutlined />}
													value={categorySearch}
													onChange={(e) => {
														setCategoryPage(1);
														setCategorySearch(e.target.value);
													}}
													placeholder="Search categories"
													style={{ width: 320 }}
													allowClear
												/>
												<Button
													type="primary"
													icon={<PlusOutlined />}
													onClick={openCreateCategory}
												>
													Add Category
												</Button>
											</Space>
											<Table<SignalCategoryRow>
												rowKey="id"
												columns={categoryColumns}
												dataSource={parentCategories}
												loading={categoriesQuery.isLoading}
												expandable={{
													expandedRowRender: (row) => (
														<SubcategoriesTable
															parentId={row.id}
															onNewVersion={openCreateSignalVersion}
															onAddSignal={openCreateSignalForSubcat}
															onEditSubcat={openEditSubcat}
														/>
													),
													rowExpandable: (row) => row.child_count > 0,
												}}
												pagination={{
													current: categoryPage,
													pageSize: categoryPageSize,
													total: categoriesQuery.data?.data.total ?? 0,
													showSizeChanger: true,
													pageSizeOptions: ["10", "20", "50", "100"],
													showTotal: (total) => `${total} categories`,
												}}
												onChange={(pagination) => {
													setCategoryPage(pagination.current ?? 1);
													setCategoryPageSize(pagination.pageSize ?? 20);
												}}
											/>
										</Space>
									</Card>
								),
							},
							{
								key: "v2",
								label: "V2",
								children: (
									<Space
										orientation="vertical"
										size="middle"
										style={{ width: "100%" }}
									>
										<Space>
											<Button
												icon={<UploadOutlined />}
												onClick={() => importRef.current?.openFileDialog()}
											>
												Import XLSX
											</Button>
											<Button
												icon={<DownloadOutlined />}
												onClick={() => {
													exportSignalModel.mutate(undefined, {
														onError: () => void message.error("Export failed"),
													});
												}}
												loading={exportSignalModel.isPending}
											>
												Export XLSX
											</Button>
										</Space>
										<SignalModelImport
											ref={importRef}
											onImported={() => void categoriesQuery.refetch()}
										/>
										<SmSignalModelView />
									</Space>
								),
							},
						]}
					/>
				</div>

				{/* Category create/edit modal */}
				<Modal
					title={editingCategory ? "Edit Category" : "Add Category"}
					open={categoryModalOpen}
					onCancel={() => setCategoryModalOpen(false)}
					onOk={() => {
						saveCategory().catch((error) => {
							message.error(
								error instanceof Error
									? error.message
									: "Failed to save category",
							);
						});
					}}
					confirmLoading={createCategory.isPending || updateCategory.isPending}
					width={560}
					destroyOnHidden
				>
					<Form form={categoryForm} layout="vertical" requiredMark={false}>
						<Form.Item name="name" label="Name" rules={[{ required: true }]}>
							<Input />
						</Form.Item>
						<Form.Item name="description" label="Description">
							<TextArea rows={3} />
						</Form.Item>
						<Form.Item
							name="tier"
							label="Tier"
							rules={[{ required: true }]}
							style={{ width: 120 }}
						>
							<InputNumber min={1} style={{ width: "100%" }} />
						</Form.Item>
						<Form.Item name="isActive" valuePropName="checked">
							<Checkbox>Active</Checkbox>
						</Form.Item>
					</Form>
				</Modal>

				{/* Signal create / new version modal */}
				<Modal
					title={sourceSignal ? "Create Signal Version" : "Add Signal"}
					open={signalModalOpen}
					onCancel={() => setSignalModalOpen(false)}
					onOk={() => {
						saveSignal().catch((error) => {
							message.error(extractApiError(error, "Failed to save signal"));
						});
					}}
					confirmLoading={createSignal.isPending}
					width={820}
					destroyOnHidden
				>
					<Form form={signalForm} layout="vertical" requiredMark={false}>
						{sourceSignal && (
							<Text
								style={{ color: "#8c8c8c", display: "block", marginBottom: 16 }}
							>
								Source signal: #{sourceSignal.id} {sourceSignal.name}
							</Text>
						)}
						{signalExistingCategoryId && !sourceSignal && (
							<Text
								style={{ color: "#8c8c8c", display: "block", marginBottom: 16 }}
							>
								Subcategory: {signalSubcatRow?.name}
							</Text>
						)}
						<Form.Item name="name" label="Name" rules={[{ required: true }]}>
							<Input />
						</Form.Item>
						<Form.Item
							name="description"
							label="Description"
							rules={[{ required: true }]}
						>
							<TextArea rows={4} />
						</Form.Item>
						<Form.Item
							name="signalTypeId"
							label="Signal Type"
							rules={[{ required: true, message: "Select signal type" }]}
						>
							<Select options={signalTypeOptions} disabled />
						</Form.Item>
						{!sourceSignal && !signalExistingCategoryId && (
							<Form.Item
								name="parentCategoryId"
								label="Category"
								rules={
									signalParentCategoryId
										? undefined
										: [{ required: true, message: "Select category" }]
								}
							>
								<Select
									options={parentCategoryOptions}
									disabled={signalParentCategoryId !== null}
									showSearch
									optionFilterProp="label"
									placeholder="Select category..."
								/>
							</Form.Item>
						)}
						<Form.Item
							name="gicsCodes"
							label={
								<Space size={4}>
									<span>GICS Codes</span>
									{universalExists && !sourceIsUniversal && (
										<Tag color="warning" style={{ margin: 0 }}>
											required — universal signal exists
										</Tag>
									)}
									{sourceIsUniversal && (
										<Tag color="default" style={{ margin: 0 }}>
											universal — locked
										</Tag>
									)}
								</Space>
							}
							rules={[
								...(universalExists && !sourceIsUniversal
									? [
											{
												required: true,
												type: "array",
												min: 1,
												message: "Select at least one GICS code",
											} as const,
										]
									: []),
								{
									validator: async (
										_: unknown,
										value: string[] | undefined,
									) => {
										if (!value || value.length === 0 || !validationSubcatId)
											return;
										const currentSignals = subcatCurrentSignals?.data ?? [];
										const sourceCode = sourceSignal?.code ?? null;
										for (const sig of currentSignals) {
											if (sig.link_type !== "industry") continue;
											if (sourceCode !== null && sig.code === sourceCode)
												continue;
											const conflictCode = value.find((gc) =>
												sig.gics_codes.includes(gc),
											);
											if (conflictCode) {
												return Promise.reject(
													new Error(
														`GICS code ${conflictCode} is already covered by "${sig.name}"`,
													),
												);
											}
										}
									},
								},
							]}
						>
							<TreeSelect
								treeData={gicsTree}
								multiple
								showSearch
								filterTreeNode={(input, node) => {
									const code = String(node.value ?? "");
									const title = String(node.title ?? "");
									const namePart = title.split(" — ").slice(1).join(" — ");
									return (
										code.startsWith(input) ||
										namePart.toLowerCase().includes(input.toLowerCase())
									);
								}}
								placeholder={
									sourceIsUniversal
										? "Universal signal — no GICS codes"
										: "Select GICS codes (leave empty for universal)"
								}
								disabled={sourceIsUniversal}
								style={{ width: "100%" }}
								dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
								allowClear
								treeDefaultExpandAll={false}
							/>
						</Form.Item>
						<Form.Item label="Search Phrases">
							<Form.List name="phrases">
								{(fields, { add, remove }) => (
									<div
										style={{ display: "flex", flexDirection: "column", gap: 6 }}
									>
										{fields.map(({ key, name: fieldName }) => (
											<Space key={key} align="center">
												<Form.Item
													name={[fieldName, "phrase"]}
													noStyle
													rules={[{ required: true, message: "Enter phrase" }]}
												>
													<Input
														placeholder="Enter search phrase"
														style={{ width: 540 }}
													/>
												</Form.Item>
												<Button
													type="text"
													danger
													icon={<DeleteOutlined />}
													onClick={() => remove(fieldName)}
												/>
											</Space>
										))}
										<Button
											type="dashed"
											onClick={() => add({ phrase: "" })}
											icon={<PlusOutlined />}
											style={{ width: 200, marginTop: 4 }}
										>
											Add phrase
										</Button>
									</div>
								)}
							</Form.List>
						</Form.Item>
						<Form.Item name="isActive" valuePropName="checked">
							<Checkbox>Active</Checkbox>
						</Form.Item>
					</Form>
				</Modal>

				{/* Subcategory edit modal */}
				<Modal
					title="Edit Subcategory"
					open={subcatModalOpen}
					onCancel={() => setSubcatModalOpen(false)}
					onOk={() => {
						saveSubcat().catch((error) => {
							message.error(
								error instanceof Error
									? error.message
									: "Failed to save subcategory",
							);
						});
					}}
					confirmLoading={updateCategory.isPending}
					width={480}
					destroyOnHidden
				>
					<Form form={subcatForm} layout="vertical" requiredMark={false}>
						<Form.Item name="name" label="Name" rules={[{ required: true }]}>
							<Input />
						</Form.Item>
						<Form.Item name="isActive" valuePropName="checked">
							<Checkbox>Active</Checkbox>
						</Form.Item>
					</Form>
				</Modal>
			</Content>
		</Layout>
	);
}
