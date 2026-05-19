"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	App,
	Button,
	Checkbox,
	Form,
	Input,
	InputNumber,
	Modal,
	Segmented,
	Select,
	Space,
	Spin,
	Switch,
	Tabs,
	Tooltip,
	Typography,
} from "antd";
import {
	BulbOutlined,
	DeleteOutlined,
	LinkOutlined,
	PlusOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import { useGetIndustries } from "../../hooks/api/useIndustriesService";
import {
	useAddCompanyToReport,
	useSearchCompanies,
	type CompanySearchResult,
} from "../../hooks/api/useDeepDiveService";
import { useCustomerCompanies } from "../../hooks/api/useSalesMinerReportsService";
import JsonEditor from "./json-editor";

const { Text } = Typography;

function parseAdditionalData(value: string): Record<string, unknown> | null {
	try {
		const parsed = value.trim() ? JSON.parse(value) : {};
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
			return null;
		return parsed as Record<string, unknown>;
	} catch {
		return null;
	}
}

function stringifyAdditionalData(value: Record<string, unknown>): string {
	return JSON.stringify(value, null, 2);
}

interface Props {
	reportId: number;
	open: boolean;
	onClose: () => void;
	customerId?: number;
	existingCompanyIds?: number[];
}

interface NewCompanyFormValues {
	name: string;
	url?: string;
	countryCode?: string;
	industryId: number;
	slug: string;
	investPortal?: string;
	careerPortal?: string;
	reportRole?: string;
	parentCompanyId?: number;
}

function toSlug(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "_")
		.replace(/[^\w]+/g, "")
		.replace(/_+/g, "_")
		.replace(/^_+/, "")
		.replace(/_+$/, "");
}

