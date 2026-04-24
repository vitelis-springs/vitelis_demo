"use client";

import {
	CaretRightOutlined,
	CopyOutlined,
	DeleteOutlined,
	PlusOutlined,
	StopOutlined,
} from "@ant-design/icons";
import {
	App,
	Button,
	Form,
	Popconfirm,
	Segmented,
	Select,
	Space,
	Tooltip,
	Typography,
} from "antd";
import { useCallback, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useGetDeepDiveCompanies } from "../../hooks/api/useDeepDiveService";
import { api } from "../../lib/api-client";
import OrchestratorPanel from "./orchestrator-panel";
import {
	type N8NTask,
	type N8NTaskStatus,
	useCreateN8NTask,
	useDeleteN8NTask,
	useGetN8NTasks,
	useStartN8NTask,
	useStopN8NTask,
	useUpdateN8NTaskStatus,
} from "../../hooks/api/useN8NTasksService";
import { FormModalShell } from "../shared/modal";
import { DarkTableCard } from "../shared/table";

const { Text } = Typography;

const STATUS_COLORS: Record<N8NTaskStatus, string> = {
	PENDING: "gold",
	PROCESSING: "blue",
	DONE: "green",
	ERROR: "red",
};

const ALL_STATUSES: N8NTaskStatus[] = [
	"PENDING",
	"PROCESSING",
	"DONE",
	"ERROR",
];

const STATUS_OPTIONS = ALL_STATUSES.map((s) => ({ label: s, value: s }));

function formatDate(value: string | null) {
	if (!value) return "—";
	return new Date(value).toLocaleString();
}

