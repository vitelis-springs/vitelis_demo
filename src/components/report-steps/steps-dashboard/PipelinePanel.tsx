"use client";

import { DeleteOutlined, ExportOutlined } from "@ant-design/icons";
import { App, Button, InputNumber, Popconfirm, Spin } from "antd";
import {
	useGetReportStepRuns,
	useRemoveStepFromReport,
	useUpdateStepOrder,
} from "../../../hooks/api/useReportStepsService";
import styles from "./pipeline.module.css";

/**
 * Config "pipeline": the report's configured steps as step definitions —
 * order, name, and a deep-link to the step's n8n workflow — with reorder and
 * remove. Run status/timings live on the Dashboard, not here.
 */
export default function PipelinePanel({ reportId }: { reportId: number }) {
	const { message } = App.useApp();
	const { data, isLoading } = useGetReportStepRuns(reportId);
	const removeStep = useRemoveStepFromReport(reportId);
	const updateOrder = useUpdateStepOrder(reportId);

	const steps = data?.data ?? [];

	const handleRemove = (stepId: number) => {
		removeStep.mutate(stepId, {
			onSuccess: (res) => {
				if (res.success) message.success("Step removed");
				else message.error(res.error || "Failed to remove step");
			},
			onError: () => message.error("Failed to remove step"),
		});
	};

	const handleOrder = (stepId: number, order: number | null) => {
		if (order == null || !Number.isInteger(order) || order < 1) return;
		updateOrder.mutate(
			{ stepId, order },
			{ onError: () => message.error("Failed to update step order") },
		);
	};

	return (
		<section className={styles.panel} aria-label="Pipeline">
			<div className={styles.head}>
				<h3>Pipeline</h3>
				<span className={styles.hint}>
					{steps.length} steps · open the n8n workflow for any step
				</span>
			</div>

			{isLoading ? (
				<div style={{ textAlign: "center", padding: 24 }}>
					<Spin />
				</div>
			) : steps.length === 0 ? (
				<p className={styles.empty}>
					No steps configured yet. Add steps below to build the pipeline.
				</p>
			) : (
				<div className={styles.list}>
					{steps.map((step) => (
						<div className={styles.row} key={step.stepId}>
							<span className={styles.order}>{step.order}</span>

							<div className={styles.main}>
								<span className={styles.name} title={step.name}>
									{step.name}
								</span>
								{step.workflowUrl ? (
									<a
										className={styles.wfLink}
										href={step.workflowUrl}
										target="_blank"
										rel="noreferrer"
									>
										Workflow <ExportOutlined />
									</a>
								) : (
									<span className={styles.wfNone}>No workflow linked</span>
								)}
							</div>

							<div className={styles.actions}>
								<InputNumber
									size="small"
									min={1}
									value={step.order}
									onChange={(v) => handleOrder(step.stepId, v)}
									controls={false}
									style={{ width: 52 }}
									aria-label={`Order for ${step.name}`}
								/>
								<Popconfirm
									title="Remove this step?"
									okText="Remove"
									okButtonProps={{ danger: true }}
									cancelText="Cancel"
									onConfirm={() => handleRemove(step.stepId)}
								>
									<Button
										size="small"
										type="text"
										danger
										icon={<DeleteOutlined />}
										loading={
											removeStep.isPending &&
											removeStep.variables === step.stepId
										}
									/>
								</Popconfirm>
							</div>
						</div>
					))}
				</div>
			)}
		</section>
	);
}
