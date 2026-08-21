"use client";

import {
	CaretRightFilled,
	DownOutlined,
	PauseOutlined,
	ThunderboltOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { App, Button, Dropdown, Spin } from "antd";
import { useState } from "react";
import {
	type EngineExecutionState,
	type EngineRun,
	type StepStatus,
	useGetEngineRun,
	useGetOrchestratorController,
	useGetOrchestratorStatus,
	usePauseEngineRun,
	useStartEngineRun,
	useTriggerEngineTick,
	useUpdateOrchestrator,
} from "../../../hooks/api/useReportStepsService";
import {
	engineErrorMessage,
	engineReadErrorMessage,
	orchestratorErrorMessage,
} from "../../../lib/orchestrator/engine-error-message";
import {
	engineRunControls,
	startFeedback,
} from "../../../lib/orchestrator/run-controls";
import OrchestratorSettingsModal from "../OrchestratorSettingsModal";
import styles from "./orchestrator-bar.module.css";

interface PillMeta {
	label: string;
	pill: string;
	dot: string;
}

const STATE_META: Record<StepStatus, PillMeta> = {
	PROCESSING: {
		label: "Active",
		pill: styles.active ?? "",
		dot: styles.dotActive ?? "",
	},
	PENDING: {
		label: "Paused",
		pill: styles.paused ?? "",
		dot: styles.dotPaused ?? "",
	},
	DONE: { label: "Done", pill: styles.done ?? "", dot: styles.dotDone ?? "" },
	ERROR: {
		label: "Error",
		pill: styles.error ?? "",
		dot: styles.dotError ?? "",
	},
};

const STATE_ORDER: StepStatus[] = ["PROCESSING", "PENDING", "DONE", "ERROR"];

const ENGINES = [1, 2];

/**
 * How the engine's run state reads in the same pill the n8n status uses, so
 * the strip looks like one control regardless of who is driving. The engine
 * distinguishes two things n8n's four statuses cannot: a run that is alive
 * but blocked on a person, and a run that finished with some work failed.
 */
const ENGINE_STATE_META: Record<EngineExecutionState, PillMeta> = {
	running: {
		label: "Active",
		pill: styles.active ?? "",
		dot: styles.dotActive ?? "",
	},
	paused: {
		label: "Paused",
		pill: styles.paused ?? "",
		dot: styles.dotPaused ?? "",
	},
	waiting_for_user: {
		label: "Waiting on you",
		pill: styles.paused ?? "",
		dot: styles.dotPaused ?? "",
	},
	completed: {
		label: "Done",
		pill: styles.done ?? "",
		dot: styles.dotDone ?? "",
	},
	partially_failed: {
		label: "Partly failed",
		pill: styles.error ?? "",
		dot: styles.dotError ?? "",
	},
	failed: {
		label: "Failed",
		pill: styles.error ?? "",
		dot: styles.dotError ?? "",
	},
	cancelled: {
		label: "Cancelled",
		pill: styles.paused ?? "",
		dot: styles.dotPaused ?? "",
	},
};

const NO_RUN_META: PillMeta = {
	label: "Not started",
	pill: styles.paused ?? "",
	dot: styles.dotPaused ?? "",
};

const UNAVAILABLE_META: PillMeta = {
	label: "Orchestrator unavailable",
	pill: styles.error ?? "",
	dot: styles.dotError ?? "",
};

/**
 * A run can be moving and still have failed work behind it. `running` alone
 * would render that identically to a clean run, so the pill says both.
 */
function engineMeta(run: EngineRun | null): PillMeta {
	if (!run) return NO_RUN_META;

	const meta = ENGINE_STATE_META[run.execution_state];
	if (run.execution_state === "running" && run.requires_user_action) {
		return { ...meta, label: `${meta.label} · has errors` };
	}
	return meta;
}

function formatValue(value: unknown): string {
	return typeof value === "object" && value !== null
		? JSON.stringify(value)
		: String(value);
}

/**
 * Shared orchestrator control strip, rendered above the tabs so run state is
 * visible and adjustable from both Dashboard and Config.
 *
 * What it offers depends on who is driving. Under n8n the status is a pill you
 * click to set any state, with manual engine ticks beside it. Under sm_engine
 * the engine owns the status — setting it by hand would be lying to it — so
 * the pill is read-only and the only actions are Start and Pause. The engine
 * tick buttons are an n8n mechanism (a pg_notify listener) and disappear
 * entirely.
 */
export default function OrchestratorBar({ reportId }: { reportId: number }) {
	const { message } = App.useApp();

	const controllerQuery = useGetOrchestratorController();
	const controller = controllerQuery.data?.data?.controller;
	const isN8n = controller === "n8n";
	const isEngine = controller === "sm_engine";
	const controllerUnavailable =
		controllerQuery.isError || (!isN8n && !isEngine);

	// Stays enabled under both orchestrators: even when sm_engine drives the
	// run, report_orhestrator.metadata is where the per-report parallel limit
	// lives, and the settings editor below still reads and writes it.
	const { data, isLoading } = useGetOrchestratorStatus(reportId, {
		refetchInterval: 20000,
	});
	const updateOrch = useUpdateOrchestrator(reportId);
	const triggerEngine = useTriggerEngineTick(reportId);

	const runQuery = useGetEngineRun(reportId, { enabled: isEngine });
	const startRun = useStartEngineRun(reportId);
	const pauseRun = usePauseEngineRun(reportId);

	const [settingsOpen, setSettingsOpen] = useState(false);

	const status = data?.data?.status ?? "PENDING";
	const isProcessing = status === "PROCESSING";
	const metadata = data?.data?.metadata as Record<string, unknown> | null;

	const run = runQuery.data?.data?.run ?? null;
	const meta = controllerUnavailable
		? UNAVAILABLE_META
		: isEngine
			? engineMeta(run)
			: STATE_META[status];

	const statusItems: MenuProps["items"] = STATE_ORDER.map((s) => ({
		key: s,
		label: (
			<span className={styles.menuItem}>
				<span className={`${styles.menuDot} ${STATE_META[s].dot}`} />
				{STATE_META[s].label}
			</span>
		),
		onClick: () => {
			if (s === status) return;
			updateOrch.mutate(
				{ status: s },
				{
					onError: (error) =>
						message.error(
							orchestratorErrorMessage(error, "Failed to set the status"),
						),
				},
			);
		},
	}));

	const triggerTick = (instance: number) => {
		triggerEngine.mutate(instance, {
			onSuccess: () =>
				message.success(`Engine tick sent (instance ${instance})`),
			onError: (error) =>
				message.error(
					orchestratorErrorMessage(error, "Failed to trigger engine tick"),
				),
		});
	};

	const startEngineRun = () => {
		startRun.mutate(undefined, {
			// Trigger, resume or "it was already going" — only the engine knows
			// which of the three this turned out to be.
			onSuccess: (result) => {
				const { tone, text } = startFeedback(result.data?.action);
				message[tone](text);
			},
			onError: (error) => message.error(engineErrorMessage(error)),
		});
	};

	const pauseEngineRun = () => {
		pauseRun.mutate(undefined, {
			onSuccess: () => message.success("Report paused"),
			onError: (error) => message.error(engineErrorMessage(error)),
		});
	};

	if (
		controllerQuery.isLoading ||
		isLoading ||
		(isEngine && runQuery.isLoading)
	) {
		return (
			<div className={styles.bar}>
				<Spin size="small" />
				<span className={styles.label}>Loading orchestrator…</span>
			</div>
		);
	}

	const settingsEntries = metadata ? Object.entries(metadata) : [];
	const controls = engineRunControls(run);

	return (
		<div className={styles.bar}>
			<div className={styles.brand}>
				<span className={`${styles.brandDot} ${meta.dot}`} />
				Orchestrator
			</div>

			{/**
			 * A controller we cannot read costs us the state pill and the run
			 * actions — we would be guessing who owns the report — but not the
			 * settings below, which are the same row under either orchestrator.
			 */}
			{controllerUnavailable ? (
				<div className={styles.group}>
					<span className={styles.label}>State</span>
					<span
						className={`${styles.pill} ${styles.pillStatic} ${meta.pill}`}
						role="status"
					>
						<span className={`${styles.pillDot} ${meta.dot}`} />
						{engineReadErrorMessage(controllerQuery.error)}
					</span>
				</div>
			) : (
				<>
					<div className={styles.group}>
						<span className={styles.label}>State</span>
						{isEngine ? (
							<span
								className={`${styles.pill} ${styles.pillStatic} ${meta.pill}`}
								role="status"
							>
								<span className={`${styles.pillDot} ${meta.dot}`} />
								{meta.label}
							</span>
						) : (
							<Dropdown
								menu={{ items: statusItems }}
								trigger={["click"]}
								disabled={updateOrch.isPending}
							>
								<button type="button" className={`${styles.pill} ${meta.pill}`}>
									<span className={`${styles.pillDot} ${meta.dot}`} />
									{meta.label}
									<DownOutlined className={styles.pillCaret} />
								</button>
							</Dropdown>
						)}
					</div>

					{isEngine ? (
						<div className={styles.group} title={controls.hint || undefined}>
							<span className={styles.label}>Run</span>
							<Button
								size="small"
								icon={<CaretRightFilled />}
								disabled={!controls.canStart}
								loading={startRun.isPending}
								onClick={startEngineRun}
							>
								{controls.startLabel}
							</Button>
							<Button
								size="small"
								icon={<PauseOutlined />}
								disabled={!controls.canPause}
								loading={pauseRun.isPending}
								onClick={pauseEngineRun}
							>
								Pause
							</Button>
						</div>
					) : (
						<div className={styles.group}>
							<span className={styles.label}>Engine</span>
							{ENGINES.map((instance) => (
								<Button
									key={instance}
									size="small"
									icon={<ThunderboltOutlined />}
									disabled={!isProcessing}
									loading={
										triggerEngine.isPending &&
										triggerEngine.variables === instance
									}
									onClick={() => triggerTick(instance)}
								>
									{instance}
								</Button>
							))}
						</div>
					)}
				</>
			)}

			<div className={styles.settings}>
				<div className={styles.chips}>
					{settingsEntries.length === 0 ? (
						<span className={styles.noSettings}>No settings</span>
					) : (
						settingsEntries.map(([key, value]) => (
							<span className={styles.metaChip} key={key}>
								<span className={styles.metaKey}>{key}</span>
								<span className={styles.metaVal}>{formatValue(value)}</span>
							</span>
						))
					)}
				</div>
				<Button size="small" type="text" onClick={() => setSettingsOpen(true)}>
					Edit
				</Button>
			</div>

			<OrchestratorSettingsModal
				open={settingsOpen}
				metadata={metadata}
				reportId={reportId}
				onClose={() => setSettingsOpen(false)}
			/>
		</div>
	);
}
