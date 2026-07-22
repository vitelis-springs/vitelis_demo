"use client";

import {
	App,
	Button,
	Card,
	Form,
	Input,
	Modal,
	Select,
	Space,
	Spin,
	Switch,
	Table,
	Tabs,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api-client";
import {
	type CustomerProductRow,
	type SalesMinerCustomerDetail,
	useCreateSalesMinerCustomerAccount,
	useCustomerProducts,
	useSalesMinerCustomerDetail,
	useUpdateSalesMinerCustomer,
	useUpdateSalesMinerCustomerAccount,
} from "../../hooks/api/useSalesMinerCustomersService";
import {
	type CompanyDetail,
	type CompanySearchResult,
	useGetCompany,
	useSearchCompanies,
} from "../../hooks/api/useDeepDiveService";
import DeepDiveList from "../deep-dive/deep-dive-list";
import DeepDivePageLayout from "../deep-dive/shared/page-layout";
import PageHeader from "../deep-dive/shared/page-header";
import CreateCompanyModal from "../deep-dive/create-company-modal";
import ImportAccountsModal from "./import-accounts-modal";
import ImportProductsModal from "./import-products-modal";
import { triggerProductsSetupWebhook } from "../../shared/products-setup-webhook";
import { useGetExecutionDetails } from "../../hooks/api/useN8NService";

function companyDetailToInitialValues(company: CompanyDetail) {
	return {
		name: company.name,
		url: company.url ?? undefined,
		logoUrl: company.logoUrl ?? undefined,
		countryCode: company.countryCode ?? undefined,
		industryId: company.industryId ?? undefined,
		gicsCode: company.gicsCode ?? undefined,
		investPortal: company.investPortal ?? undefined,
		careerPortal: company.careerPortal ?? undefined,
		slug: company.slug ?? undefined,
		reportRole: company.reportRole ?? undefined,
		parentCompanyId: company.parentCompanyId ?? undefined,
		listed: (company.listed === false ? "private" : "public") as
			| "public"
			| "private",
		verified: company.verified,
	};
}

function companyAdditionalDataAsRecord(
	value: unknown,
): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

const { Text } = Typography;

function apiErr(err: unknown): string {
	if (typeof err === "object" && err !== null && "response" in err) {
		const r = err as { response?: { data?: { error?: string } } };
		if (r.response?.data?.error) return r.response.data.error;
	}
	if (err instanceof Error) return err.message;
	return "Request failed";
}

function CompanySearchSelect({
	value,
	onChange,
	disabled,
	placeholder,
}: {
	value: CompanySearchResult | null;
	onChange: (c: CompanySearchResult | null) => void;
	disabled?: boolean;
	placeholder?: string;
}) {
	const [query, setQuery] = useState("");
	const { data: searchResult, isFetching } = useSearchCompanies(query);
	const companies = useMemo(
		() => searchResult?.data ?? [],
		[searchResult?.data],
	);

	const selectOptions = useMemo(() => {
		const base = companies.map((c) => ({
			value: c.id,
			label: `${c.name} (#${c.id})`,
		}));
		if (value && !companies.some((c) => c.id === value.id)) {
			return [
				{ value: value.id, label: `${value.name} (#${value.id})` },
				...base,
			];
		}
		return base;
	}, [companies, value]);

	return (
		<Select
			showSearch
			placeholder={placeholder ?? "Search company…"}
			filterOption={false}
			onSearch={setQuery}
			loading={isFetching}
			style={{ width: "100%" }}
			allowClear
			disabled={disabled}
			onClear={() => {
				setQuery("");
				onChange(null);
			}}
			value={value?.id ?? null}
			onChange={(id) => {
				const found =
					companies.find((c) => c.id === id) ??
					(id === value?.id ? value : null);
				onChange(found);
			}}
			notFoundContent={
				query.trim().length >= 2 && !isFetching ? (
					<Text type="secondary">No companies found</Text>
				) : query.trim().length < 2 ? (
					<Text type="secondary">Type at least 2 characters</Text>
				) : null
			}
			options={selectOptions}
		/>
	);
}

type AccountRow = SalesMinerCustomerDetail["customer_accounts"][number];

function AccountsTab({
	customerId,
	accounts,
}: {
	customerId: string;
	accounts: AccountRow[];
}) {
	const { message } = App.useApp();
	const queryClient = useQueryClient();
	const createAccount = useCreateSalesMinerCustomerAccount(customerId);
	const updateAccount = useUpdateSalesMinerCustomerAccount(customerId);
	const [accountModalOpen, setAccountModalOpen] = useState(false);
	const [accountCompany, setAccountCompany] =
		useState<CompanySearchResult | null>(null);
	const [importModalOpen, setImportModalOpen] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [editCompanyId, setEditCompanyId] = useState<number | null>(null);
	const { data: editCompanyDetail } = useGetCompany(editCompanyId);

	const handleExport = async () => {
		setIsExporting(true);
		try {
			const response = await api.get(
				`/sales-miner/customers/${customerId}/accounts/export`,
				{ responseType: "blob" },
			);
			const url = window.URL.createObjectURL(new Blob([response.data]));
			const a = document.createElement("a");
			a.href = url;
			a.download = `customer-${customerId}-accounts.xlsx`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
		} catch (err) {
			message.error(apiErr(err));
		} finally {
			setIsExporting(false);
		}
	};

	const submitAccount = useCallback(async () => {
		if (!accountCompany) {
			message.warning("Select a company");
			return;
		}
		try {
			await createAccount.mutateAsync({ companyId: accountCompany.id });
			message.success("Account added");
			setAccountModalOpen(false);
			setAccountCompany(null);
		} catch (err) {
			message.error(apiErr(err));
		}
	}, [accountCompany, createAccount, message]);

	const columns: ColumnsType<AccountRow> = [
		{
			title: "#",
			key: "index",
			width: 48,
			render: (_, __, index) => (page - 1) * pageSize + index + 1,
		},
		{
			title: "Company",
			key: "co",
			render: (_, row) => (
				<span>
					{row.companies.name} <Text type="secondary">#{row.companies.id}</Text>
				</span>
			),
		},
		{
			title: "Verified",
			key: "verified",
			width: 110,
			render: (_, row) => (
				<Tag color={row.companies.verified ? "green" : "warning"}>
					{row.companies.verified ? "verified" : "unverified"}
				</Tag>
			),
		},
		{
			title: "Active",
			key: "active",
			width: 100,
			render: (_, row) => (
				<Switch
					checked={row.is_active}
					size="small"
					onChange={async (checked) => {
						try {
							await updateAccount.mutateAsync({
								accountId: row.id,
								isActive: checked,
							});
							message.success("Account updated");
						} catch (err) {
							message.error(apiErr(err));
						}
					}}
				/>
			),
		},
		{
			title: "",
			key: "actions",
			width: 90,
			render: (_, row) => (
				<Button size="small" onClick={() => setEditCompanyId(row.companies.id)}>
					Edit
				</Button>
			),
		},
	];

	return (
		<Card style={DARK_CARD_STYLE} styles={{ body: { padding: 16 } }}>
			<Space style={{ marginBottom: 12 }}>
				<Button type="primary" onClick={() => setAccountModalOpen(true)}>
					Add account
				</Button>
				<Button onClick={() => setImportModalOpen(true)}>
					Import from XLSX
				</Button>
				<Button loading={isExporting} onClick={() => void handleExport()}>
					Export to XLSX
				</Button>
			</Space>
			<Table<AccountRow>
				size="small"
				rowKey="id"
				pagination={{
					current: page,
					pageSize,
					showSizeChanger: true,
					pageSizeOptions: ["10", "20", "50"],
					onChange: (p, ps) => {
						setPage(p);
						setPageSize(ps);
					},
				}}
				dataSource={accounts}
				columns={columns}
			/>

			<Modal
				title="Add account"
				open={accountModalOpen}
				onCancel={() => {
					setAccountModalOpen(false);
					setAccountCompany(null);
				}}
				onOk={() => void submitAccount()}
				okButtonProps={{ loading: createAccount.isPending }}
				destroyOnHidden
			>
				<Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
					Link another company to this customer (must differ from the primary
					company).
				</Text>
				<CompanySearchSelect
					value={accountCompany}
					onChange={setAccountCompany}
				/>
			</Modal>

			<ImportAccountsModal
				open={importModalOpen}
				onClose={() => setImportModalOpen(false)}
				customerId={customerId}
				existingCompanyIds={accounts.map((a) => a.company_id)}
				onImported={() => {
					void queryClient.invalidateQueries({
						queryKey: ["sales-miner", "customers", "detail", customerId],
					});
				}}
			/>

			{editCompanyDetail?.data && (
				<CreateCompanyModal
					open={editCompanyId != null}
					onClose={() => setEditCompanyId(null)}
					mode="edit"
					companyId={editCompanyId ?? undefined}
					variant="sales-miner"
					title={`Edit company: ${editCompanyDetail.data.name}`}
					initialValues={companyDetailToInitialValues(editCompanyDetail.data)}
					initialAdditionalData={companyAdditionalDataAsRecord(
						editCompanyDetail.data.additionalData,
					)}
					onUpdated={() => {
						void queryClient.invalidateQueries({
							queryKey: ["sales-miner", "customers", "detail", customerId],
						});
						setEditCompanyId(null);
					}}
				/>
			)}
		</Card>
	);
}

const FIELD_LABEL_STYLE = {
	display: "block",
	marginBottom: 4,
	color: "#58bfce",
	fontSize: 12,
	fontWeight: 600,
};

const FIELD_BLOCK_STYLE = {
	paddingBottom: 12,
	borderBottom: "1px solid var(--chart-border)",
};

function formatMetaLabel(key: string): string {
	return key
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * L3 rows (from XLSX import) store meta as { additional_data: {...flat
 * strings} }. L2 rows (from the AI "L2 generate description" workflow) store
 * a richer, flat object directly on meta — no additional_data wrapper, and
 * values can be strings, arrays, or nested objects. Handle both shapes.
 */
function metaTopLevelEntries(meta: unknown): Array<[string, unknown]> {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
	const obj = meta as Record<string, unknown>;
	const additionalData = obj.additional_data;
	const source =
		additionalData &&
		typeof additionalData === "object" &&
		!Array.isArray(additionalData)
			? (additionalData as Record<string, unknown>)
			: obj;
	return Object.entries(source).filter(
		([, value]) => value !== null && value !== undefined && value !== "",
	);
}

function renderMetaValue(value: unknown): ReactNode {
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return <span style={{ whiteSpace: "pre-wrap" }}>{String(value)}</span>;
	}
	if (Array.isArray(value)) {
		if (value.every((v) => typeof v === "string" || typeof v === "number")) {
			return (
				<ul style={{ margin: 0, paddingLeft: 20 }}>
					{value.map((v, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static list rendered once per view
						<li key={i}>{String(v)}</li>
					))}
				</ul>
			);
		}
	}
	return (
		<pre
			style={{
				whiteSpace: "pre-wrap",
				fontSize: 12,
				margin: 0,
				fontFamily: "inherit",
			}}
		>
			{JSON.stringify(value, null, 2)}
		</pre>
	);
}

type ProductActiveFilter = "active" | "inactive" | "all";
type ProductLevelFilter = "all" | "l2" | "l3";
type ProductTreeRow = CustomerProductRow & { children?: CustomerProductRow[] };

function ProductPortfolioTab({ customerId }: { customerId: string }) {
	const { message } = App.useApp();
	const queryClient = useQueryClient();
	const [importModalOpen, setImportModalOpen] = useState(false);
	const [isRegenerating, setIsRegenerating] = useState(false);
	const [activeFilter, setActiveFilter] =
		useState<ProductActiveFilter>("active");
	const [levelFilter, setLevelFilter] = useState<ProductLevelFilter>("all");
	const [pollForPending, setPollForPending] = useState(false);
	const [activeExecutionId, setActiveExecutionId] = useState<string | null>(
		null,
	);
	const [viewProductId, setViewProductId] = useState<string | null>(null);

	const { data, isLoading } = useCustomerProducts(customerId, {
		refetchInterval: pollForPending || isRegenerating ? 4000 : false,
	});

	const { data: executionDetails } = useGetExecutionDetails(
		activeExecutionId,
		"salesminer",
		{ refetchInterval: 4000 },
	);

	const allProducts = useMemo(() => data?.data ?? [], [data]);

	const hasPendingL2 = useMemo(
		() =>
			allProducts.some(
				(p) => p.product_level === "l2" && p.is_active && !p.description.trim(),
			),
		[allProducts],
	);

	useEffect(() => {
		setPollForPending(hasPendingL2);
	}, [hasPendingL2]);

	const regenerateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	useEffect(
		() => () => {
			if (regenerateTimeoutRef.current) {
				clearTimeout(regenerateTimeoutRef.current);
			}
		},
		[],
	);

	const productsQueryKey = useMemo(
		() => ["sales-miner", "customer-products", customerId] as const,
		[customerId],
	);

	// Precise completion signal from n8n's own execution status, in addition
	// to the blank-description heuristic above — stops the moment the
	// workflow actually finishes instead of waiting out a fixed window.
	useEffect(() => {
		if (!executionDetails?.finished) return;
		const ok = executionDetails.status === "completed";
		if (ok) {
			message.success("Description & tags generation completed");
		} else {
			message.error(
				`AI workflow finished with status "${executionDetails.status}"`,
				8,
			);
		}
		setActiveExecutionId(null);
		if (regenerateTimeoutRef.current) {
			clearTimeout(regenerateTimeoutRef.current);
		}
		setIsRegenerating(false);
		void queryClient.invalidateQueries({ queryKey: productsQueryKey });
	}, [executionDetails, message, queryClient, productsQueryKey]);

	const nameById = useMemo(() => {
		const map = new Map<string, string>();
		for (const p of allProducts) map.set(p.id, p.name);
		return map;
	}, [allProducts]);

	const viewProduct = useMemo(
		() => allProducts.find((p) => p.id === viewProductId) ?? null,
		[allProducts, viewProductId],
	);

	const filteredFlat = useMemo(
		() =>
			allProducts.filter((p) => {
				if (activeFilter === "active" && !p.is_active) return false;
				if (activeFilter === "inactive" && p.is_active) return false;
				if (levelFilter !== "all" && p.product_level !== levelFilter)
					return false;
				return true;
			}),
		[allProducts, activeFilter, levelFilter],
	);

	const treeData = useMemo<ProductTreeRow[]>(() => {
		if (levelFilter !== "all") return filteredFlat;
		const byParent = new Map<string, CustomerProductRow[]>();
		for (const p of filteredFlat) {
			if (p.product_level !== "l3" || !p.parent_id) continue;
			const arr = byParent.get(p.parent_id) ?? [];
			arr.push(p);
			byParent.set(p.parent_id, arr);
		}
		return filteredFlat
			.filter((p) => p.product_level === "l2")
			.map((l2) => ({ ...l2, children: byParent.get(l2.id) }));
	}, [filteredFlat, levelFilter]);

	const handleRegenerate = useCallback(async () => {
		setIsRegenerating(true);
		try {
			// The webhook responds immediately with an execution id; the
			// workflow itself keeps running on n8n's side for minutes. If we
			// get an execution id, the effect above tracks it precisely and
			// clears isRegenerating the moment it actually finishes. The timer
			// below is only a safety-net window for the (unexpected) case
			// where no execution id comes back.
			const executionId = await triggerProductsSetupWebhook(customerId);
			message.info(
				"Generation started — this can take a few minutes, the table refreshes automatically",
			);
			void queryClient.invalidateQueries({ queryKey: productsQueryKey });
			if (executionId) {
				setActiveExecutionId(executionId);
				return;
			}
			if (regenerateTimeoutRef.current) {
				clearTimeout(regenerateTimeoutRef.current);
			}
			regenerateTimeoutRef.current = setTimeout(
				() => setIsRegenerating(false),
				3 * 60 * 1000,
			);
		} catch (err) {
			message.error(
				`Failed to start the AI description/tags workflow (${
					err instanceof Error ? err.message : "unknown error"
				})`,
				8,
			);
			setIsRegenerating(false);
		}
	}, [customerId, message, queryClient, productsQueryKey]);

	const baseColumns: ColumnsType<ProductTreeRow> = [
		{
			title: "Name",
			dataIndex: "name",
			render: (name: string, row) => (
				<span>
					{name}{" "}
					<Text type="secondary" style={{ fontSize: 12 }}>
						#{row.id}
					</Text>
				</span>
			),
		},
		{
			title: "Level",
			dataIndex: "product_level",
			width: 80,
			render: (level: string) => (
				<Tag color={level === "l2" ? "blue" : "purple"}>
					{level.toUpperCase()}
				</Tag>
			),
		},
		{
			title: "Active",
			dataIndex: "is_active",
			width: 100,
			render: (isActive: boolean) => (
				<Tag color={isActive ? "green" : "default"}>
					{isActive ? "active" : "inactive"}
				</Tag>
			),
		},
		{
			title: "Description",
			dataIndex: "description",
			render: (description: string, row) => {
				if (
					row.product_level === "l2" &&
					row.is_active &&
					!description.trim()
				) {
					return (
						<Space size={6}>
							<Spin size="small" />
							<Text type="secondary">generating…</Text>
						</Space>
					);
				}
				if (!description.trim()) return <Text type="secondary">—</Text>;
				return (
					<Tooltip title={description}>
						<span>
							{description.length > 140
								? `${description.slice(0, 140)}…`
								: description}
						</span>
					</Tooltip>
				);
			},
		},
		{
			title: "Updated",
			dataIndex: "updated_at",
			width: 160,
			render: (updatedAt: string) => new Date(updatedAt).toLocaleString(),
		},
		{
			title: "",
			key: "actions",
			width: 90,
			render: (_, row) => (
				<Button size="small" onClick={() => setViewProductId(row.id)}>
					View
				</Button>
			),
		},
	];

	const columns: ColumnsType<ProductTreeRow> =
		levelFilter === "l3"
			? [
					baseColumns[0]!,
					{
						title: "Group",
						key: "group",
						width: 180,
						render: (_, row) => nameById.get(row.parent_id ?? "") ?? "—",
					},
					...baseColumns.slice(1),
				]
			: baseColumns;

	return (
		<Card style={DARK_CARD_STYLE} styles={{ body: { padding: 16 } }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: 12,
					marginBottom: 12,
				}}
			>
				<Space wrap>
					<Button type="primary" onClick={() => setImportModalOpen(true)}>
						Import Products from XLSX
					</Button>
					<Button
						loading={isRegenerating}
						disabled={allProducts.length === 0}
						onClick={() => {
							handleRegenerate().catch((err) => {
								console.error("Regenerate failed", err);
							});
						}}
					>
						Regenerate descriptions &amp; tags
					</Button>
					<Select<ProductActiveFilter>
						value={activeFilter}
						onChange={setActiveFilter}
						style={{ width: 140 }}
						options={[
							{ value: "active", label: "Active only" },
							{ value: "inactive", label: "Inactive only" },
							{ value: "all", label: "All statuses" },
						]}
					/>
					<Select<ProductLevelFilter>
						value={levelFilter}
						onChange={setLevelFilter}
						style={{ width: 140 }}
						options={[
							{ value: "all", label: "All levels" },
							{ value: "l2", label: "L2 only" },
							{ value: "l3", label: "L3 only" },
						]}
					/>
				</Space>

				<div style={{ minHeight: 22 }}>
					{activeExecutionId && (
						<Space>
							<Spin size="small" />
							<Text type="secondary">
								Tracking generation run #{activeExecutionId}
								{executionDetails?.status
									? ` (${executionDetails.status})`
									: ""}
							</Text>
						</Space>
					)}
				</div>
			</div>

			<Table<ProductTreeRow>
				rowKey="id"
				size="small"
				loading={isLoading}
				dataSource={treeData}
				columns={columns}
				pagination={{ pageSize: 20 }}
			/>

			<ImportProductsModal
				open={importModalOpen}
				onClose={() => setImportModalOpen(false)}
				customerId={customerId}
				onExecutionStarted={setActiveExecutionId}
			/>

			<Modal
				title={viewProduct?.name}
				open={viewProduct != null}
				onCancel={() => setViewProductId(null)}
				footer={<Button onClick={() => setViewProductId(null)}>Close</Button>}
				width="60vw"
				styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
				destroyOnHidden
			>
				{viewProduct && (
					<Space direction="vertical" size="middle" style={{ width: "100%" }}>
						<Space wrap>
							<Tag
								color={viewProduct.product_level === "l2" ? "blue" : "purple"}
							>
								{viewProduct.product_level.toUpperCase()}
							</Tag>
							<Tag color={viewProduct.is_active ? "green" : "default"}>
								{viewProduct.is_active ? "active" : "inactive"}
							</Tag>
							{viewProduct.parent_id && (
								<Text type="secondary">
									Group: {nameById.get(viewProduct.parent_id) ?? "—"}
								</Text>
							)}
							<Text type="secondary">#{viewProduct.id}</Text>
						</Space>

						<div style={FIELD_BLOCK_STYLE}>
							<Text style={FIELD_LABEL_STYLE}>Description</Text>
							<Text style={{ whiteSpace: "pre-wrap" }}>
								{viewProduct.description.trim() || (
									<Text type="secondary">—</Text>
								)}
							</Text>
						</div>

						{metaTopLevelEntries(viewProduct.meta).map(([key, value]) => (
							<div key={key} style={FIELD_BLOCK_STYLE}>
								<Text style={FIELD_LABEL_STYLE}>{formatMetaLabel(key)}</Text>
								{renderMetaValue(value)}
							</div>
						))}

						<Text type="secondary" style={{ fontSize: 12 }}>
							Created {new Date(viewProduct.created_at).toLocaleString()} ·
							Updated {new Date(viewProduct.updated_at).toLocaleString()}
						</Text>
					</Space>
				)}
			</Modal>
		</Card>
	);
}

