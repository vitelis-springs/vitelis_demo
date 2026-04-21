"use client";

import {
	CaretRightOutlined,
	DeleteOutlined,
	PlusOutlined,
	StopOutlined,
} from "@ant-design/icons";
import {
	App,
	Button,
	Card,
	Form,
	Modal,
	Popconfirm,
	Select,
	Space,
	Table,
	Tag,
	Typography,
} from "antd";
import { useCallback, useMemo, useState } from "react";
import { DARK_CARD_STYLE } from "../../config/chart-theme";
import { useGetDeepDiveCompanies } from "../../hooks/api/useDeepDiveService";
import {
	type N8NTask,
	type N8NTaskStatus,
	useCreateN8NTask,
	useDeleteN8NTask,
	useGetN8NTasks,
	useStartN8NTask,
	useStopN8NTask,
} from "../../hooks/api/useN8NTasksService";

const { Text } = Typography;

const STATUS_COLORS: Record<N8NTaskStatus, string> = {
	PENDING: "default",
	PROCESSING: "processing",
	DONE: "success",
	ERROR: "error",
};

function formatDate(value: string | null) {
	if (!value) return "—";
	return new Date(value).toLocaleString();
}

interface CreateTaskFormValues {
	targetCompany: number;
	competitors: number[];
}

interface CreateTaskModalProps {
	reportId: number;
	open: boolean;
	onClose: () => void;
}

