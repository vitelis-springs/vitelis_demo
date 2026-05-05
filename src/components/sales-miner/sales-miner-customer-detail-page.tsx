"use client";

import {
	App,
	Button,
	Card,
	Descriptions,
	Divider,
	Form,
	Input,
	Modal,
	Select,
	Space,
	Switch,
	Table,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import { useAuth } from "../../hooks/useAuth";
import {
	type SalesMinerCustomerDetail,
	useCreateSalesMinerCustomerAccount,
	useCreateSalesMinerSubsidiary,
	useSalesMinerCustomerDetail,
	useUpdateSalesMinerCustomer,
	useUpdateSalesMinerCustomerAccount,
	useUpdateSalesMinerSubsidiary,
} from "../../hooks/api/useSalesMinerCustomersService";
import {
	type CompanySearchResult,
	useSearchCompanies,
} from "../../hooks/api/useDeepDiveService";
import DeepDivePageLayout from "../deep-dive/shared/page-layout";
import PageHeader from "../deep-dive/shared/page-header";

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

type AccountSubsidiaryRow =
	SalesMinerCustomerDetail["customer_accounts"][number]["customer_account_subsidiaries"][number];

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
	const createAccount = useCreateSalesMinerCustomerAccount(customerId);
	const updateAccount = useUpdateSalesMinerCustomerAccount(customerId);
	const createSubsidiary = useCreateSalesMinerSubsidiary(customerId);
	const updateSubsidiary = useUpdateSalesMinerSubsidiary(customerId);

	const [form] = Form.useForm<{ displayName: string; isActive: boolean }>();
	const [accountModalOpen, setAccountModalOpen] = useState(false);
	const [accountCompany, setAccountCompany] =
		useState<CompanySearchResult | null>(null);
	const [subsidiaryModal, setSubsidiaryModal] = useState<{
		accountId: string;
	} | null>(null);
	const [subCompany, setSubCompany] = useState<CompanySearchResult | null>(
		null,
	);
	const [editModalOpen, setEditModalOpen] = useState(false);

	useEffect(() => {
		const t = setTimeout(() => setBoot(false), 100);
		return () => clearTimeout(t);
	}, []);

	useEffect(() => {
		if (!boot && !isLoggedIn) router.push("/");
	}, [boot, isLoggedIn, router]);

	useEffect(() => {
		if (!detail) return;
		form.setFieldsValue({
			displayName: detail.display_name,
			isActive: detail.is_active,
		});
	}, [detail, form]);

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

	const submitSubsidiary = useCallback(async () => {
		if (!subsidiaryModal || !subCompany) {
			message.warning("Select a subsidiary company");
			return;
		}
		try {
			await createSubsidiary.mutateAsync({
				accountId: subsidiaryModal.accountId,
				subsidiaryCompanyId: subCompany.id,
			});
			message.success("Subsidiary linked");
			setSubsidiaryModal(null);
			setSubCompany(null);
		} catch (err) {
			message.error(apiErr(err));
		}
	}, [createSubsidiary, message, subCompany, subsidiaryModal]);

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
							onClick={() => router.push("/sales-miner/customers")}
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
					{ label: "Customers", href: "/sales-miner/customers" },
					{ label: detail ? detail.display_name : `Customer #${customerId}` },
				]}
				title={detail ? detail.display_name : `Customer #${customerId}`}
			/>

			{isLoading || !detail ? (
				<Card style={DARK_CARD_STYLE}>
					<Text type="secondary">Loading…</Text>
				</Card>
			) : (
				<>
					<Card style={{ ...DARK_CARD_STYLE, marginBottom: 16 }}>
						<Space
							align="start"
							justify="space-between"
							style={{ width: "100%", marginBottom: 16 }}
						>
							<div>
								<Text strong style={{ display: "block", marginBottom: 4 }}>
									Customer
								</Text>
								<Text type="secondary">
									Manage root customer settings and linked accounts.
								</Text>
							</div>
							<Button type="primary" onClick={() => setEditModalOpen(true)}>
								Edit
							</Button>
						</Space>
						<Descriptions column={1} size="small" bordered>
							<Descriptions.Item label="Customer ID">
								<Text code>{detail.id}</Text>
							</Descriptions.Item>
							<Descriptions.Item label="Display name">
								{detail.display_name}
							</Descriptions.Item>
							<Descriptions.Item label="Status">
								<Switch checked={detail.is_active} disabled />
							</Descriptions.Item>
							<Descriptions.Item label="Primary company">
								{detail.companies.name}{" "}
								<Text type="secondary">#{detail.companies.id}</Text>
							</Descriptions.Item>
							<Descriptions.Item label="Company ID (DB)">
								{detail.company_id}
							</Descriptions.Item>
						</Descriptions>
					</Card>

					<Card style={DARK_CARD_STYLE}>
						<Divider style={{ marginTop: 0 }}>Accounts</Divider>
						<Button
							type="primary"
							style={{ marginBottom: 12 }}
							onClick={() => setAccountModalOpen(true)}
						>
							Add account
						</Button>
						{detail.customer_accounts.map((acc) => (
							<Card
								key={acc.id}
								size="small"
								title={
									<Space>
										<span>{acc.companies.name}</span>
										<Text type="secondary">#{acc.companies.id}</Text>
										<Switch
											checked={acc.is_active}
											checkedChildren="on"
											unCheckedChildren="off"
											onChange={async (checked) => {
												try {
													await updateAccount.mutateAsync({
														accountId: acc.id,
														isActive: checked,
													});
													message.success("Account updated");
												} catch (err) {
													message.error(apiErr(err));
												}
											}}
										/>
									</Space>
								}
								style={{ marginBottom: 12, ...DARK_CARD_STYLE }}
								extra={
									<Button
										size="small"
										onClick={() => setSubsidiaryModal({ accountId: acc.id })}
									>
										Add subsidiary
									</Button>
								}
							>
								<Table
									size="small"
									pagination={false}
									rowKey="id"
									dataSource={acc.customer_account_subsidiaries}
									columns={
										[
											{
												title: "Subsidiary",
												key: "co",
												render: (_: unknown, row) =>
													`${row.companies.name} (#${row.companies.id})`,
											},
											{
												title: "Relation",
												dataIndex: "relation_type",
												width: 120,
											},
											{
												title: "Active",
												key: "a",
												width: 88,
												render: (_: unknown, row) => (
													<Switch
														size="small"
														checked={row.is_active}
														onChange={async (checked) => {
															try {
																await updateSubsidiary.mutateAsync({
																	subsidiaryId: row.id,
																	isActive: checked,
																});
																message.success("Updated");
															} catch (err) {
																message.error(apiErr(err));
															}
														}}
													/>
												),
											},
										] as ColumnsType<AccountSubsidiaryRow>
									}
								/>
							</Card>
						))}
					</Card>

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
						<Text
							type="secondary"
							style={{ display: "block", marginBottom: 8 }}
						>
							Link another company to this customer (must differ from the
							primary company).
						</Text>
						<CompanySearchSelect
							value={accountCompany}
							onChange={setAccountCompany}
						/>
					</Modal>

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

					<Modal
						title="Add subsidiary"
						open={Boolean(subsidiaryModal)}
						onCancel={() => {
							setSubsidiaryModal(null);
							setSubCompany(null);
						}}
						onOk={() => void submitSubsidiary()}
						okButtonProps={{ loading: createSubsidiary.isPending }}
						destroyOnHidden
					>
						<CompanySearchSelect value={subCompany} onChange={setSubCompany} />
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
