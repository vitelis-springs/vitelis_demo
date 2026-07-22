"use client";

import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Alert,
	App,
	Button,
	Form,
	Input,
	InputNumber,
	Modal,
	Segmented,
	Select,
	Space,
	Switch,
	Tooltip,
	Typography,
} from "antd";
import {
	BulbOutlined,
	DeleteOutlined,
	ExclamationCircleOutlined,
	PlusOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import { useGetIndustries } from "../../hooks/api/useIndustriesService";
import { useGicsCodes } from "../../hooks/api/useSalesMinerSignalCatalogService";
import {
	useCreateCompany,
	useSearchCompanies,
	useUpdateCompanyGeneric,
	type CompanySearchResult,
} from "../../hooks/api/useDeepDiveService";
import {
	COMPANY_LISTING_FIELD_LABEL,
	COMPANY_LISTING_REQUIRED_OPTIONS,
	type CompanyListingValue,
	toListedBoolean,
} from "./company-listed-tag";
import { getMissingSalesMinerFields } from "./sales-miner-company-additional-data";
import JsonEditor from "./json-editor";

const { Text } = Typography;

const COMPANY_METADATA_WEBHOOK_URL =
	"https://vitelis.app.n8n.cloud/webhook/company-metadata";
const SM_COMPANY_METADATA_WEBHOOK_URL =
	"https://vitelis.app.n8n.cloud/webhook/sm-company-metadata";

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

export function toSlug(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "_")
		.replace(/[^\w]+/g, "")
		.replace(/_+/g, "_")
		.replace(/^_+/, "")
		.replace(/_+$/, "");
}

export interface StagedCompanyDraft {
	name: string;
	listed: boolean;
	url: string | null;
	logoUrl: string | null;
	countryCode: string | null;
	industryId: number | null;
	gicsCode: string | null;
	investPortal: string | null;
	careerPortal: string | null;
	slug: string | null;
	reportRole: string | null;
	additionalData: unknown;
	parentCompanyId: number | null;
	verified: boolean;
}

interface Props {
	open: boolean;
	onClose: () => void;
	onCreated?: (company: CompanySearchResult) => void;
	reportId?: number;
	variant?: "full" | "sales-miner";
	title?: string;
	/**
	 * "stage" collects the form into a draft via onStaged instead of calling
	 * the create API. "edit" updates an existing company (requires companyId).
	 */
	mode?: "create" | "stage" | "edit";
	onStaged?: (draft: StagedCompanyDraft) => void;
	/** Required when mode is "edit" — the company being updated. */
	companyId?: number;
	onUpdated?: (company: CompanySearchResult) => void;
	/** View-only: disables all fields and replaces the submit button with a Close button. */
	readOnly?: boolean;
	/** When set alongside readOnly, shows an "Edit" button next to Close. */
	onRequestEdit?: () => void;
	initialValues?: Partial<CreateCompanyFormValues>;
	initialAdditionalData?: Record<string, unknown> | null;
}

interface CreateCompanyFormValues {
	name: string;
	listed: Exclude<CompanyListingValue, "unknown">;
	url?: string;
	companyComment?: string;
	countryCode?: string;
	industryId?: number;
	slug: string;
	investPortal?: string;
	careerPortal?: string;
	logoUrl?: string;
	gicsCode?: string;
	reportRole?: string;
	parentCompanyId?: number;
	verified: boolean;
}