function formatRawStatus(value: string | null) {
	if (!value) return "—";
	return value.toUpperCase();
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

export function buildCreateTaskPayload(
	reportId: number,
	values: CreateTaskFormValues,
) {
	return {
		reportId,
		targetCompany: values.targetCompany,
		competitors: values.competitors,
		id: reportId,
	};
}

export function CreateTaskModal({
	reportId,
	open,
	onClose,
}: CreateTaskModalProps) {
	const [form] = Form.useForm<CreateTaskFormValues>();
	const { message } = App.useApp();
	const createTask = useCreateN8NTask();
	const { data: companiesData } = useGetDeepDiveCompanies(reportId);
	const selectedTargetCompany = Form.useWatch("targetCompany", form);

	const companies = useMemo(
		() => companiesData?.data.companies ?? [],
		[companiesData],
	);

	const companyOptions = companies.map((c) => ({
		label: c.name,
		value: c.id,
	}));

	const competitorOptions = useMemo(() => {
		if (selectedTargetCompany === undefined) {
			return companyOptions;
		}

		return companyOptions.filter(
			(option) => option.value !== selectedTargetCompany,
		);
	}, [companyOptions, selectedTargetCompany]);

	const handleSubmit = async (values: CreateTaskFormValues) => {
		try {
			await createTask.mutateAsync(buildCreateTaskPayload(reportId, values));
			void message.success("Task created");
			form.resetFields();
			onClose();
		} catch {
			void message.error("Failed to create task");
		}
	};

	return (
		<FormModalShell
			title="New Company Level Report"
			open={open}
			width={720}
			onCancel={() => {
				form.resetFields();
				onClose();
			}}
			onSubmit={() => form.submit()}
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
						onChange={(value) => {
							const competitors = form.getFieldValue("competitors") ?? [];
							form.setFieldsValue({
								targetCompany: value,
								competitors: competitors.filter(
									(competitorId: number) => competitorId !== value,
								),
							});
						}}
					/>
				</Form.Item>
				<Form.Item
					name="competitors"
					label="Competitors"
					rules={[
						{ required: true, message: "Select at least one competitor" },
						({ getFieldValue }) => ({
							validator(_, value: number[] | undefined) {
								const targetCompany = getFieldValue("targetCompany");
								if (
									targetCompany === undefined ||
									!Array.isArray(value) ||
									!value.includes(targetCompany)
								) {
									return Promise.resolve();
								}

								return Promise.reject(
									new Error(
										"Target company cannot be selected as a competitor",
									),
								);
							},
						}),
					]}
				>
					<Select
						mode="multiple"
						showSearch
						optionFilterProp="label"
						options={competitorOptions}
						placeholder="Select competitors"
					/>
				</Form.Item>
			</Form>
		</FormModalShell>
	);
}

export default function N8NTasksTable({ reportId }: { reportId?: number }) {
	const { message } = App.useApp();
	const [createOpen, setCreateOpen] = useState(false);

	const { data, isLoading } = useGetN8NTasks(reportId);
	const startTask = useStartN8NTask(reportId);
	const stopTask = useStopN8NTask(reportId);
	const deleteTask = useDeleteN8NTask(reportId);
	const updateStatus = useUpdateN8NTaskStatus(reportId);

	const { data: singleReportCompanies } = useGetDeepDiveCompanies(
		reportId ?? null,
	);

	const tasks = useMemo(() => data?.data ?? [], [data]);

	const uniqueReportIds = useMemo(
		() =>
			reportId === undefined
				? [
						...new Set(
							tasks
								.map((t) => t.report_id)
								.filter((id): id is number => id !== null),
						),
					]
				: [],
		[tasks, reportId],
	);

	const multiReportCompanies = useQueries({
		queries: uniqueReportIds.map((id) => ({
			queryKey: ["deep-dive", "companies", id],
			queryFn: async () => {
				const res = await api.get(`/deep-dive/${id}/companies`);
				return res.data as {
					data: { companies: { id: number; name: string }[] };
				};
			},
			staleTime: 60_000,
		})),
	});

	const companyMap = useMemo(() => {
		const map = new Map<number, string>();
		if (reportId !== undefined) {
			for (const c of singleReportCompanies?.data.companies ?? []) {
				map.set(c.id, c.name);
			}
		} else {
			for (const result of multiReportCompanies) {
				for (const c of result.data?.data.companies ?? []) {
					map.set(c.id, c.name);
				}
			}
		}
		return map;
	}, [reportId, singleReportCompanies, multiReportCompanies]);

	const [statusFilter, setStatusFilter] = useState<N8NTaskStatus | "ALL">(
		"ALL",
	);

	const filteredTasks = useMemo(
		() =>
			statusFilter === "ALL"
				? tasks
				: tasks.filter((t) => t.status === statusFilter),
		[tasks, statusFilter],
	);

	const statusCounts = useMemo(
		() =>
			ALL_STATUSES.reduce<Record<string, number>>(
				(acc, s) => ({
					...acc,
					[s]: tasks.filter((t) => t.status === s).length,
				}),
				{},
			),
		[tasks],
	);

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
				sorter: (a: N8NTask, b: N8NTask) => a.id - b.id,
				render: (v: number) => (
					<Text style={{ color: "#8c8c8c", fontFamily: "monospace" }}>
						#{v}
					</Text>
				),
			},
			{
				title: "Report",
				dataIndex: "report_id",
				key: "report_id",
				width: 80,
				sorter: (a: N8NTask, b: N8NTask) =>
					(a.report_id ?? 0) - (b.report_id ?? 0),
				render: (v: number | null) => (
					<Text style={{ color: "#8c8c8c", fontFamily: "monospace" }}>
						{v !== null ? `#${v}` : "—"}
					</Text>
				),
			},
			{
				title: "Company",
				key: "company",
				sorter: (a: N8NTask, b: N8NTask) => {
					const metaA = a.metadata as Record<string, unknown> | null;
					const metaB = b.metadata as Record<string, unknown> | null;
					const nameA = companyMap.get(metaA?.target_company as number) ?? "";
					const nameB = companyMap.get(metaB?.target_company as number) ?? "";
					return nameA.localeCompare(nameB);
				},
				render: (_: unknown, record: N8NTask) => {
					const meta = record.metadata as Record<string, unknown> | null;
					const targetId = meta?.target_company as number | undefined;
					if (targetId === undefined)
						return <Text style={{ color: "#8c8c8c" }}>—</Text>;
					const name = companyMap.get(targetId);
					return (
						<div>
							<Text style={{ color: "#e0e0e0" }}>{name ?? `#${targetId}`}</Text>
							<div>
								<Text
									style={{
										color: "#595959",
										fontSize: 11,
										fontFamily: "monospace",
									}}
								>
									#{targetId}
								</Text>
							</div>
						</div>
					);
				},
			},
			{
				title: "Competitors",
				key: "meta",
				render: (_: unknown, record: N8NTask) => {
					const meta = record.metadata as Record<string, unknown> | null;
					const comps = meta?.competitors as number[] | undefined;
					if (!comps || comps.length === 0)
						return <Text style={{ color: "#8c8c8c" }}>—</Text>;
					return (
						<div style={{ fontSize: 12, color: "#d9d9d9" }}>
							{comps.map((id) => companyMap.get(id) ?? `#${id}`).join(", ")}
						</div>
					);
				},
			},
			{
				title: "Metadata",
				key: "metadata",
				width: 100,
				render: (_: unknown, record: N8NTask) => {
					if (!record.metadata)
						return <Text style={{ color: "#8c8c8c" }}>—</Text>;
					const json = JSON.stringify(record.metadata, null, 2);
					return (
						<Tooltip
							title={<pre style={{ margin: 0, fontSize: 11 }}>{json}</pre>}
							overlayStyle={{ maxWidth: 480 }}
						>
							<Button
								size="small"
								type="text"
								icon={<CopyOutlined />}
								style={{ color: "#8c8c8c" }}
								onClick={() => {
									void navigator.clipboard.writeText(json);
									void message.success("Copied");
								}}
							>
								{"{ }"}
							</Button>
						</Tooltip>
					);
				},
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
				width: 150,
				sorter: (a: N8NTask, b: N8NTask) => a.status.localeCompare(b.status),
				render: (v: N8NTaskStatus, record: N8NTask) => (
					<Select
						value={v}
						size="small"
						options={STATUS_OPTIONS}
						loading={updateStatus.isPending}
						onChange={(next: N8NTaskStatus) =>
							updateStatus.mutate(
								{ id: record.id, status: next },
								{
									onError: () => void message.error("Failed to update status"),
								},
							)
						}
						style={{
							width: 130,
							colorBgContainer: STATUS_COLORS[v],
						}}
					/>
				),
			},
			{
				title: "Inst.",
				key: "instance_index",
				width: 70,
				sorter: (a: N8NTask, b: N8NTask) =>
					(a.instance_index ?? -1) - (b.instance_index ?? -1),
				render: (_: unknown, record: N8NTask) =>
					record.instance_index !== null ? (
						<Text style={{ color: "#58bfce", fontWeight: 600 }}>
							#{record.instance_index + 1}
						</Text>
					) : (
						<Text style={{ color: "#595959" }}>—</Text>
					),
			},
			{
				title: "n8n",
				key: "sync",
				width: 170,
				render: (_: unknown, record: N8NTask) => (
					<div>
						<Text style={{ color: "#d9d9d9", fontSize: 12 }}>
							{formatRawStatus(record.last_seen_execution_status)}
						</Text>
						<div>
							<Text style={{ color: "#8c8c8c", fontSize: 11 }}>
								Checked: {formatDate(record.last_checked_at)}
							</Text>
						</div>
					</div>
				),
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
				title: "Created",
				dataIndex: "created_at",
				key: "created_at",
				width: 160,
				sorter: (a: N8NTask, b: N8NTask) =>
					new Date(a.created_at ?? 0).getTime() -
					new Date(b.created_at ?? 0).getTime(),
				defaultSortOrder: "descend" as const,
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
			companyMap,
			handleDelete,
			handleStart,
			handleStop,
			message,
			startTask.isPending,
			stopTask.isPending,
			updateStatus,
		],
	);

	return (
		<>
			<OrchestratorPanel />

			<div
				style={{
					marginBottom: 16,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<Segmented
					value={statusFilter}
					onChange={(v) => setStatusFilter(v as N8NTaskStatus | "ALL")}
					options={[
						{ label: `All (${tasks.length})`, value: "ALL" },
						...ALL_STATUSES.map((s) => ({
							label: `${s} (${statusCounts[s] ?? 0})`,
							value: s,
						})),
					]}
				/>
				<Button
					type="primary"
					icon={<PlusOutlined />}
					disabled={reportId === undefined}
					onClick={() => setCreateOpen(true)}
				>
					New company level report
				</Button>
			</div>

			<DarkTableCard
				dataSource={filteredTasks}
				columns={columns}
				rowKey="id"
				loading={isLoading}
				pagination={{ pageSize: 20, showSizeChanger: false }}
				locale={{
					emptyText: 'No tasks yet. Click "New report" to add one.',
				}}
			/>

			{reportId !== undefined && (
				<CreateTaskModal
					reportId={reportId}
					open={createOpen}
					onClose={() => setCreateOpen(false)}
				/>
			)}
		</>
	);
}
