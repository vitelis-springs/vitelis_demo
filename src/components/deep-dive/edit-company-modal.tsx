"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
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
	PlusOutlined,
	ReloadOutlined,
	SaveOutlined,
} from "@ant-design/icons";
import { useGetIndustries } from "../../hooks/api/useIndustriesService";
import {
	useUpdateCompany,
	type CompanyUpdatePayload,
} from "../../hooks/api/useDeepDiveService";
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

interface CompanyData {
	id: number;
	name: string;
	countryCode?: string | null;
	url?: string | null;
	industryId?: number | null;
	slug?: string | null;
	investPortal?: string | null;
	careerPortal?: string | null;
	reportRole?: string | null;
	additionalData?: unknown;
}

interface Props {
	reportId: number;
	company: CompanyData;
	open: boolean;
	onClose: () => void;
}

interface FormValues {
	name: string;
	slug: string;
	url?: string;
	countryCode?: string;
	industryId?: number;
	investPortal?: string;
	careerPortal?: string;
	reportRole?: string;
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

export default function EditCompanyModal({
	reportId,
	company,
	open,
	onClose,
}: Props) {
	const { message } = App.useApp();
	const [form] = Form.useForm<FormValues>();
	const { data: industries, isLoading: industriesLoading } = useGetIndustries();
	const updateCompany = useUpdateCompany(reportId, company.id);
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
						name: values.name || company.name,
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
	}, [additionalDataMode, company.name, form, message]);

	useEffect(() => {
		if (open) {
			slugManuallyEdited.current = false;
			form.setFieldsValue({
				name: company.name,
				slug: company.slug ?? "",
				url: company.url ?? "",
				countryCode: company.countryCode ?? "",
				industryId: company.industryId ?? undefined,
				investPortal: company.investPortal ?? "",
				careerPortal: company.careerPortal ?? "",
				reportRole: company.reportRole ?? "",
			});
			const initialObj =
				company.additionalData != null &&
				typeof company.additionalData === "object" &&
				!Array.isArray(company.additionalData)
					? (company.additionalData as Record<string, unknown>)
					: {};
			setAdditionalDataObj(initialObj);
			setAdditionalDataJson(stringifyAdditionalData(initialObj));
			setAdditionalDataMode("fields");
			setNewFieldKey("");
		}
	}, [open, company, form]);

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
		async (values: FormValues) => {
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

			const payload: CompanyUpdatePayload = {
				name: values.name,
				slug: values.slug || null,
				url: values.url || null,
				countryCode: values.countryCode || null,
				industryId: values.industryId ?? null,
				investPortal: values.investPortal || null,
				careerPortal: values.careerPortal || null,
				reportRole: values.reportRole || null,
				additionalData,
			};

			try {
				const result = await updateCompany.mutateAsync(payload);
				if (!result.success) {
					message.error(result.error || "Failed to update company");
					return;
				}
				message.success("Company updated");
				onClose();
			} catch {
				message.error("Failed to update company");
			}
		},
		[
			additionalDataJson,
			additionalDataMode,
			additionalDataObj,
			message,
			onClose,
			updateCompany,
		],
	);

	return (
		<Modal
			title={`Edit Company: ${company.name}`}
			open={open}
			onCancel={onClose}
			footer={null}
			width="90vw"
			style={{ maxWidth: 1400, top: 40 }}
			destroyOnHidden
			styles={{ body: { padding: "16px 24px" } }}
		>
			<Form form={form} layout="vertical" onFinish={handleSubmit}>
				<div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
					{/* ── left: fields ── */}
					<div style={{ flex: "0 0 400px" }}>
						<Form.Item
							name="name"
							label="Company Name"
							rules={[{ required: true, message: "Company name is required" }]}
						>
							<Input
								placeholder="Acme Corp"
								onBlur={(e) => {
									if (
										!slugManuallyEdited.current &&
										!form.getFieldValue("slug")
									) {
										form.setFieldValue("slug", toSlug(e.target.value));
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

						<Form.Item name="industryId" label="Industry">
							<Select
								loading={industriesLoading}
								showSearch
								allowClear
								placeholder="Select industry"
								optionFilterProp="label"
								options={industries?.map((i) => ({
									value: i.id,
									label: i.name,
								}))}
							/>
						</Form.Item>

						<Form.Item
							name="reportRole"
							label="Report Role"
							style={{ marginBottom: 0 }}
						>
							<Input placeholder="e.g. competitor, partner" />
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
							<Text style={{ fontSize: 14 }}>Additional Data</Text>
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
								height="calc(90vh - 310px)"
							/>
						) : (
							<Space
								direction="vertical"
								size="middle"
								style={{
									width: "100%",
									maxHeight: "calc(90vh - 310px)",
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
						icon={<SaveOutlined />}
						loading={updateCompany.isPending}
					>
						Save Changes
					</Button>
				</div>
			</Form>
		</Modal>
	);
}
