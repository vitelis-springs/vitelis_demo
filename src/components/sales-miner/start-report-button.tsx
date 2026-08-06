"use client";

import { CaretRightFilled, PauseOutlined } from "@ant-design/icons";
import { App, Button, Tooltip } from "antd";
import { useEffect, useRef } from "react";
import {
	useEnsureOrchestrator,
	useGetOrchestratorStatus,
	useTriggerEngineTick,
	useUpdateOrchestrator,
} from "../../hooks/api/useReportStepsService";

const ENGINE_INSTANCE = 1;

/**
 * Play/pause control that mirrors the two actions available on the
 * report steps page: activating the orchestrator and kicking off engine
 * instance 1. Pausing simply flips the orchestrator back to PENDING.
 */
export default function StartReportButton({ reportId }: { reportId: number }) {
	const { message } = App.useApp();
	const { data, isLoading } = useGetOrchestratorStatus(reportId);
	const ensureOrchestrator = useEnsureOrchestrator(reportId);
	const updateOrchestrator = useUpdateOrchestrator(reportId);
	const triggerEngine = useTriggerEngineTick(reportId);
	const hasEnsuredRef = useRef(false);

	useEffect(() => {
		if (hasEnsuredRef.current) return;
		hasEnsuredRef.current = true;
		ensureOrchestrator.mutate(undefined, {
			onError: () => message.error("Failed to initialize orchestrator"),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const status = data?.data?.status ?? "PENDING";
	const isProcessing = status === "PROCESSING";
	const isDone = status === "DONE";
	const isBusy = updateOrchestrator.isPending || triggerEngine.isPending;

	const handleToggle = () => {
		if (isProcessing) {
			updateOrchestrator.mutate(
				{ status: "PENDING" },
				{
					onSuccess: () => message.success("Report paused"),
					onError: () => message.error("Failed to pause report"),
				},
			);
			return;
		}

		updateOrchestrator.mutate(
			{ status: "PROCESSING" },
			{
				onSuccess: () => {
					message.success("Report started");
					triggerEngine.mutate(ENGINE_INSTANCE, {
						onError: () => message.error("Failed to trigger engine"),
					});
				},
				onError: () => message.error("Failed to start report"),
			},
		);
	};

	return (
		<Tooltip
			title={
				isDone
					? "Report completed"
					: isProcessing
						? "Pause report"
						: "Start report"
			}
		>
			<Button
				icon={
					isProcessing ? (
						<PauseOutlined style={{ fontSize: 14 }} />
					) : (
						<CaretRightFilled style={{ fontSize: 16 }} />
					)
				}
				onClick={handleToggle}
				loading={isBusy || isLoading}
				disabled={isDone}
				type="primary"
				style={
					isDone
						? undefined
						: {
								backgroundColor: isProcessing ? "#faad14" : "#16a34a",
								borderColor: isProcessing ? "#faad14" : "#16a34a",
							}
				}
			>
				{isProcessing ? "Pause" : "Start"}
			</Button>
		</Tooltip>
	);
}
