"use client";

import { PlusOutlined } from "@ant-design/icons";
import {
	App,
	Button,
	Checkbox,
	DatePicker,
	Form,
	Input,
	InputNumber,
	Modal,
	Select,
	Spin,
	Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { useSalesMinerCustomersList } from "../../hooks/api/useSalesMinerCustomersService";
import {
	useCreateSMReport,
	useCustomerCompanies,
	useReportStepTemplates,
} from "../../hooks/api/useSalesMinerReportsService";

const { Text } = Typography;

interface FormValues {
	name: string;
	description?: string;
	customerId: number;
	templateId: number;
	windowFrom: dayjs.Dayjs;
	windowTo: dayjs.Dayjs;
	maxOpportunityCount: number;
}

interface Props {
	onCreated?: (id: number) => void;
}

export default function CreateSMReportModal({ onCreated }: Props) {
	const [open, setOpen] = useState(false);
	const [form] = Form.useForm<FormValues>();
	const { message } = App.useApp();

	const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
		null,
	);
	const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);

	const { data: customersData, isLoading: customersLoading } =
		useSalesMinerCustomersList({
			page: 1,
			limit: 200,
			q: "",
		});
	const { data: templatesData, isLoading: templatesLoading } =
		useReportStepTemplates();
	const { data: companiesData, isLoading: companiesLoading } =
		useCustomerCompanies(selectedCustomerId);
	const { mutateAsync: createReport, isPending } = useCreateSMReport();

	const customers = customersData?.data.items ?? [];
	const templates = templatesData?.data ?? [];
	const companies = companiesData?.data ?? [];

	const handleOpen = () => {
		form.resetFields();
		form.setFieldsValue({
			windowFrom: dayjs().subtract(1, "year"),
			windowTo: dayjs(),
			maxOpportunityCount: 15,
		});
		setSelectedCustomerId(null);
		setSelectedCompanyIds([]);
		setOpen(true);
	};

	const handleCustomerChange = (value: number) => {
		setSelectedCustomerId(value);
		setSelectedCompanyIds([]);
	};

	const handleSelectAll = () => {
		setSelectedCompanyIds(companies.map((c) => c.companyId));
	};

	const handleDeselectAll = () => {
		setSelectedCompanyIds([]);
	};

	const handleSubmit = async (values: FormValues) => {
		try {
			const result = await createReport({
				name: values.name,
				description: values.description,
				customerId: values.customerId,
				templateId: values.templateId,
				windowFrom: values.windowFrom.format("YYYY-MM-DD"),
				windowTo: values.windowTo.format("YYYY-MM-DD"),
				maxOpportunityCount: values.maxOpportunityCount,
				companyIds: selectedCompanyIds,
			});
			message.success(`Report "${result.data.name}" created`);
			setOpen(false);
			onCreated?.(result.data.id);
		} catch {
			message.error("Failed to create report");
		}
	};

	return (
		<>
			<Button type="primary" icon={<PlusOutlined />} onClick={handleOpen}>
				Create Report
			</Button>

			<Modal
				title="Create Sales Miner Report"
				open={open}
				onCancel={() => setOpen(false)}
				footer={null}
				width={860}
				destroyOnClose
			>
				<Form
					form={form}
					layout="vertical"
					onFinish={(v) => {
						void handleSubmit(v);
					}}
					style={{ marginTop: 16 }}
				>
					<div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
						<div style={{ flex: "0 0 380px" }}>
							<Form.Item
								name="name"
								label="Report Name"
								rules={[{ required: true, message: "Required" }]}
							>
								<Input placeholder="Report name" />
							</Form.Item>

							<Form.Item name="description" label="Description">
								<Input.TextArea rows={2} placeholder="Optional description" />
							</Form.Item>

							<Form.Item
								name="customerId"
								label="Customer"
								rules={[{ required: true, message: "Required" }]}
							>
								<Select
									placeholder="Select customer"
									loading={customersLoading}
									showSearch
									optionFilterProp="label"
									options={customers.map((c) => ({
										value: Number(c.id),
										label: c.display_name,
									}))}
									onChange={handleCustomerChange}
								/>
							</Form.Item>

							<Form.Item
								name="templateId"
								label="Version (Template)"
								rules={[{ required: true, message: "Required" }]}
							>
								<Select
									placeholder="Select template"
									loading={templatesLoading}
									options={templates.map((t) => ({
										value: t.id,
										label: `${t.name} (${t.code})`,
									}))}
								/>
							</Form.Item>

							<Form.Item
								name="windowFrom"
								label="Window From"
								rules={[{ required: true, message: "Required" }]}
							>
								<DatePicker style={{ width: "100%" }} allowClear={false} />
							</Form.Item>

							<Form.Item
								name="windowTo"
								label="Window To"
								rules={[{ required: true, message: "Required" }]}
							>
								<DatePicker style={{ width: "100%" }} allowClear={false} />
							</Form.Item>

							<Form.Item
								name="maxOpportunityCount"
								label="Max Opportunity Count"
								rules={[{ required: true, message: "Required" }]}
								style={{ marginBottom: 0 }}
							>
								<InputNumber min={1} max={100} style={{ width: "100%" }} />
							</Form.Item>
						</div>

						<div style={{ flex: 1, minWidth: 0 }}>
							<div
								style={{
									marginBottom: 8,
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
								}}
							>
								<Text style={{ fontSize: 13, color: "#d9d9d9" }}>
									Companies
								</Text>
								{companies.length > 0 && (
									<Text type="secondary" style={{ fontSize: 12 }}>
										{selectedCompanyIds.length} / {companies.length} selected
									</Text>
								)}
							</div>

							{!selectedCustomerId ? (
								<div
									style={{
										border: "1px solid #303030",
										borderRadius: 6,
										padding: "12px 16px",
									}}
								>
									<Text type="secondary" style={{ fontSize: 12 }}>
										Select a customer to see available companies
									</Text>
								</div>
							) : companiesLoading ? (
								<div
									style={{
										textAlign: "center",
										padding: "24px 0",
										border: "1px solid #303030",
										borderRadius: 6,
									}}
								>
									<Spin size="small" />
								</div>
							) : companies.length === 0 ? (
								<div
									style={{
										border: "1px solid #303030",
										borderRadius: 6,
										padding: "12px 16px",
									}}
								>
									<Text type="secondary" style={{ fontSize: 12 }}>
										No companies found for this customer
									</Text>
								</div>
							) : (
								<>
									<div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
										<Button size="small" onClick={handleSelectAll}>
											Select all
										</Button>
										<Button size="small" onClick={handleDeselectAll}>
											Deselect all
										</Button>
									</div>
									<div
										style={{
											maxHeight: 340,
											overflowY: "auto",
											border: "1px solid #303030",
											borderRadius: 6,
											padding: "4px 0",
										}}
									>
										{companies.map((c) => (
											<div
												key={c.companyId}
												style={{ padding: "4px 12px", cursor: "pointer" }}
												onClick={() => {
													setSelectedCompanyIds((prev) =>
														prev.includes(c.companyId)
															? prev.filter((id) => id !== c.companyId)
															: [...prev, c.companyId],
													);
												}}
											>
												<Checkbox
													checked={selectedCompanyIds.includes(c.companyId)}
													style={{ pointerEvents: "none" }}
												>
													<Text style={{ fontSize: 13 }}>{c.name}</Text>
												</Checkbox>
											</div>
										))}
									</div>
								</>
							)}
						</div>
					</div>

					<div style={{ textAlign: "right", marginTop: 16 }}>
						<Button onClick={() => setOpen(false)} style={{ marginRight: 8 }}>
							Cancel
						</Button>
						<Button type="primary" htmlType="submit" loading={isPending}>
							Create
						</Button>
					</div>
				</Form>
			</Modal>
		</>
	);
}
