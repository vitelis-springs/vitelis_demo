"use client";

import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
	App,
	Button,
	Card,
	Col,
	Drawer,
	Empty,
	Flex,
	Form,
	Input,
	Modal,
	Row,
	Select,
	Space,
	Switch,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import { useState } from "react";
import {
	DARK_CARD_HEADER_STYLE,
	DARK_CARD_STYLE,
} from "../../config/chart-theme";
import {
	type AvailableValidationRule,
	type ConfiguredValidationRule,
	type CreateValidationRulePayload,
	useAddReportValidationRule,
	useCreateValidationRule,
	useGetReportValidationRules,
	useRemoveReportValidationRule,
	useUpdateValidationRule,
} from "../../hooks/api/useDeepDiveService";
import {
	VALIDATION_DATA_POINT_LEVELS,
	VALIDATION_RULE_LEVELS,
	type ValidationDataPointLevel,
	type ValidationRuleLevel,
} from "../../shared/deep-dive-contract.types";

const RULE_LEVEL_OPTIONS = VALIDATION_RULE_LEVELS.map((value) => ({
	value,
	label: value === "single" ? "Single" : "Group",
}));

const DATA_POINT_LEVEL_LABELS: Record<ValidationDataPointLevel, string> = {
	rdp: "Raw data point",
	driver: "Driver",
	kpi_category: "KPI category",
};

const DATA_POINT_LEVEL_OPTIONS = VALIDATION_DATA_POINT_LEVELS.map((value) => ({
	value,
	label: DATA_POINT_LEVEL_LABELS[value],
}));

const { Text } = Typography;
const { TextArea } = Input;

const DARK_INPUT = {
	background: "#1f1f1f",
	borderColor: "#434343",
	color: "#d9d9d9",
};

const MODAL_STYLES = {
	content: { background: "#1f1f1f" },
	header: { background: "#1f1f1f", color: "#d9d9d9" },
	body: { background: "#1f1f1f" },
	footer: { background: "#1f1f1f" },
	mask: { background: "rgba(0,0,0,0.7)" },
};

function levelTag(level: ValidationRuleLevel) {
	return <Tag color={level === "single" ? "blue" : "gold"}>{level}</Tag>;
}

function dataPointLevelTag(level: ValidationDataPointLevel | null) {
	if (!level) return null;
	return <Tag color="purple">{DATA_POINT_LEVEL_LABELS[level]}</Tag>;
}

interface Props {
	reportId: number;
	open: boolean;
	onClose: () => void;
}

interface RuleFormValues {
	name: string;
	label: string;
	level: ValidationRuleLevel;
	dataPointLevel: ValidationDataPointLevel | null;
	enabled: boolean;
	description: string;
	criteriaPass: string;
	criteriaWarn: string;
	criteriaFail: string;
}

type EditTarget = {
	id: number;
	name: string;
	label: string | null;
	level: ValidationRuleLevel;
	dataPointLevel: ValidationDataPointLevel | null;
	enabled: boolean;
	description: string | null;
	criteria: { pass: string; warn: string; fail: string };
} | null;

function ruleFormFields(rule: EditTarget): Partial<RuleFormValues> {
	if (!rule) return {};
	return {
		name: rule.name,
		label: rule.label ?? "",
		level: rule.level,
		dataPointLevel: rule.dataPointLevel,
		enabled: rule.enabled,
		description: rule.description ?? "",
		criteriaPass: rule.criteria.pass,
		criteriaWarn: rule.criteria.warn,
		criteriaFail: rule.criteria.fail,
	};
}

function RuleForm({
	form,
	onFinish,
}: {
	form: ReturnType<typeof Form.useForm<RuleFormValues>>[0];
	onFinish: (values: RuleFormValues) => void;
}) {
	return (
		<Form
			form={form}
			layout="vertical"
			initialValues={{ level: "single", dataPointLevel: null, enabled: true }}
			onFinish={onFinish}
			style={{ marginTop: 16 }}
		>
			<Row gutter={16}>
				<Col span={16}>
					<Form.Item
						name="name"
						label={<Text style={{ color: "#d9d9d9" }}>Name (technical)</Text>}
						rules={[{ required: true, message: "Required" }]}
					>
						<Input
							placeholder="e.g. structure.score_numeric_1_5"
							style={DARK_INPUT}
						/>
					</Form.Item>
				</Col>
				<Col span={8}>
					<Form.Item
						name="level"
						label={<Text style={{ color: "#d9d9d9" }}>Level</Text>}
						rules={[{ required: true }]}
					>
						<Select options={RULE_LEVEL_OPTIONS} />
					</Form.Item>
				</Col>
			</Row>

			<Row gutter={16}>
				<Col span={16}>
					<Form.Item
						name="label"
						label={
							<Text style={{ color: "#d9d9d9" }}>Label (human-readable)</Text>
						}
					>
						<Input placeholder="e.g. Score is 1–5" style={DARK_INPUT} />
					</Form.Item>
				</Col>
				<Col span={8}>
					<Form.Item
						name="dataPointLevel"
						label={<Text style={{ color: "#d9d9d9" }}>Data point level</Text>}
					>
						<Select
							allowClear
							placeholder="Optional"
							options={DATA_POINT_LEVEL_OPTIONS}
						/>
					</Form.Item>
				</Col>
			</Row>

			<Row gutter={16}>
				<Col span={8}>
					<Form.Item
						name="enabled"
						label={<Text style={{ color: "#d9d9d9" }}>Enabled</Text>}
						valuePropName="checked"
					>
						<Switch />
					</Form.Item>
				</Col>
			</Row>

			<Form.Item
				name="description"
				label={<Text style={{ color: "#d9d9d9" }}>Description</Text>}
			>
				<TextArea rows={2} style={DARK_INPUT} />
			</Form.Item>

			<Form.Item
				name="criteriaPass"
				label={<Text style={{ color: "#52c41a" }}>Criteria — Pass</Text>}
			>
				<TextArea rows={2} style={DARK_INPUT} />
			</Form.Item>

			<Form.Item
				name="criteriaWarn"
				label={<Text style={{ color: "#faad14" }}>Criteria — Warn</Text>}
			>
				<TextArea rows={2} style={DARK_INPUT} />
			</Form.Item>

			<Form.Item
				name="criteriaFail"
				label={<Text style={{ color: "#ff4d4f" }}>Criteria — Fail</Text>}
			>
				<TextArea rows={2} style={DARK_INPUT} />
			</Form.Item>
		</Form>
	);
}