function SalesMinerCustomerDetailContent({
	customerId,
}: {
	customerId: string;
}) {
	const { message } = App.useApp();
	const { isLoggedIn, isAdmin } = useAuth();
	const router = useRouter();
	const [boot, setBoot] = useState(true);
	const { data: detailRes, isLoading } =
		useSalesMinerCustomerDetail(customerId);
	const detail = detailRes?.data;
	const updateCustomer = useUpdateSalesMinerCustomer(customerId);

	const [form] = Form.useForm<{ displayName: string; isActive: boolean }>();
	const [editModalOpen, setEditModalOpen] = useState(false);

	useEffect(() => {
		const t = setTimeout(() => setBoot(false), 100);
		return () => clearTimeout(t);
	}, []);

	useEffect(() => {
		if (!boot && !isLoggedIn) router.push("/");
	}, [boot, isLoggedIn, router]);

	useEffect(() => {
		if (!detail || !editModalOpen) return;
		form.setFieldsValue({
			displayName: detail.display_name,
			isActive: detail.is_active,
		});
	}, [detail, editModalOpen, form]);

	const saveCustomer = useCallback(async () => {
		try {
			const v = await form.validateFields();
			await updateCustomer.mutateAsync({
				displayName: v.displayName,
				isActive: v.isActive,
			});
			message.success("Customer updated");
			return true;
		} catch (err) {
			if ((err as { errorFields?: unknown })?.errorFields) return;
			message.error(apiErr(err));
		}
		return false;
	}, [form, message, updateCustomer]);

	if (boot) {
		return (
			<div
				style={{
					minHeight: "100vh",
					background: "#141414",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Text type="secondary">Loading…</Text>
			</div>
		);
	}

	if (!isLoggedIn) return null;

	if (!isAdmin()) {
		return (
			<div
				style={{
					minHeight: "100vh",
					background: "#141414",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Card style={DARK_CARD_STYLE}>
					<Text>Admin access required.</Text>
					<div style={{ marginTop: 16 }}>
						<Button
							type="primary"
							onClick={() => router.push("/sales-miner?tab=customers")}
						>
							Back to customers
						</Button>
					</div>
				</Card>
			</div>
		);
	}

	return (
		<DeepDivePageLayout>
			<PageHeader
				breadcrumbs={[
					{ label: "Sales Miner", href: "/sales-miner" },
					{ label: "Customers", href: "/sales-miner?tab=customers" },
					{ label: detail ? detail.display_name : `Customer #${customerId}` },
				]}
				title={detail ? detail.display_name : `Customer #${customerId}`}
				extra={
					detail && (
						<Space size="middle" align="center">
							<Text type="secondary">Status:</Text>
							<Switch checked={detail.is_active} disabled size="small" />
							<Button onClick={() => setEditModalOpen(true)}>Edit</Button>
						</Space>
					)
				}
			/>

			{isLoading || !detail ? (
				<Card style={DARK_CARD_STYLE}>
					<Text type="secondary">Loading…</Text>
				</Card>
			) : (
				<>
					<Card
						style={{ ...DARK_CARD_STYLE, marginBottom: 16 }}
						styles={{ body: { padding: 16 } }}
					>
						<Space size="middle" wrap>
							<Text type="secondary">Primary company:</Text>
							<Text strong>{detail.companies.name}</Text>
							<Text type="secondary">#{detail.companies.id}</Text>
						</Space>
					</Card>

					<Tabs
						defaultActiveKey="accounts"
						items={[
							{
								key: "accounts",
								label: "Accounts",
								children: (
									<AccountsTab
										customerId={customerId}
										accounts={detail.customer_accounts}
									/>
								),
							},
							{
								key: "reports",
								label: "Reports",
								children: (
									<DeepDiveList
										fixedReportType="sales_miner"
										embedded
										customerId={Number(customerId)}
									/>
								),
							},
							{
								key: "product-portfolio",
								label: "Product Portfolio",
								children: <ProductPortfolioTab customerId={customerId} />,
							},
						]}
					/>

					<Modal
						title="Edit customer"
						open={editModalOpen}
						onCancel={() => {
							setEditModalOpen(false);
							form.setFieldsValue({
								displayName: detail.display_name,
								isActive: detail.is_active,
							});
						}}
						onOk={async () => {
							const ok = await saveCustomer();
							if (ok) {
								setEditModalOpen(false);
							}
						}}
						okText="Save"
						okButtonProps={{ loading: updateCustomer.isPending }}
						destroyOnHidden
					>
						<Form form={form} layout="vertical">
							<Form.Item
								name="displayName"
								label="Display name"
								rules={[{ required: true, message: "Required" }]}
							>
								<Input />
							</Form.Item>
							<Form.Item name="isActive" label="Active" valuePropName="checked">
								<Switch />
							</Form.Item>
						</Form>
					</Modal>
				</>
			)}
		</DeepDivePageLayout>
	);
}

export default function SalesMinerCustomerDetailPage({
	customerId,
}: {
	customerId: string;
}) {
	return (
		<App>
			<SalesMinerCustomerDetailContent customerId={customerId} />
		</App>
	);
}
