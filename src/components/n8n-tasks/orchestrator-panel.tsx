"use client";

import {
	App,
	Button,
	Checkbox,
	Input,
	InputNumber,
	Spin,
	Switch,
	Typography,
} from "antd";
import { useEffect, useState } from "react";
import {
	DARK_CARD_HEADER_STYLE,
	DARK_CARD_STYLE,
} from "../../config/chart-theme";
import type { OrchestratorInstanceConfig } from "../../app/server/modules/app-settings";
import {
	useGetClrOrchestratorSettings,
	useUpdateClrOrchestratorSettings,
} from "../../hooks/api/useAppSettingsService";

const { Title, Text } = Typography;

const DEFAULT_INSTANCE: OrchestratorInstanceConfig = {
	enabled: false,
	concurrency: 1,
	webhook: "",
};

interface InstancePanelProps {
	label: string;
	value: OrchestratorInstanceConfig;
	webhookDirty: boolean;
	saving: boolean;
	onEnabledChange: (v: boolean) => void;
	onConcurrencyChange: (v: number) => void;
	onConcurrencySave: () => void;
	onWebhookChange: (v: string) => void;
	onSave: () => void;
}

function InstancePanel({
	label,
	value,
	webhookDirty,
	saving,
	onEnabledChange,
	onConcurrencyChange,
	onConcurrencySave,
	onWebhookChange,
	onSave,
}: InstancePanelProps) {
	return (
		<div
			style={{
				...DARK_CARD_STYLE,
				borderRadius: 6,
				padding: "10px 16px",
				display: "flex",
				alignItems: "center",
				gap: 12,
				opacity: value.enabled ? 1 : 0.55,
				transition: "opacity 0.2s",
			}}
		>
			<Checkbox
				checked={value.enabled}
				onChange={(e) => onEnabledChange(e.target.checked)}
			>
				<Text
					style={{ color: "#e0e0e0", fontWeight: 600, whiteSpace: "nowrap" }}
				>
					{label}
				</Text>
			</Checkbox>

			<InputNumber
				min={1}
				max={20}
				value={value.concurrency}
				onChange={(v) => onConcurrencyChange(v ?? 1)}
				onBlur={onConcurrencySave}
				disabled={!value.enabled}
				addonBefore={
					<Text style={{ color: "#8c8c8c", fontSize: 11 }}>Concurrency</Text>
				}
				style={{ width: 180 }}
			/>

			<Input
				value={value.webhook}
				onChange={(e) => onWebhookChange(e.target.value)}
				disabled={!value.enabled}
				placeholder="Webhook URL"
				allowClear
				style={{ flex: 1 }}
			/>

			<Button
				type="primary"
				size="small"
				disabled={!webhookDirty}
				loading={saving}
				onClick={onSave}
			>
				Save
			</Button>
		</div>
	);
}

export default function OrchestratorPanel() {
	const { message } = App.useApp();
	const { data, isLoading } = useGetClrOrchestratorSettings();
	const updateSettings = useUpdateClrOrchestratorSettings();

	const [autoGenEnabled, setAutoGenEnabled] = useState(false);
	const [instance1, setInstance1] =
		useState<OrchestratorInstanceConfig>(DEFAULT_INSTANCE);
	const [instance2, setInstance2] =
		useState<OrchestratorInstanceConfig>(DEFAULT_INSTANCE);

	useEffect(() => {
		if (!data) return;
		setAutoGenEnabled(data.data.autoGenEnabled);
		setInstance1(data.data.instances[0]);
		setInstance2(data.data.instances[1]);
	}, [data]);

	const saved = data?.data;

	const webhookDirty = (idx: 0 | 1) => {
		const current = idx === 0 ? instance1.webhook : instance2.webhook;
		const savedVal = saved?.instances[idx].webhook ?? "";
		return current !== savedVal;
	};

	const autoSave = (
		nextAutoGen: boolean,
		next1: OrchestratorInstanceConfig,
		next2: OrchestratorInstanceConfig,
	) => {
		updateSettings.mutate(
			{ autoGenEnabled: nextAutoGen, instances: [next1, next2] },
			{ onError: () => void message.error("Failed to save") },
		);
	};

	const handleAutoGenChange = (val: boolean) => {
		setAutoGenEnabled(val);
		autoSave(val, instance1, instance2);
	};

	const handleEnabledChange = (idx: 0 | 1, val: boolean) => {
		if (idx === 0) {
			const next = { ...instance1, enabled: val };
			setInstance1(next);
			autoSave(autoGenEnabled, next, instance2);
		} else {
			const next = { ...instance2, enabled: val };
			setInstance2(next);
			autoSave(autoGenEnabled, instance1, next);
		}
	};

	const handleConcurrencyChange = (idx: 0 | 1, val: number) => {
		if (idx === 0) setInstance1((p) => ({ ...p, concurrency: val }));
		else setInstance2((p) => ({ ...p, concurrency: val }));
	};

	const handleConcurrencySave = (idx: 0 | 1) => {
		autoSave(autoGenEnabled, instance1, instance2);
	};

	const handleWebhookChange = (idx: 0 | 1, val: string) => {
		if (idx === 0) setInstance1((p) => ({ ...p, webhook: val }));
		else setInstance2((p) => ({ ...p, webhook: val }));
	};

	const handleWebhookSave = (idx: 0 | 1) => {
		updateSettings.mutate(
			{ autoGenEnabled, instances: [instance1, instance2] },
			{
				onSuccess: () => void message.success("Webhook saved"),
				onError: () => void message.error("Failed to save webhook"),
			},
		);
	};

	return (
		<div style={{ ...DARK_CARD_STYLE, borderRadius: 8, marginBottom: 24 }}>
			<div
				style={{
					...DARK_CARD_HEADER_STYLE,
					padding: "12px 20px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<Title level={5} style={{ margin: 0, color: "#58bfce" }}>
					Orchestrator
				</Title>
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<Text style={{ color: "#8c8c8c", fontSize: 13 }}>
						Auto-generation
					</Text>
					<Switch
						checked={autoGenEnabled}
						onChange={handleAutoGenChange}
						checkedChildren="ON"
						unCheckedChildren="OFF"
						loading={updateSettings.isPending}
					/>
				</div>
			</div>

			<div
				style={{
					padding: "12px 20px",
					display: "flex",
					flexDirection: "column",
					gap: 8,
				}}
			>
				{isLoading ? (
					<div
						style={{ display: "flex", justifyContent: "center", padding: 16 }}
					>
						<Spin size="small" />
					</div>
				) : (
					<>
						<InstancePanel
							label="Instance 1"
							value={instance1}
							webhookDirty={webhookDirty(0)}
							saving={updateSettings.isPending}
							onEnabledChange={(v) => handleEnabledChange(0, v)}
							onConcurrencyChange={(v) => handleConcurrencyChange(0, v)}
							onConcurrencySave={() => handleConcurrencySave(0)}
							onWebhookChange={(v) => handleWebhookChange(0, v)}
							onSave={() => handleWebhookSave(0)}
						/>
						<InstancePanel
							label="Instance 2"
							value={instance2}
							webhookDirty={webhookDirty(1)}
							saving={updateSettings.isPending}
							onEnabledChange={(v) => handleEnabledChange(1, v)}
							onConcurrencyChange={(v) => handleConcurrencyChange(1, v)}
							onConcurrencySave={() => handleConcurrencySave(1)}
							onWebhookChange={(v) => handleWebhookChange(1, v)}
							onSave={() => handleWebhookSave(1)}
						/>
					</>
				)}
			</div>
		</div>
	);
}