function NewCompanyTab({
	reportId,
	onSuccess,
}: {
	reportId: number;
	onSuccess: () => void;
}) {
	const { message } = App.useApp();
	const [form] = Form.useForm<NewCompanyFormValues>();
	const { data: industries, isLoading: industriesLoading } = useGetIndustries();
	const addCompany = useAddCompanyToReport(reportId);
	// tracks whether the user has manually edited the slug
	const slugManuallyEdited = useRef(false);
	const [generating, setGenerating] = useState(false);
	const [additionalDataMode, setAdditionalDataMode] = useState<
		"fields" | "json"
	>("fields");
	const [additionalDataObj, setAdditionalDataObj] = useState<
		Record<string, unknown>
	>({});
	const [additionalDataJson, setAdditionalDataJson] = useState("{}");
	const [newFieldKey, setNewFieldKey] = useState("");
	const [parentSearch, setParentSearch] = useState("");
	const { data: parentSearchResult, isFetching: parentSearchFetching } =
		useSearchCompanies(parentSearch);
	const parentCompanies = parentSearchResult?.data ?? [];
	const watchedName = Form.useWatch("name", form);
	const watchedUrl = Form.useWatch("url", form);
	const canGenerate = !!watchedName?.trim() && !!watchedUrl?.trim();

	const handleGenerate = useCallback(async () => {
		const values = form.getFieldsValue();
		setGenerating(true);
		try {
			const res = await fetch(
				"https://vitelis.app.n8n.cloud/webhook/company-metadata",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: values.name || null,
						url: values.url || null,
						invest_portal: values.investPortal || null,
						career_portal: values.careerPortal || null,
					}),
				},
			);
			if (!res.ok) throw new Error(`Webhook error: ${res.status}`);
			const data = await res.json();
			const jsonStr = JSON.stringify(data, null, 2);
			setAdditionalDataJson(jsonStr);
			if (additionalDataMode === "fields") {
				const parsed = parseAdditionalData(jsonStr);
				if (parsed) setAdditionalDataObj(parsed);
			}
		} catch (err) {
			message.error(err instanceof Error ? err.message : "Webhook call failed");
		} finally {
			setGenerating(false);
		}
	}, [additionalDataMode, form, message]);

	const handleGenerateSlug = useCallback(() => {
		const name = form.getFieldValue("name") as string;
		if (!name?.trim()) {
			message.warning("Enter company name first");
			return;
		}
		const slug = toSlug(name);
		form.setFieldValue("slug", slug);
		form.validateFields(["slug"]);
		slugManuallyEdited.current = true;
	}, [form, message]);

	const handleSubmit = useCallback(
		async (values: NewCompanyFormValues) => {
			let additionalData: unknown = null;
			if (additionalDataMode === "json") {
				if (additionalDataJson.trim() && additionalDataJson.trim() !== "{}") {
					const parsed = parseAdditionalData(additionalDataJson);
					if (!parsed) {
						message.error("Invalid JSON in Additional Data");
						return;
					}
					additionalData = parsed;
				}
			} else {
				additionalData =
					Object.keys(additionalDataObj).length > 0 ? additionalDataObj : null;
			}

			try {
				await addCompany.mutateAsync({
					mode: "new",
					name: values.name,
					url: values.url || null,
					countryCode: values.countryCode || null,
					industryId: values.industryId ?? null,
					slug: values.slug || null,
					investPortal: values.investPortal || null,
					careerPortal: values.careerPortal || null,
					reportRole: values.reportRole || null,
					additionalData,
					parentCompanyId: values.parentCompanyId ?? null,
				});
				message.success("Company created and linked to report");
				form.resetFields();
				slugManuallyEdited.current = false;
				setAdditionalDataMode("fields");
				setAdditionalDataObj({});
				setAdditionalDataJson("{}");
				setNewFieldKey("");
				setParentSearch("");
				onSuccess();
			} catch {
				message.error("Failed to create company");
			}
		},
		[
			addCompany,
			additionalDataJson,
			additionalDataMode,
			additionalDataObj,
			form,
			message,
			onSuccess,
		],
	);

	return (
		<Form form={form} layout="vertical" onFinish={handleSubmit}>
			<div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
				{/* ── left: fields ── */}
				<div style={{ flex: "0 0 360px" }}>
					<Form.Item
						name="name"
						label="Company Name"
						rules={[{ required: true, message: "Company name is required" }]}
					>
						<Input
							placeholder="Acme Corp"
							onBlur={(e) => {
								if (!slugManuallyEdited.current) {
									form.setFieldValue("slug", toSlug(e.target.value));
									form.validateFields(["slug"]);
								}
							}}
						/>
					</Form.Item>

					<Form.Item
						name="slug"
						label="Slug"
						rules={[
							{ required: true, message: "Slug is required" },
							{
								pattern: /^[a-z0-9][a-z0-9_-]*$/,
								message:
									"Only lowercase letters, numbers, hyphens and underscores",
							},
						]}
						extra="Auto-generated from name, you can edit it manually"
					>
						<Input
							placeholder="acme-corp"
							onChange={() => {
								slugManuallyEdited.current = true;
							}}
							addonAfter={
								<Tooltip title="Generate slug from company name">
									<ReloadOutlined
										onClick={handleGenerateSlug}
										style={{ cursor: "pointer" }}
									/>
								</Tooltip>
							}
						/>
					</Form.Item>

					<Form.Item
						name="url"
						label="Website URL"
						rules={[
							{ required: true, message: "Website URL is required" },
							{ type: "url", message: "Enter a valid URL" },
						]}
					>
						<Input placeholder="https://acme.com" />
					</Form.Item>

					<Form.Item
						name="investPortal"
						label="Invest Portal"
						rules={[{ type: "url", message: "Enter a valid URL" }]}
					>
						<Input placeholder="https://investors.acme.com" />
					</Form.Item>

					<Form.Item
						name="careerPortal"
						label="Career Portal"
						rules={[{ type: "url", message: "Enter a valid URL" }]}
					>
						<Input placeholder="https://careers.acme.com" />
					</Form.Item>

					<Form.Item name="countryCode" label="Country Code">
						<Input placeholder="US" maxLength={50} style={{ width: 120 }} />
					</Form.Item>

					<Form.Item
						name="industryId"
						label="Industry"
						rules={[{ required: true, message: "Industry is required" }]}
					>
						<Select
							loading={industriesLoading}
							showSearch
							placeholder="Select industry"
							optionFilterProp="label"
							options={industries?.map((i) => ({ value: i.id, label: i.name }))}
						/>
					</Form.Item>

					<Form.Item name="reportRole" label="Report Role">
						<Input placeholder="e.g. competitor, partner" />
					</Form.Item>

					<Form.Item
						name="parentCompanyId"
						label="Parent Company"
						style={{ marginBottom: 0 }}
					>
						<Select
							showSearch
							allowClear
							placeholder="Search by name or ID..."
							filterOption={false}
							onSearch={setParentSearch}
							loading={parentSearchFetching}
							notFoundContent={
								parentSearch.trim().length >= 2 && !parentSearchFetching ? (
									<Text type="secondary">No companies found</Text>
								) : parentSearch.trim().length < 2 ? (
									<Text type="secondary">Type at least 2 characters</Text>
								) : null
							}
							options={parentCompanies.map((c) => ({
								value: c.id,
								label: `#${c.id} — ${c.name}`,
							}))}
						/>
					</Form.Item>
				</div>

				{/* ── right: additional data ── */}
				<div style={{ flex: 1 }}>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: 8,
						}}
					>
						<Typography.Text style={{ fontSize: 14 }}>
							Additional Data
						</Typography.Text>
						<Space size="small">
							<Button
								size="small"
								icon={<BulbOutlined />}
								loading={generating}
								disabled={!canGenerate}
								onClick={handleGenerate}
							>
								Generate
							</Button>
							<Segmented<"fields" | "json">
								size="small"
								value={additionalDataMode}
								options={[
									{ label: "Fields", value: "fields" },
									{ label: "JSON", value: "json" },
								]}
								onChange={(val) => {
									if (val === "fields") {
										const parsed = parseAdditionalData(additionalDataJson);
										if (!parsed) {
											message.error(
												"Fix invalid JSON before switching to fields",
											);
											return;
										}
										setAdditionalDataObj(parsed);
									} else {
										setAdditionalDataJson(
											stringifyAdditionalData(additionalDataObj),
										);
									}
									setAdditionalDataMode(val);
								}}
							/>
						</Space>
					</div>

					{additionalDataMode === "json" ? (
						<JsonEditor
							value={additionalDataJson}
							onChange={setAdditionalDataJson}
							height="calc(90vh - 370px)"
						/>
					) : (
						<Space
							direction="vertical"
							size="middle"
							style={{
								width: "100%",
								maxHeight: "calc(90vh - 370px)",
								overflowY: "auto",
							}}
						>
							{Object.entries(additionalDataObj).map(([key, value]) => {
								const fieldLabel = (
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											marginBottom: 4,
										}}
									>
										<Text style={{ color: "#8c8c8c", fontSize: 12 }}>
											{key}
										</Text>
										<Button
											type="text"
											size="small"
											icon={<DeleteOutlined />}
											style={{ color: "#595959" }}
											onClick={() =>
												setAdditionalDataObj((prev) => {
													const next = { ...prev };
													delete next[key];
													return next;
												})
											}
										/>
									</div>
								);

								if (typeof value === "boolean") {
									return (
										<div key={key}>
											{fieldLabel}
											<Switch
												checked={value}
												onChange={(checked) =>
													setAdditionalDataObj((prev) => ({
														...prev,
														[key]: checked,
													}))
												}
											/>
										</div>
									);
								}

								if (typeof value === "number") {
									return (
										<div key={key}>
											{fieldLabel}
											<InputNumber
												value={value}
												onChange={(next) =>
													setAdditionalDataObj((prev) => ({
														...prev,
														[key]: next ?? null,
													}))
												}
												style={{ width: "100%" }}
											/>
										</div>
									);
								}

								if (typeof value === "string" || value === null) {
									return (
										<div key={key}>
											{fieldLabel}
											<Input.TextArea
												autoSize={{ minRows: 1, maxRows: 8 }}
												value={value ?? ""}
												onChange={(e) =>
													setAdditionalDataObj((prev) => ({
														...prev,
														[key]: e.target.value,
													}))
												}
											/>
										</div>
									);
								}

								return (
									<div key={key}>
										{fieldLabel}
										<Input.TextArea
											rows={3}
											value={JSON.stringify(value, null, 2)}
											onChange={(e) => {
												try {
													setAdditionalDataObj((prev) => ({
														...prev,
														[key]: JSON.parse(e.target.value),
													}));
												} catch {
													setAdditionalDataObj((prev) => ({
														...prev,
														[key]: e.target.value,
													}));
												}
											}}
										/>
									</div>
								);
							})}

							<div style={{ display: "flex", gap: 8 }}>
								<Input
									value={newFieldKey}
									onChange={(e) => setNewFieldKey(e.target.value)}
									placeholder="New field name"
									onPressEnter={() => {
										const k = newFieldKey.trim();
										if (!k) return;
										if (k in additionalDataObj) {
											message.warning("Field already exists");
											return;
										}
										setAdditionalDataObj((prev) => ({ ...prev, [k]: "" }));
										setNewFieldKey("");
									}}
								/>
								<Button
									icon={<PlusOutlined />}
									onClick={() => {
										const k = newFieldKey.trim();
										if (!k) return;
										if (k in additionalDataObj) {
											message.warning("Field already exists");
											return;
										}
										setAdditionalDataObj((prev) => ({ ...prev, [k]: "" }));
										setNewFieldKey("");
									}}
								>
									Add field
								</Button>
							</div>
						</Space>
					)}
				</div>
			</div>

			<div style={{ textAlign: "right", marginTop: 16 }}>
				<Button
					type="primary"
					htmlType="submit"
					icon={<PlusOutlined />}
					loading={addCompany.isPending}
				>
					Create & Link
				</Button>
			</div>
		</Form>
	);
}

