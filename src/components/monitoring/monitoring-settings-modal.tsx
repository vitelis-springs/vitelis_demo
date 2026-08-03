"use client";

import { App, Form, InputNumber, Typography } from "antd";
import { useEffect } from "react";
import {
	type MonitoringSettings,
	useMonitoringSettings,
	useUpdateMonitoringSettings,
} from "../../hooks/api/useMonitoringService";
import { FormModalShell } from "../shared/modal";

const { Text } = Typography;

interface MonitoringSettingsModalProps {
	open: boolean;
	onClose: () => void;
}

export default function MonitoringSettingsModal({
	open,
	onClose,
}: MonitoringSettingsModalProps) {
	const [form] = Form.useForm<MonitoringSettings>();
	const { message } = App.useApp();
	const { data, isLoading } = useMonitoringSettings();
	const updateSettings = useUpdateMonitoringSettings();

	const settings = data?.data;

	useEffect(() => {
		if (!open || !settings) return;
		form.setFieldsValue(settings);
	}, [open, settings, form]);

	const handleSubmit = async (values: MonitoringSettings) => {
		try {
			await updateSettings.mutateAsync(values);
			message.success("Monitoring settings saved");
			onClose();
		} catch {
			message.error("Failed to save monitoring settings");
		}
	};

	return (
		<FormModalShell
			title="Monitoring settings"
			open={open}
			width={480}
			onCancel={onClose}
			onSubmit={() => form.submit()}
			confirmLoading={updateSettings.isPending}
			okText="Save"
			cancelText="Cancel"
			loading={isLoading}
		>
			<Form form={form} layout="vertical" onFinish={handleSubmit}>
				<Text style={{ color: "#8c8c8c" }}>
					Nothing writes an end_time when an n8n run dies, so a step that has
					been running too long is the only signal that a run was lost.
				</Text>

				<Form.Item
					name="stuckAfterMinutes"
					label="Treat a running step as stuck after (minutes)"
					rules={[{ required: true, message: "Set a threshold" }]}
					style={{ marginTop: 16 }}
				>
					<InputNumber min={1} max={10080} style={{ width: "100%" }} />
				</Form.Item>

				<Form.Item
					name="lookbackHours"
					label="Keep finished runs visible for (hours)"
					rules={[{ required: true, message: "Set a window" }]}
				>
					<InputNumber min={1} max={720} style={{ width: "100%" }} />
				</Form.Item>
			</Form>
		</FormModalShell>
	);
}