function buildPayload(values: RuleFormValues): CreateValidationRulePayload {
	return {
		name: values.name.trim(),
		label: values.label?.trim() ?? "",
		level: values.level,
		data_point_level: values.dataPointLevel ?? null,
		enabled: values.enabled ?? true,
		description: values.description?.trim() ?? "",
		criteria: {
			pass: values.criteriaPass?.trim() ?? "",
			warn: values.criteriaWarn?.trim() ?? "",
			fail: values.criteriaFail?.trim() ?? "",
		},
	};
}

export default function ValidationRulesConfigDrawer({
	reportId,
	open,
	onClose,
}: Props) {
	const { message } = App.useApp();
	const [addingId, setAddingId] = useState<number | null>(null);
	const [removingId, setRemovingId] = useState<number | null>(null);
	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<EditTarget>(null);
	const [createForm] = Form.useForm<RuleFormValues>();
	const [editForm] = Form.useForm<RuleFormValues>();

	const { data, isLoading } = useGetReportValidationRules(reportId, open);
	const addRule = useAddReportValidationRule(reportId);
	const removeRule = useRemoveReportValidationRule(reportId);
	const createRule = useCreateValidationRule(reportId);
	const updateRule = useUpdateValidationRule(reportId);

	const configured: ConfiguredValidationRule[] = data?.configured ?? [];
	const available: AvailableValidationRule[] = data?.available ?? [];

	const handleAdd = (rule: AvailableValidationRule) => {
		setAddingId(rule.id);
		addRule.mutate(rule.id, {
			onSuccess: () => {
				message.success(`Rule "${rule.label ?? rule.name}" added`);
				setAddingId(null);
			},
			onError: () => {
				message.error("Failed to add rule");
				setAddingId(null);
			},
		});
	};

	const handleRemove = (rule: ConfiguredValidationRule) => {
		setRemovingId(rule.ruleId);
		removeRule.mutate(rule.ruleId, {
			onSuccess: () => {
				message.success(`Rule "${rule.label ?? rule.name}" removed`);
				setRemovingId(null);
			},
			onError: () => {
				message.error("Failed to remove rule");
				setRemovingId(null);
			},
		});
	};

	const handleCreate = (values: RuleFormValues) => {
		createRule.mutate(buildPayload(values), {
			onSuccess: () => {
				message.success("Validation rule created");
				setCreateOpen(false);
				createForm.resetFields();
			},
			onError: () => {
				message.error("Failed to create rule");
			},
		});
	};

	const handleUpdate = (values: RuleFormValues) => {
		if (!editTarget) return;
		updateRule.mutate(
			{ ruleId: editTarget.id, payload: buildPayload(values) },
			{
				onSuccess: () => {
					message.success("Rule updated");
					setEditTarget(null);
					editForm.resetFields();
				},
				onError: () => {
					message.error("Failed to update rule");
				},
			},
		);
	};

	const openEdit = (
		rule: ConfiguredValidationRule | AvailableValidationRule,
	) => {
		const globalRuleId = "ruleId" in rule ? rule.ruleId : rule.id;
		const target: EditTarget = {
			id: globalRuleId,
			name: rule.name,
			label: rule.label ?? null,
			level: rule.level,
			dataPointLevel: rule.dataPointLevel ?? null,
			enabled: "enabled" in rule ? rule.enabled : true,
			description: rule.description ?? null,
			criteria: rule.criteria,
		};
		setEditTarget(target);
		editForm.setFieldsValue(ruleFormFields(target));
	};

	function ruleActions(
		rule: ConfiguredValidationRule | AvailableValidationRule,
		isConfigured: boolean,
	) {
		const actions = [
			<Tooltip key="edit" title="Edit rule">
				<Button
					type="text"
					size="small"
					icon={<EditOutlined />}
					style={{ color: "#58bfce" }}
					onClick={() => openEdit(rule)}
				/>
			</Tooltip>,
		];
		if (isConfigured) {
			const r = rule as ConfiguredValidationRule;
			actions.push(
				<Button
					key="remove"
					type="text"
					danger
					size="small"
					icon={<DeleteOutlined />}
					loading={removingId === r.ruleId}
					onClick={() => handleRemove(r)}
				/>,
			);
		} else {
			const r = rule as AvailableValidationRule;
			actions.push(
				<Tooltip key="add" title="Add to report">
					<Button
						type="text"
						size="small"
						icon={<PlusOutlined />}
						style={{ color: "#52c41a" }}
						loading={addingId === r.id}
						onClick={() => handleAdd(r)}
					/>
				</Tooltip>,
			);
		}
		return actions;
	}

	function RuleListItem({
		rule,
		isConfigured,
	}: {
		rule: ConfiguredValidationRule | AvailableValidationRule;
		isConfigured: boolean;
	}) {
		return (
			<Flex
				align="center"
				justify="space-between"
				gap={12}
				style={{ padding: "12px 0", borderBottom: "1px solid #303030" }}
			>
				<Flex vertical gap={2} style={{ minWidth: 0, flex: 1 }}>
					<Space size={4} wrap>
						<Text style={{ color: "#d9d9d9", fontSize: 13 }}>
							{rule.label ?? rule.name}
						</Text>
						{levelTag(rule.level)}
						{dataPointLevelTag(rule.dataPointLevel)}
					</Space>
					<Text style={{ color: "#595959", fontSize: 11 }}>{rule.name}</Text>
				</Flex>
				<Space size={4}>{ruleActions(rule, isConfigured)}</Space>
			</Flex>
		);
	}

	return (
		<>
			<Drawer
				title="Validation Rules Configuration"
				open={open}
				onClose={onClose}
				width={900}
				styles={{
					body: { background: "#141414", padding: 16 },
					header: {
						background: "#1f1f1f",
						borderBottom: "1px solid #303030",
						color: "#d9d9d9",
					},
					mask: { background: "rgba(0,0,0,0.6)" },
					wrapper: { background: "#141414" },
				}}
			>
				<Row gutter={16}>
					<Col xs={24} lg={12}>
						<Card
							title={`Configured (${configured.length})`}
							loading={isLoading}
							style={DARK_CARD_STYLE}
							styles={{ header: DARK_CARD_HEADER_STYLE, body: { padding: 0 } }}
						>
							<div
								style={{ height: 560, overflowY: "auto", padding: "8px 16px" }}
							>
								{configured.length === 0 ? (
									<Empty
										image={Empty.PRESENTED_IMAGE_SIMPLE}
										description={
											<Text style={{ color: "#8c8c8c" }}>
												No rules configured
											</Text>
										}
									/>
								) : (
									configured.map((rule) => (
										<RuleListItem key={rule.ruleId} rule={rule} isConfigured />
									))
								)}
							</div>
						</Card>
					</Col>

					<Col xs={24} lg={12}>
						<Card
							title={`Available (${available.length})`}
							loading={isLoading}
							style={DARK_CARD_STYLE}
							styles={{ header: DARK_CARD_HEADER_STYLE, body: { padding: 0 } }}
							extra={
								<Button
									size="small"
									icon={<PlusOutlined />}
									onClick={() => setCreateOpen(true)}
								>
									New Rule
								</Button>
							}
						>
							<div
								style={{ height: 560, overflowY: "auto", padding: "8px 16px" }}
							>
								{available.length === 0 ? (
									<Empty
										image={Empty.PRESENTED_IMAGE_SIMPLE}
										description={
											<Text style={{ color: "#8c8c8c" }}>
												{isLoading ? "Loading..." : "All rules are configured"}
											</Text>
										}
									/>
								) : (
									available.map((rule) => (
										<RuleListItem
											key={rule.id}
											rule={rule}
											isConfigured={false}
										/>
									))
								)}
							</div>
						</Card>
					</Col>
				</Row>
			</Drawer>

			<Modal
				title="New Validation Rule"
				open={createOpen}
				onCancel={() => {
					setCreateOpen(false);
					createForm.resetFields();
				}}
				onOk={() => createForm.submit()}
				okText="Create"
				confirmLoading={createRule.isPending}
				width={640}
				styles={MODAL_STYLES}
			>
				<RuleForm form={createForm} onFinish={handleCreate} />
			</Modal>

			<Modal
				title="Edit Validation Rule"
				open={!!editTarget}
				onCancel={() => {
					setEditTarget(null);
					editForm.resetFields();
				}}
				onOk={() => editForm.submit()}
				okText="Save"
				confirmLoading={updateRule.isPending}
				width={640}
				styles={MODAL_STYLES}
			>
				<RuleForm form={editForm} onFinish={handleUpdate} />
			</Modal>
		</>
	);
}