function ExistingCompanyTab({
	reportId,
	onSuccess,
}: {
	reportId: number;
	onSuccess: () => void;
}) {
	const { message } = App.useApp();
	const [query, setQuery] = useState("");
	const [selectedCompany, setSelectedCompany] =
		useState<CompanySearchResult | null>(null);

	const { data: searchResult, isFetching } = useSearchCompanies(query);
	const addCompany = useAddCompanyToReport(reportId);

	const companies = searchResult?.data ?? [];

	const handleLink = useCallback(async () => {
		if (!selectedCompany) return;
		try {
			await addCompany.mutateAsync({
				mode: "existing",
				companyId: selectedCompany.id,
			});
			message.success(`"${selectedCompany.name}" linked to report`);
			setQuery("");
			setSelectedCompany(null);
			onSuccess();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Failed to link company";
			message.error(msg);
		}
	}, [addCompany, message, onSuccess, selectedCompany]);

	return (
		<div style={{ paddingTop: 8 }}>
			<Select
				showSearch
				placeholder="Search by company name..."
				filterOption={false}
				onSearch={setQuery}
				loading={isFetching}
				style={{ width: "100%", marginBottom: 16 }}
				allowClear
				onClear={() => {
					setQuery("");
					setSelectedCompany(null);
				}}
				value={selectedCompany?.id ?? null}
				onChange={(value) => {
					const found = companies.find((c) => c.id === value) ?? null;
					setSelectedCompany(found);
				}}
				notFoundContent={
					query.trim().length >= 2 && !isFetching ? (
						<Text type="secondary">No companies found</Text>
					) : query.trim().length < 2 ? (
						<Text type="secondary">Type at least 2 characters</Text>
					) : null
				}
				options={companies.map((c) => ({
					value: c.id,
					label: (
						<div>
							<Text style={{ fontWeight: 600 }}>{c.name}</Text>
							{c.countryCode && (
								<Text type="secondary" style={{ marginLeft: 8 }}>
									{c.countryCode}
								</Text>
							)}
						</div>
					),
				}))}
			/>

			{selectedCompany && (
				<div
					style={{
						background: "#1d1d1d",
						border: "1px solid #303030",
						borderRadius: 8,
						padding: "12px 16px",
						marginBottom: 16,
					}}
				>
					<Text style={{ fontWeight: 600, display: "block" }}>
						{selectedCompany.name}
					</Text>
					{selectedCompany.countryCode && (
						<Text type="secondary">{selectedCompany.countryCode}</Text>
					)}
					{selectedCompany.url && (
						<div>
							<Text type="secondary" style={{ fontSize: 12 }}>
								{selectedCompany.url}
							</Text>
						</div>
					)}
					<Text type="secondary" style={{ fontSize: 12 }}>
						ID: #{selectedCompany.id}
					</Text>
				</div>
			)}

			<div style={{ textAlign: "right" }}>
				<Button
					type="primary"
					icon={<LinkOutlined />}
					disabled={!selectedCompany}
					loading={addCompany.isPending}
					onClick={handleLink}
				>
					Link to Report
				</Button>
			</div>
		</div>
	);
}

