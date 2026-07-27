"use client";

import { PlusOutlined } from "@ant-design/icons";
import { App, Collapse, Space } from "antd";
import { useState } from "react";
import type { GenerationStep } from "../../../hooks/api/useReportStepsService";
import {
	useAddStepToReport,
	useGetReportSteps,
} from "../../../hooks/api/useReportStepsService";
import AvailableStepsList from "../AvailableStepsList";
import StepSettingsModal from "../StepSettingsModal";
import PipelinePanel from "./PipelinePanel";
import PresetsPanel from "./PresetsPanel";

/**
 * Config tab: the pipeline (configured steps with workflow/run links, reorder,
 * remove), a collapsible catalog to add more steps, and preset management.
 */
export default function StepsConfig({
	reportId,
	reportType,
}: {
	reportId: number;
	reportType?: string | null;
}) {
	const { message } = App.useApp();
	const [addingStepId, setAddingStepId] = useState<number | null>(null);
	const [settingsStep, setSettingsStep] = useState<GenerationStep | null>(null);

	const { data: stepsData, isLoading: stepsLoading } =
		useGetReportSteps(reportId);
	const addStep = useAddStepToReport(reportId);

	const available = stepsData?.data?.available ?? [];

	const handleAddStep = (stepId: number) => {
		setAddingStepId(stepId);
		addStep.mutate(stepId, {
			onSuccess: (result) => {
				if (result.success) message.success("Step added");
				else message.error(result.error || "Failed to add step");
				setAddingStepId(null);
			},
			onError: () => {
				message.error("Failed to add step");
				setAddingStepId(null);
			},
		});
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
			<PipelinePanel reportId={reportId} />

			<Collapse
				style={{ background: "#1f1f1f", border: "1px solid #303030" }}
				items={[
					{
						key: "add-steps",
						label: (
							<Space>
								<PlusOutlined style={{ color: "#58bfce" }} />
								<span style={{ color: "#d9d9d9", fontWeight: 600 }}>
									Add steps
								</span>
								<span style={{ color: "#8c8c8c", fontSize: 13 }}>
									{available.length} available
								</span>
							</Space>
						),
						style: { background: "#1f1f1f", border: "none" },
						children: (
							<AvailableStepsList
								steps={available}
								loading={stepsLoading}
								onAdd={handleAddStep}
								onOpenSettings={setSettingsStep}
								addingStepId={addingStepId}
								reportType={reportType}
							/>
						),
					},
				]}
			/>

			<PresetsPanel reportId={reportId} />

			<StepSettingsModal
				step={settingsStep}
				reportId={reportId}
				onClose={() => setSettingsStep(null)}
			/>
		</div>
	);
}
