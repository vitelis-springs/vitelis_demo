"use client";

import { CaretRightFilled, PauseOutlined } from "@ant-design/icons";
import { App, Button, Tooltip } from "antd";
import { useEffect, useRef } from "react";
import {
	useEnsureOrchestrator,
	useGetEngineRun,
	useGetOrchestratorController,
	useGetOrchestratorStatus,
	usePauseEngineRun,
	useStartEngineRun,
	useTriggerEngineTick,
	useUpdateOrchestrator,
} from "../../hooks/api/useReportStepsService";
import {
	engineErrorMessage,
	engineReadErrorMessage,
	orchestratorErrorMessage,
} from "../../lib/orchestrator/engine-error-message";
import {
	startButtonState,
	startFeedback,
} from "../../lib/orchestrator/run-controls";

const ENGINE_INSTANCE = 1;

/**
 * Play/pause control for a report, over whichever orchestrator is currently
 * driving it.
 *
 * Under n8n it does exactly what it always did: flip report_orhestrator and
 * kick engine instance 1. Under sm_engine it drives the engine's own run —
 * and start there means "trigger or resume", a distinction the server makes,
 * because triggering a paused run is a silent no-op.
 */
export default function StartReportButton({ reportId }: { reportId: number }) {
	const { message } = App.useApp();

	const controllerQuery = useGetOrchestratorController();
	const controller = controllerQuery.data?.data?.controller;
	const isN8n = controller === "n8n";
	const isEngine = controller === "sm_engine";

	// --- n8n path, unchanged ---
	const orchestrator = useGetOrchestratorStatus(reportId, { enabled: isN8n });
	const ensureOrchestrator = useEnsureOrchestrator(reportId);
	const updateOrchestrator = useUpdateOrchestrator(reportId);
	const triggerEngine = useTriggerEngineTick(reportId);
	const hasEnsuredRef = useRef(false);

	// --- sm_engine path ---
	const runQuery = useGetEngineRun(reportId, { enabled: isEngine });
	const startRun = useStartEngineRun(reportId);
	const pauseRun = usePauseEngineRun(reportId);

	/**
	 * Creating the report_orhestrator row is an n8n-path concern: under
	 * sm_engine the engine lays down its own step rows when a run is
	 * triggered. Waiting for the controller before ensuring is what keeps
	 * this from writing that row on a report the engine owns.
	 */
	useEffect(() => {
		if (!isN8n || hasEnsuredRef.current) return;
		hasEnsuredRef.current = true;
		ensureOrchestrator.mutate(undefined, {
			onError: () => message.error("Failed to initialize orchestrator"),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isN8n]);

	const state = resolveState();
	const isBusy =
		updateOrchestrator.isPending ||
		triggerEngine.isPending ||
		startRun.isPending ||
		pauseRun.isPending;

	function resolveState() {
		if (controllerQuery.isLoading) return startButtonState({ kind: "loading" });

		if (controllerQuery.isError || (!isN8n && !isEngine)) {
			return startButtonState({
				kind: "unavailable",
				reason: engineReadErrorMessage(controllerQuery.error),
			});
		}

		if (isN8n) {
			if (orchestrator.isLoading) return startButtonState({ kind: "loading" });
			return startButtonState({
				kind: "n8n",
				status: orchestrator.data?.data?.status ?? "PENDING",
			});
		}

		if (runQuery.isLoading) return startButtonState({ kind: "loading" });
		if (runQuery.isError) {
			return startButtonState({
				kind: "unavailable",
				reason: engineReadErrorMessage(runQuery.error),
			});
		}
		return startButtonState({
			kind: "sm_engine",
			run: runQuery.data?.data?.run ?? null,
		});
	}

	const handleToggle = () => {
		if (isEngine) {
			if (state.mode === "pause") {
				pauseRun.mutate(undefined, {
					onSuccess: () => message.success("Report paused"),
					onError: (error) => message.error(engineErrorMessage(error)),
				});
				return;
			}

			startRun.mutate(undefined, {
				// The engine decides whether this triggered, resumed or found the
				// run already going; only it knows which of the three happened.
				onSuccess: (result) => {
					const { tone, text } = startFeedback(result.data?.action);
					message[tone](text);
				},
				onError: (error) => message.error(engineErrorMessage(error)),
			});
			return;
		}

		if (state.mode === "pause") {
			updateOrchestrator.mutate(
				{ status: "PENDING" },
				{
					onSuccess: () => message.success("Report paused"),
					onError: (error) =>
						message.error(
							orchestratorErrorMessage(error, "Failed to pause report"),
						),
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
						onError: (error) =>
							message.error(
								orchestratorErrorMessage(error, "Failed to trigger engine"),
							),
					});
				},
				onError: (error) =>
					message.error(
						orchestratorErrorMessage(error, "Failed to start report"),
					),
			},
		);
	};

	const isPause = state.mode === "pause";
	const isDisabled = state.mode === "disabled";

	return (
		<Tooltip title={state.tooltip}>
			<Button
				icon={
					isPause ? (
						<PauseOutlined style={{ fontSize: 14 }} />
					) : (
						<CaretRightFilled style={{ fontSize: 16 }} />
					)
				}
				onClick={handleToggle}
				loading={isBusy || state.mode === "loading"}
				disabled={isDisabled}
				type="primary"
				style={
					isDisabled
						? undefined
						: {
								backgroundColor: isPause ? "#faad14" : "#16a34a",
								borderColor: isPause ? "#faad14" : "#16a34a",
							}
				}
			>
				{state.label}
			</Button>
		</Tooltip>
	);
}