function CustomerCompaniesTab({
	reportId,
	customerId,
	existingCompanyIds,
	onSuccess,
}: {
	reportId: number;
	customerId: number;
	existingCompanyIds: number[];
	onSuccess: () => void;
}) {
	const { message } = App.useApp();
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [adding, setAdding] = useState(false);
	const addCompany = useAddCompanyToReport(reportId);
	const { data: companiesData, isLoading } = useCustomerCompanies(customerId);
	const allCompanies = companiesData?.data ?? [];
	const available = allCompanies.filter(
		(c) => !existingCompanyIds.includes(c.companyId),
	);

	const handleToggle = (companyId: number) => {
		setSelectedIds((prev) =>
			prev.includes(companyId)
				? prev.filter((id) => id !== companyId)
				: [...prev, companyId],
		);
	};

	const handleSelectAll = () =>
		setSelectedIds(available.map((c) => c.companyId));
	const handleDeselectAll = () => setSelectedIds([]);

	const handleAdd = async () => {
		if (selectedIds.length === 0) return;
		setAdding(true);
		try {
			for (const companyId of selectedIds) {
				await addCompany.mutateAsync({ mode: "existing", companyId });
			}
			message.success(
				`${selectedIds.length} ${selectedIds.length === 1 ? "company" : "companies"} added`,
			);
			setSelectedIds([]);
			onSuccess();
		} catch {
			message.error("Failed to add companies");
		} finally {
			setAdding(false);
		}
	};

	if (isLoading) {
		return (
			<div style={{ textAlign: "center", padding: 40 }}>
				<Spin size="small" />
			</div>
		);
	}

	if (available.length === 0) {
		return (
			<Text type="secondary" style={{ display: "block", padding: "16px 0" }}>
				{allCompanies.length === 0
					? "No companies found for this customer"
					: "All customer companies are already added to this report"}
			</Text>
		);
	}

	return (
		<div style={{ paddingTop: 8 }}>
			<div
				style={{
					display: "flex",
					gap: 8,
					marginBottom: 8,
					alignItems: "center",
				}}
			>
				<Button size="small" onClick={handleSelectAll}>
					Select all
				</Button>
				<Button size="small" onClick={handleDeselectAll}>
					Deselect all
				</Button>
				<Text type="secondary" style={{ fontSize: 12, marginLeft: "auto" }}>
					{selectedIds.length} / {available.length} selected
				</Text>
			</div>
			<div
				style={{
					maxHeight: 360,
					overflowY: "auto",
					border: "1px solid #303030",
					borderRadius: 6,
					padding: "4px 0",
					marginBottom: 16,
				}}
			>
				{available.map((c) => (
					<div
						key={c.companyId}
						style={{ padding: "4px 12px", cursor: "pointer" }}
						onClick={() => handleToggle(c.companyId)}
					>
						<Checkbox
							checked={selectedIds.includes(c.companyId)}
							style={{ pointerEvents: "none" }}
						>
							<Text style={{ fontSize: 13 }}>{c.name}</Text>
						</Checkbox>
					</div>
				))}
			</div>
			<div style={{ textAlign: "right" }}>
				<Button
					type="primary"
					icon={<PlusOutlined />}
					disabled={selectedIds.length === 0}
					loading={adding}
					onClick={handleAdd}
				>
					Add {selectedIds.length > 0 ? selectedIds.length : ""}{" "}
					{selectedIds.length === 1 ? "Company" : "Companies"}
				</Button>
			</div>
		</div>
	);
}

export default function AddCompanyModal({
	reportId,
	open,
	onClose,
	customerId,
	existingCompanyIds = [],
}: Props) {
	const [activeTab, setActiveTab] = useState(customerId ? "existing" : "new");

	useEffect(() => {
		if (!open) setActiveTab(customerId ? "existing" : "new");
	}, [open, customerId]);

	return (
		<Modal
			title="Add Company to Report"
			open={open}
			onCancel={onClose}
			footer={null}
			width="90vw"
			style={{ maxWidth: 1400, top: 40 }}
			destroyOnHidden
			styles={{ body: { padding: "16px 24px" } }}
		>
			<Tabs
				activeKey={activeTab}
				onChange={setActiveTab}
				items={[
					{
						key: "new",
						label: "Create New",
						children: <NewCompanyTab reportId={reportId} onSuccess={onClose} />,
					},
					{
						key: "existing",
						label: "Add Existing",
						children: customerId ? (
							<CustomerCompaniesTab
								reportId={reportId}
								customerId={customerId}
								existingCompanyIds={existingCompanyIds}
								onSuccess={onClose}
							/>
						) : (
							<ExistingCompanyTab reportId={reportId} onSuccess={onClose} />
						),
					},
				]}
			/>
		</Modal>
	);
}