export default function CreateCompanyModal({
	open,
	onClose,
	onCreated,
	reportId,
	variant = "full",
	title = "Create Company",
	mode = "create",
	onStaged,
	companyId,
	onUpdated,
	readOnly = false,
	onRequestEdit,
	initialValues,
	initialAdditionalData,
}: Props) {
	const showFullFields = variant === "full";
	const { message } = App.useApp();
	const [form] = Form.useForm<CreateCompanyFormValues>();
	const { data: industries, isLoading: industriesLoading } = useGetIndustries();
	const { data: gicsCodesData, isLoading: gicsCodesLoading } = useGicsCodes();
	const createCompany = useCreateCompany();
	const updateCompany = useUpdateCompanyGeneric();
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

	// Checked only on blur (once the user has finished typing the name),
	// not on every keystroke.
	const [nameDuplicateQuery, setNameDuplicateQuery] = useState("");
	const { data: nameDuplicateResult } = useSearchCompanies(nameDuplicateQuery);
	const duplicateCompany = useMemo(() => {
		const trimmed = watchedName?.trim().toLowerCase();
		if (!trimmed) return null;
		return (
			nameDuplicateResult?.data.find(
				(c) => c.name.trim().toLowerCase() === trimmed,
			) ?? null
		);
	}, [nameDuplicateResult, watchedName]);

	const currentAdditionalData = useMemo(() => {
		if (additionalDataMode === "json") {
			return parseAdditionalData(additionalDataJson) ?? {};
		}
		return additionalDataObj;
	}, [additionalDataMode, additionalDataJson, additionalDataObj]);

	const missingSalesMinerFields = useMemo(
		() =>
			variant === "sales-miner"
				? getMissingSalesMinerFields(currentAdditionalData)
				: [],
		[variant, currentAdditionalData],
	);

	// Only surface the missing-fields warning after the user has triggered
	// generation or a save attempt — not while the form is still empty.
	const [validationTriggered, setValidationTriggered] = useState(false);

	// Skip the reset on initial mount — the Modal (and its Form) hasn't been
	// rendered yet at that point, so the form instance isn't connected.
	const hasOpenedRef = useRef(false);
	useEffect(() => {
		if (open) {
			hasOpenedRef.current = true;
			if (initialValues) {
				form.setFieldsValue(initialValues);
				if (initialValues.slug) slugManuallyEdited.current = true;
			}
			if (initialAdditionalData) {
				setAdditionalDataObj(initialAdditionalData);
				setAdditionalDataJson(stringifyAdditionalData(initialAdditionalData));
				if (Object.keys(initialAdditionalData).length > 0) {
					setValidationTriggered(true);
				}
			}
			return;
		}
		if (!hasOpenedRef.current) return;
		form.resetFields();
		slugManuallyEdited.current = false;
		setAdditionalDataMode("fields");
		setAdditionalDataObj({});
		setAdditionalDataJson("{}");
		setNewFieldKey("");
		setParentSearch("");
		setValidationTriggered(false);
		setNameDuplicateQuery("");
	}, [open, form, initialValues, initialAdditionalData]);

	const handleGenerate = useCallback(async () => {
		const values = form.getFieldsValue();
		setGenerating(true);
		try {
			const res = await fetch(
				variant === "sales-miner"
					? SM_COMPANY_METADATA_WEBHOOK_URL
					: COMPANY_METADATA_WEBHOOK_URL,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: values.name || null,
						url: values.url || null,
						company_comment: values.companyComment?.trim() || null,
						invest_portal: values.investPortal || null,
						career_portal: values.careerPortal || null,
					}),
				},
			);
			if (!res.ok) throw new Error(`Webhook error: ${res.status}`);
			const data = await res.json();
			const jsonStr = JSON.stringify(data, null, 2);
			setAdditionalDataJson(jsonStr);
			const parsed = parseAdditionalData(jsonStr);
			if (parsed) {
				if (additionalDataMode === "fields") setAdditionalDataObj(parsed);
				if (typeof parsed.logo_url === "string" && parsed.logo_url.trim()) {
					form.setFieldValue("logoUrl", parsed.logo_url);
				}
				if (typeof parsed.company_type === "string") {
					const companyType = parsed.company_type.trim().toLowerCase();
					if (companyType === "public" || companyType === "private") {
						form.setFieldValue("listed", companyType);
					}
				}
			}
			setValidationTriggered(true);
		} catch (err) {
			message.error(err instanceof Error ? err.message : "Webhook call failed");
		} finally {
			setGenerating(false);
		}
	}, [additionalDataMode, form, message, variant]);

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
		async (values: CreateCompanyFormValues) => {
			setValidationTriggered(true);

			let additionalData: Record<string, unknown> | null = null;
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

			const listed = toListedBoolean(values.listed);
			if (listed === null) {
				message.error("Listing status is required");
				return;
			}

			if (mode === "stage") {
				onStaged?.({
					name: values.name,
					listed,
					url: values.url || null,
					logoUrl: values.logoUrl?.trim() || null,
					countryCode: values.countryCode || null,
					industryId: values.industryId ?? null,
					gicsCode: values.gicsCode || null,
					slug: values.slug || null,
					investPortal: values.investPortal || null,
					careerPortal: values.careerPortal || null,
					reportRole: values.reportRole || null,
					additionalData,
					parentCompanyId: values.parentCompanyId ?? null,
					verified: values.verified ?? true,
				});
				onClose();
				return;
			}

			if (mode === "edit") {
				if (companyId == null) {
					message.error("Missing company id");
					return;
				}
				try {
					const result = await updateCompany.mutateAsync({
						companyId,
						name: values.name,
						listed,
						url: values.url || null,
						logoUrl: values.logoUrl?.trim() || null,
						countryCode: values.countryCode || null,
						industryId: values.industryId ?? null,
						gicsCode: values.gicsCode || null,
						slug: values.slug || null,
						investPortal: values.investPortal || null,
						careerPortal: values.careerPortal || null,
						reportRole: values.reportRole || null,
						additionalData,
						parentCompanyId: values.parentCompanyId ?? null,
						verified: values.verified ?? true,
					});

					if (!result.success || !result.data) {
						message.error(result.error || "Failed to update company");
						return;
					}

					message.success("Company updated");
					onUpdated?.({
						id: result.data.companyId,
						name: result.data.name,
						listed: result.data.listed,
						countryCode: result.data.countryCode,
						url: result.data.url,
						verified: result.data.verified,
					});
					onClose();
				} catch {
					message.error("Failed to update company");
				}
				return;
			}

			try {
				const result = await createCompany.mutateAsync({
					name: values.name,
					listed,
					url: values.url || null,
					logoUrl: values.logoUrl?.trim() || null,
					countryCode: values.countryCode || null,
					industryId: values.industryId ?? null,
					gicsCode: values.gicsCode || null,
					slug: values.slug || null,
					investPortal: values.investPortal || null,
					careerPortal: values.careerPortal || null,
					reportRole: values.reportRole || null,
					additionalData,
					parentCompanyId: values.parentCompanyId ?? null,
					verified: values.verified ?? true,
					reportId,
				});

				if (!result.success || !result.data) {
					message.error(result.error || "Failed to create company");
					return;
				}

				message.success("Company created");
				onCreated?.({
					id: result.data.companyId,
					name: result.data.name,
					listed: result.data.listed,
					countryCode: result.data.countryCode,
					url: result.data.url,
				});
				onClose();
			} catch {
				message.error("Failed to create company");
			}
		},
		[
			additionalDataJson,
			additionalDataMode,
			additionalDataObj,
			companyId,
			createCompany,
			message,
			mode,
			onClose,
			onCreated,
			onStaged,
			onUpdated,
			reportId,
			updateCompany,
		],
	);

	return (
		<Modal
			title={title}
			open={open}
			onCancel={onClose}
			footer={null}
			width="90vw"
			style={{ maxWidth: 1400, top: 40 }}
			destroyOnHidden
			styles={{ body: { padding: "16px 24px" } }}
		>
			<Form
				form={form}
				layout="vertical"
				onFinish={handleSubmit}
				disabled={readOnly}
			>
				<div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
					{/* ── left: fields ── */}
					<div style={{ flex: "0 0 360px" }}>
						<Form.Item
							name="name"
							label="Company Name"
							rules={[{ required: true, message: "Company name is required" }]}
							extra={
								duplicateCompany && (
									<Text type="warning" style={{ fontSize: 12 }}>
										A company named &quot;{duplicateCompany.name}&quot; already
										exists (#{duplicateCompany.id})
									</Text>
								)
							}
						>
							<Input
								placeholder="Acme Corp"
								suffix={
									duplicateCompany && (
										<Tooltip
											title={`Already exists: "${duplicateCompany.name}" (#${duplicateCompany.id})`}
										>
											<ExclamationCircleOutlined style={{ color: "#faad14" }} />
										</Tooltip>
									)
								}
								onBlur={(e) => {
									if (!slugManuallyEdited.current) {
										form.setFieldValue("slug", toSlug(e.target.value));
										form.validateFields(["slug"]);
									}
									setNameDuplicateQuery(e.target.value.trim());
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

						<Form.Item
							name="logoUrl"
							label="Logo URL"
							rules={[{ type: "url", message: "Enter a valid URL" }]}
						>
							<Input placeholder="https://acme.com/logo.png" />
						</Form.Item>

						<Form.Item name="gicsCode" label="GICS Code">
							<Select
								loading={gicsCodesLoading}
								showSearch
								allowClear
								placeholder="Select GICS code"
								optionFilterProp="label"
								options={gicsCodesData?.data.map((g) => ({
									value: g.code,
									label: `${g.code} — ${g.name}`,
								}))}
							/>
						</Form.Item>

						{showFullFields && (
							<Form.Item name="countryCode" label="Country Code">
								<Input placeholder="US" maxLength={50} style={{ width: 120 }} />
							</Form.Item>
						)}

						{showFullFields && (
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
									options={industries?.map((i) => ({
										value: i.id,
										label: i.name,
									}))}
								/>
							</Form.Item>
						)}

						{showFullFields && (
							<Form.Item name="reportRole" label="Report Role">
								<Input placeholder="e.g. competitor, partner" />
							</Form.Item>
						)}

						{showFullFields && (
							<Form.Item name="parentCompanyId" label="Parent Company">
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
						)}

						<Form.Item
							name="listed"
							label={COMPANY_LISTING_FIELD_LABEL}
							initialValue="public"
							rules={[
								{ required: true, message: "Listing status is required" },
							]}
						>
							<Segmented<Exclude<CompanyListingValue, "unknown">>
								options={COMPANY_LISTING_REQUIRED_OPTIONS}
								disabled={readOnly}
							/>
						</Form.Item>

						<Form.Item
							name="companyComment"
							label="Company Comment"
							style={{ marginBottom: 0 }}
						>
							<Input.TextArea
								autoSize={{ minRows: 2, maxRows: 5 }}
								placeholder="Market context, aliases, ownership notes..."
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
								{!readOnly && (
									<Button
										size="small"
										icon={<BulbOutlined />}
										loading={generating}
										disabled={!canGenerate}
										onClick={handleGenerate}
									>
										Generate
									</Button>
								)}
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

						{variant === "sales-miner" &&
							validationTriggered &&
							missingSalesMinerFields.length > 0 && (
								<Alert
									type="warning"
									showIcon
									style={{ marginBottom: 8 }}
									message="Additional Data is missing required fields"
									description={missingSalesMinerFields.join(", ")}
								/>
							)}

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

				<div
					style={{
						display: "flex",
						justifyContent: "flex-end",
						alignItems: "center",
						gap: 16,
						marginTop: 16,
					}}
				>
					<Form.Item
						name="verified"
						valuePropName="checked"
						initialValue={true}
						noStyle
					>
						<Switch
							checkedChildren="verified"
							unCheckedChildren="unverified"
							disabled={readOnly}
						/>
					</Form.Item>
					{readOnly ? (
						<>
							{onRequestEdit && (
								<Button onClick={onRequestEdit} disabled={false}>
									Edit
								</Button>
							)}
							<Button onClick={onClose} disabled={false}>
								Close
							</Button>
						</>
					) : (
						<Button
							type="primary"
							htmlType="submit"
							icon={<PlusOutlined />}
							loading={
								mode === "edit"
									? updateCompany.isPending
									: createCompany.isPending
							}
						>
							{mode === "stage"
								? "Save"
								: mode === "edit"
									? "Save Changes"
									: "Create Company"}
						</Button>
					)}
				</div>
			</Form>
		</Modal>
	);
}
