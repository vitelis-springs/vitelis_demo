"use client";

import {
	App,
	Button,
	Flex,
	Form,
	Input,
	Modal,
	Popconfirm,
	Spin,
	Switch,
	Tag,
} from "antd";
import { useState } from "react";
import {
	useApplyStepPreset,
	useCreateStepPreset,
	useStepPresetDetail,
	useStepPresets,
	useUpdateStepPreset,
} from "../../../hooks/api/useReportStepsService";
import styles from "./steps-dashboard.module.css";

function PresetInspectModal({
	templateId,
	onClose,
}: {
	templateId: string | null;
	onClose: () => void;
}) {
	const { data, isLoading } = useStepPresetDetail(templateId);
	const preset = data?.success ? data.data : undefined;

	return (
		<Modal
			open={templateId !== null}
			onCancel={onClose}
			footer={null}
			title={preset ? preset.name : "Preset"}
		>
			{isLoading || !preset ? (
				<div style={{ textAlign: "center", padding: 24 }}>
					<Spin />
				</div>
			) : (
				<Flex vertical>
					{preset.steps.map((step) => (
						<Flex
							key={step.stepId}
							align="center"
							gap={8}
							style={{ padding: "8px 0", borderBottom: "1px solid #303030" }}
						>
							<span style={{ color: "#8c8c8c", width: 32 }}>{step.order}.</span>
							<span style={{ flex: 1, color: "#d9d9d9" }}>{step.name}</span>
							{!step.isActive && <Tag color="default">inactive</Tag>}
						</Flex>
					))}
				</Flex>
			)}
		</Modal>
	);
}

export default function PresetsPanel({ reportId }: { reportId: number }) {
	const { message } = App.useApp();
	const { data, isLoading } = useStepPresets(true);
	const createPreset = useCreateStepPreset();
	const applyPreset = useApplyStepPreset(reportId);
	const updatePreset = useUpdateStepPreset();

	const [createOpen, setCreateOpen] = useState(false);
	const [inspectId, setInspectId] = useState<string | null>(null);
	const [form] = Form.useForm<{ name: string; description?: string }>();

	const presets = data?.data ?? [];

	const handleCreate = async () => {
		const values = await form.validateFields();
		createPreset.mutate(
			{
				report_id: reportId,
				name: values.name,
				description: values.description,
			},
			{
				onSuccess: (result) => {
					if (result.success) {
						message.success(
							`Saved preset "${result.data?.name}" (${result.data?.stepCount} steps)`,
						);
						setCreateOpen(false);
						form.resetFields();
					} else {
						message.error(result.error ?? "Failed to create preset");
					}
				},
				onError: () => message.error("Failed to create preset"),
			},
		);
	};

	const handleApply = (templateId: string, name: string) => {
		applyPreset.mutate(templateId, {
			onSuccess: (result) => {
				if (result.success) {
					message.success(
						`Applied "${name}" — ${result.data?.configured.length ?? 0} steps configured`,
					);
				} else {
					message.error(result.error ?? "Failed to apply preset");
				}
			},
			onError: () => message.error("Failed to apply preset"),
		});
	};

	const handleToggleActive = (templateId: string, isActive: boolean) => {
		updatePreset.mutate({ templateId, payload: { is_active: isActive } });
	};

	return (
		<section className={styles.panel} aria-label="Step presets">
			<div className={styles.panelTitle}>
				<h3>Step presets</h3>
				<Button type="primary" size="small" onClick={() => setCreateOpen(true)}>
					Save current steps as preset
				</Button>
			</div>

			{isLoading ? (
				<div style={{ textAlign: "center", padding: 24 }}>
					<Spin />
				</div>
			) : presets.length === 0 ? (
				<span className={styles.panelHint}>
					No presets yet. Snapshot the current steps to create the first one.
				</span>
			) : (
				<div className={styles.presetList}>
					{presets.map((preset) => (
						<div className={styles.presetRow} key={preset.id}>
							<div className={styles.presetMain}>
								<span className={styles.presetName}>
									{preset.name}
									{!preset.isActive && (
										<span
											className={styles.inactiveTag}
											style={{ marginLeft: 8 }}
										>
											inactive
										</span>
									)}
								</span>
								<span className={styles.presetMeta}>
									{preset.stepCount} steps · {preset.code}
								</span>
							</div>
							<div className={styles.presetActions}>
								<Switch
									size="small"
									checked={preset.isActive}
									onChange={(checked) => handleToggleActive(preset.id, checked)}
									checkedChildren="active"
									unCheckedChildren="off"
								/>
								<Button size="small" onClick={() => setInspectId(preset.id)}>
									Inspect
								</Button>
								<Popconfirm
									title={`Apply "${preset.name}" to this report?`}
									description="Replace-only: current steps are removed and their per-company statuses are deleted."
									okText="Replace steps"
									okButtonProps={{ danger: true }}
									cancelText="Cancel"
									disabled={!preset.isActive}
									onConfirm={() => handleApply(preset.id, preset.name)}
								>
									<Button
										size="small"
										type="primary"
										ghost
										disabled={!preset.isActive}
										title={preset.isActive ? undefined : "Preset is inactive"}
										loading={
											applyPreset.isPending &&
											applyPreset.variables === preset.id
										}
									>
										Apply
									</Button>
								</Popconfirm>
							</div>
						</div>
					))}
				</div>
			)}

			<Modal
				open={createOpen}
				title="Save steps as preset"
				onCancel={() => setCreateOpen(false)}
				onOk={handleCreate}
				okText="Save preset"
				confirmLoading={createPreset.isPending}
			>
				<p style={{ color: "#8c8c8c", marginTop: 0 }}>
					Snapshots every step currently configured on this report, in order.
				</p>
				<Form form={form} layout="vertical">
					<Form.Item
						name="name"
						label="Name"
						rules={[{ required: true, message: "Give the preset a name" }]}
					>
						<Input placeholder="e.g. Sales Miner — standard pipeline" />
					</Form.Item>
					<Form.Item name="description" label="Description">
						<Input.TextArea rows={2} placeholder="Optional" />
					</Form.Item>
				</Form>
			</Modal>

			<PresetInspectModal
				templateId={inspectId}
				onClose={() => setInspectId(null)}
			/>
		</section>
	);
}
