"use client";

import { PlusOutlined } from "@ant-design/icons";
import {
	App,
	Button,
	Card,
	Input,
	Modal,
	Select,
	Space,
	Table,
	Tag,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import {
	type SalesMinerCustomerListRow,
	useCreateSalesMinerCustomer,
	useSalesMinerCustomersList,
} from "../../hooks/api/useSalesMinerCustomersService";
import {
	useSearchCompanies,
	type CompanySearchResult,
} from "../../hooks/api/useDeepDiveService";
import CreateCompanyModal from "../deep-dive/create-company-modal";

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
	const [createOpen, setCreateOpen] = useState(false);
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
		<Space.Compact style={{ width: "100%" }}>
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
			<Button
				icon={<PlusOutlined />}
				disabled={disabled}
				onClick={() => setCreateOpen(true)}
				title="Create new company"
			/>
			<CreateCompanyModal
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				onCreated={(company) => onChange(company)}
				variant="sales-miner"
			/>
		</Space.Compact>
	);
}

function SalesMinerCustomersContent() {
	const { message } = App.useApp();
	const router = useRouter();
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [searchInput, setSearchInput] = useState("");
	const [appliedSearch, setAppliedSearch] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [createCompany, setCreateCompany] =
		useState<CompanySearchResult | null>(null);
	const [createName, setCreateName] = useState("");

	const { data, isLoading } = useSalesMinerCustomersList({
		page,
		limit: pageSize,
		q: appliedSearch,
	});
	const createCustomer = useCreateSalesMinerCustomer();

	const submitCreate = useCallback(async () => {
		if (!createCompany) {
			message.warning("Select primary company");
			return;
		}
		const dn = createName.trim();
		if (!dn) {
			message.warning("Enter display name");
			return;
		}
		try {
			await createCustomer.mutateAsync({
				companyId: createCompany.id,
				displayName: dn,
			});
			message.success("Customer created");
			setCreateOpen(false);
			setCreateCompany(null);
			setCreateName("");
		} catch (err) {
			message.error(apiErr(err));
		}
	}, [createCompany, createCustomer, createName, message]);

	const items = data?.data.items ?? [];
	const total = data?.data.total ?? 0;

	const columns: ColumnsType<SalesMinerCustomerListRow> = [
		{
			title: "ID",
			dataIndex: "id",
			width: 100,
			render: (v: string) => <Text code>{v}</Text>,
		},
		{
			title: "Display name",
			dataIndex: "display_name",
			ellipsis: true,
		},
		{
			title: "Company",
			key: "co",
			ellipsis: true,
			render: (_, r) => (
				<span>
					{r.companies.name} <Text type="secondary">#{r.companies.id}</Text>
				</span>
			),
		},
		{
			title: "Accounts",
			key: "ac",
			width: 110,
			align: "center",
			render: (_, r) => r._count.customer_accounts,
		},
		{
			title: "Active",
			dataIndex: "is_active",
			width: 88,
			render: (v: boolean) => (
				<Tag color={v ? "green" : "default"}>{v ? "yes" : "no"}</Tag>
			),
		},
	];

	return (
		<>
			<Card
				style={{ ...DARK_CARD_STYLE, marginBottom: 16 }}
				styles={{ body: { padding: 16 } }}
			>
				<Space wrap>
					<Input.Search
						placeholder="Search by display name"
						allowClear
						style={{ width: 280 }}
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						onSearch={(v) => {
							setAppliedSearch(v.trim());
							setPage(1);
						}}
					/>
					<Button
						type="primary"
						icon={<PlusOutlined />}
						onClick={() => setCreateOpen(true)}
					>
						New customer
					</Button>
				</Space>
			</Card>

			<Card style={DARK_CARD_STYLE} styles={{ body: { padding: 0 } }}>
				<Table<SalesMinerCustomerListRow>
					rowKey="id"
					loading={isLoading}
					dataSource={items}
					columns={columns}
					onRow={(record) => ({
						onClick: () => router.push(`/sales-miner/customers/${record.id}`),
						style: { cursor: "pointer" },
					})}
					pagination={{
						current: page,
						pageSize,
						total,
						showSizeChanger: true,
						pageSizeOptions: ["10", "20", "50"],
						onChange: (p, ps) => {
							setPage(p);
							setPageSize(ps);
						},
					}}
				/>
			</Card>

			<Modal
				title="New customer"
				open={createOpen}
				onCancel={() => {
					setCreateOpen(false);
					setCreateCompany(null);
					setCreateName("");
				}}
				onOk={() => void submitCreate()}
				okButtonProps={{ loading: createCustomer.isPending }}
				width={560}
				destroyOnHidden
			>
				<Space orientation="vertical" style={{ width: "100%" }} size="middle">
					<div>
						<Text strong>Primary company</Text>
						<div style={{ marginTop: 8 }}>
							<CompanySearchSelect
								value={createCompany}
								onChange={(company) => {
									setCreateCompany(company);
									if (company) setCreateName(company.name);
								}}
								placeholder="Search company for customer root…"
							/>
						</div>
					</div>
					<div>
						<Text strong>Display name</Text>
						<Input
							style={{ marginTop: 8 }}
							value={createName}
							onChange={(e) => setCreateName(e.target.value)}
							placeholder="Customer display name"
						/>
					</div>
				</Space>
			</Modal>
		</>
	);
}

export function SalesMinerCustomersEmbedded() {
	return (
		<App>
			<SalesMinerCustomersContent />
		</App>
	);
}