function CreateTaskModal({ reportId, open, onClose }: CreateTaskModalProps) {
	const [form] = Form.useForm<CreateTaskFormValues>();
	const { message } = App.useApp();
	const createTask = useCreateN8NTask();
	const { data: companiesData } = useGetDeepDiveCompanies(reportId);

	const companies = useMemo(
		() => companiesData?.data.companies ?? [],
		[companiesData],
	);

	const companyOptions = companies.map((c) => ({
		label: c.name,
		value: c.id,
	}));

	const handleSubmit = async (values: CreateTaskFormValues) => {
		try {
			await createTask.mutateAsync({
				reportId,
				targetCompany: values.targetCompany,
				competitors: values.competitors,
				id: reportId,
			});
			void message.success("Task created");
			form.resetFields();
			onClose();
		} catch {
			void message.error("Failed to create task");
		}
	};

	return (
		<Modal
			title="New Company Level Report"
			open={open}
			onCancel={() => {
				form.resetFields();
				onClose();
			}}
			onOk={() => form.submit()}
			confirmLoading={createTask.isPending}
			okText="Create"
			cancelText="Cancel"
		>
			<Form form={form} layout="vertical" onFinish={handleSubmit}>
				<Form.Item
					name="targetCompany"
					label="Target Company"
					rules={[{ required: true, message: "Select a target company" }]}
				>
					<Select
						showSearch
						optionFilterProp="label"
						options={companyOptions}
						placeholder="Select a target company"
					/>
				</Form.Item>
				<Form.Item
					name="competitors"
					label="Competitors"
					rules={[
						{ required: true, message: "Select at least one competitor" },
					]}
				>
					<Select
						mode="multiple"
						showSearch
						optionFilterProp="label"
						options={companyOptions}
						placeholder="Select competitors"
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
}

export default function N8NTasksTable({ reportId }: { reportId: number }) {
	const { message } = App.useApp();
	const [createOpen, setCreateOpen] = useState(false);

	const { data, isLoading } = useGetN8NTasks(reportId);
	const startTask = useStartN8NTask(reportId);
	const stopTask = useStopN8NTask(reportId);
	const deleteTask = useDeleteN8NTask(reportId);

	const tasks = data?.data ?? [];

	const handleStart = useCallback(
		(id: number) => {
			startTask.mutate(id, {
				onSuccess: () => void message.success("Task started"),
				onError: (err) =>
					void message.error(
						err instanceof Error ? err.message : "Failed to start task",
					),
			});
		},
		[message, startTask],
	);

	const handleStop = useCallback(
		(id: number) => {
			stopTask.mutate(id, {
				onSuccess: () => void message.success("Task stopped"),
				onError: (err) =>
					void message.error(
						err instanceof Error ? err.message : "Failed to stop task",
					),
			});
		},
		[message, stopTask],
	);

	const handleDelete = useCallback(
		(id: number) => {
			deleteTask.mutate(id, {
				onSuccess: () => void message.success("Task deleted"),
				onError: () => void message.error("Failed to delete task"),
			});
		},
		[deleteTask, message],
	);

	const columns = useMemo(
		() => [
			{
				title: "ID",
				dataIndex: "id",
				key: "id",
				width: 70,
				render: (v: number) => (
					<Text style={{ color: "#8c8c8c", fontFamily: "monospace" }}>
						#{v}
					</Text>
				),
			},
			{
				title: "Flow",
				dataIndex: "work_flow_name",
				key: "work_flow_name",
				render: (v: string) => <Text style={{ color: "#e0e0e0" }}>{v}</Text>,
			},
			{
				title: "Status",
				dataIndex: "status",
				key: "status",
				width: 130,
				render: (v: N8NTaskStatus) => <Tag color={STATUS_COLORS[v]}>{v}</Tag>,
			},
			{
				title: "Execution ID",
				dataIndex: "execution_id",
				key: "execution_id",
				width: 180,
				render: (v: string | null) => (
					<Text
						style={{ color: "#8c8c8c", fontFamily: "monospace", fontSize: 12 }}
					>
						{v ?? "—"}
					</Text>
				),
			},
			{
				title: "Target / Competitors",
				key: "meta",
				render: (_: unknown, record: N8NTask) => {
					const meta = record.metadata as Record<string, unknown> | null;
					if (!meta) return <Text style={{ color: "#8c8c8c" }}>—</Text>;
					const target = meta.target_company as number | undefined;
					const comps = meta.competitors as number[] | undefined;
					return (
						<div style={{ fontSize: 12, color: "#8c8c8c" }}>
							{target !== undefined && (
								<div>
									Target: <Text style={{ color: "#d9d9d9" }}>#{target}</Text>
								</div>
							)}
							{comps && comps.length > 0 && (
								<div>
									Competitors:{" "}
									<Text style={{ color: "#d9d9d9" }}>{comps.join(", ")}</Text>
								</div>
							)}
						</div>
					);
				},
			},
			{
				title: "Created",
				dataIndex: "created_at",
				key: "created_at",
				width: 160,
				render: (v: string | null) => (
					<Text style={{ color: "#8c8c8c", fontSize: 12 }}>
						{formatDate(v)}
					</Text>
				),
			},
			{
				title: "Actions",
				key: "actions",
				width: 160,
				render: (_: unknown, record: N8NTask) => (
					<Space size="small">
						{(record.status === "PENDING" || record.status === "ERROR") && (
							<Button
								size="small"
								type="primary"
								icon={<CaretRightOutlined />}
								loading={startTask.isPending}
								onClick={() => handleStart(record.id)}
							>
								Start
							</Button>
						)}
						{record.status === "PROCESSING" && (
							<Button
								size="small"
								danger
								icon={<StopOutlined />}
								loading={stopTask.isPending}
								onClick={() => handleStop(record.id)}
							>
								Stop
							</Button>
						)}
						<Popconfirm
							title="Delete this task?"
							onConfirm={() => handleDelete(record.id)}
							okText="Yes"
							cancelText="No"
						>
							<Button
								size="small"
								icon={<DeleteOutlined />}
								danger
								type="text"
							/>
						</Popconfirm>
					</Space>
				),
			},
		],
		[
			handleDelete,
			handleStart,
			handleStop,
			startTask.isPending,
			stopTask.isPending,
		],
	);

	return (
		<>
			<div
				style={{
					marginBottom: 16,
					display: "flex",
					justifyContent: "flex-end",
				}}
			>
				<Button
					type="primary"
					icon={<PlusOutlined />}
					onClick={() => setCreateOpen(true)}
				>
					New report
				</Button>
			</div>

			<Card style={{ ...DARK_CARD_STYLE }} styles={{ body: { padding: 0 } }}>
				<Table
					dataSource={tasks}
					columns={columns}
					rowKey="id"
					loading={isLoading}
					pagination={{ pageSize: 20, showSizeChanger: false }}
					style={{ background: "#1f1f1f" }}
					locale={{
						emptyText: 'No tasks yet. Click "New report" to add one.',
					}}
				/>
			</Card>

			<CreateTaskModal
				reportId={reportId}
				open={createOpen}
				onClose={() => setCreateOpen(false)}
			/>
		</>
	);
}
