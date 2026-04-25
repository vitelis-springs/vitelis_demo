"use client";

import { App, Input, Modal, Select, Typography } from "antd";
import { useEffect, useState } from "react";
import type {
	GenerationStep,
	StepDependency,
	StepReportType,
} from "../../hooks/api/useReportStepsService";
import { useUpdateGenerationStepSettings } from "../../hooks/api/useReportStepsService";

const { Text } = Typography;
const NONE_OPTION = "__none__";

interface StepSettingsModalProps {
	step: GenerationStep | null;
	reportId: number;
	onClose: () => void;
}

export default function StepSettingsModal({
	step,
	reportId,
	onClose,
}: StepSettingsModalProps) {
	const { message } = App.useApp();
	const updateStep = useUpdateGenerationStepSettings(reportId);

	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [dependency, setDependency] = useState<StepDependency>(null);
	const [reportType, setReportType] = useState<StepReportType>(null);
	const [jsonText, setJsonText] = useState("");
	const [parseError, setParseError] = useState<string | null>(null);

	useEffect(() => {
		if (!step) return;

		setName(step.name ?? "");
		setUrl(step.url ?? "");
		setDependency(step.dependency ?? null);
		setReportType(step.reportType ?? null);
		setJsonText(JSON.stringify(step.settings ?? {}, null, 2));
		setParseError(null);
	}, [step]);

	const handleChangeJson = (value: string) => {
		setJsonText(value);
		try {
			JSON.parse(value);
			setParseError(null);
		} catch (error) {
			setParseError((error as Error).message);
		}
	};

	const handleSave = () => {
		if (!step) return;

		let parsedSettings: Record<string, unknown>;
		try {
			parsedSettings = JSON.parse(jsonText) as Record<string, unknown>;
		} catch {
			message.error("Invalid JSON");
			return;
		}

		updateStep.mutate(
			{
				stepId: step.id,
				payload: {
					name: name.trim(),
					url: url.trim(),
					dependency,
					reportType,
					settings:
						Object.keys(parsedSettings).length > 0 ? parsedSettings : null,
				},
			},
			{
				onSuccess: (result) => {
					if (result.success) {
						message.success("Step saved");
						onClose();
						return;
					}

					message.error(result.error || "Failed to save step");
				},
				onError: () => {
					message.error("Failed to save step");
				},
			},
		);
	};

	return (
		<Modal
			title={step ? `Step: ${step.name}` : "Step settings"}
			open={!!step}
			onCancel={onClose}
			onOk={handleSave}
			okText="Save"
			okButtonProps={{ disabled: !!parseError || !name.trim() || !url.trim() }}
			confirmLoading={updateStep.isPending}
			width={720}
			destroyOnHidden
		>
			<div style={{ display: "grid", gap: 16 }}>
				<div>
					<Text
						style={{
							color: "#8c8c8c",
							fontSize: 12,
							display: "block",
							marginBottom: 6,
						}}
					>
						ID
					</Text>
					<Input value={step?.id ?? ""} readOnly />
				</div>

				<div>
					<Text
						style={{
							color: "#8c8c8c",
							fontSize: 12,
							display: "block",
							marginBottom: 6,
						}}
					>
						Name
					</Text>
					<Input
						value={name}
						onChange={(event) => setName(event.target.value)}
					/>
				</div>

				<div>
					<Text
						style={{
							color: "#8c8c8c",
							fontSize: 12,
							display: "block",
							marginBottom: 6,
						}}
					>
						URL
					</Text>
					<Input value={url} onChange={(event) => setUrl(event.target.value)} />
				</div>

				<div
					style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
				>
					<div>
						<Text
							style={{
								color: "#8c8c8c",
								fontSize: 12,
								display: "block",
								marginBottom: 6,
							}}
						>
							Dependency
						</Text>
						<Select
							value={dependency ?? NONE_OPTION}
							onChange={(value) =>
								setDependency(
									value === NONE_OPTION ? null : (value as StepDependency),
								)
							}
							style={{ width: "100%" }}
							options={[
								{ label: "None", value: NONE_OPTION },
								{ label: "RDP", value: "rdp" },
								{ label: "KPI", value: "kpi" },
								{ label: "Category", value: "category" },
								{ label: "URL", value: "url" },
							]}
						/>
					</div>

					<div>
						<Text
							style={{
								color: "#8c8c8c",
								fontSize: 12,
								display: "block",
								marginBottom: 6,
							}}
						>
							Report Type
						</Text>
						<Select
							value={reportType ?? NONE_OPTION}
							onChange={(value) =>
								setReportType(
									value === NONE_OPTION ? null : (value as StepReportType),
								)
							}
							style={{ width: "100%" }}
							options={[
								{ label: "All", value: NONE_OPTION },
								{ label: "Biz Miner", value: "biz_miner" },
								{ label: "Sales Miner", value: "sales_miner" },
							]}
						/>
					</div>
				</div>

				<div>
					<Text
						style={{
							color: "#8c8c8c",
							fontSize: 12,
							display: "block",
							marginBottom: 6,
						}}
					>
						Settings JSON
					</Text>
					<Text
						style={{
							color: "#8c8c8c",
							fontSize: 12,
							display: "block",
							marginBottom: 8,
						}}
					>
						Empty object will clear settings.
					</Text>
					<Input.TextArea
						value={jsonText}
						onChange={(event) => handleChangeJson(event.target.value)}
						autoSize={{ minRows: 8, maxRows: 20 }}
						status={parseError ? "error" : undefined}
						style={{
							fontFamily: "monospace",
							fontSize: 13,
							backgroundColor: "#1f1f1f",
							color: "#d9d9d9",
						}}
					/>
					{parseError ? (
						<Text
							style={{
								color: "#ff4d4f",
								fontSize: 12,
								marginTop: 4,
								display: "block",
							}}
						>
							{parseError}
						</Text>
					) : null}
				</div>
			</div>
		</Modal>
	);
}
