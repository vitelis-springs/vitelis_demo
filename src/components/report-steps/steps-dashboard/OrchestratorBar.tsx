"use client";

import { DownOutlined, ThunderboltOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { App, Button, Dropdown, Spin } from "antd";
import { useState } from "react";
import {
	type StepStatus,
	useGetOrchestratorStatus,
	useTriggerEngineTick,
	useUpdateOrchestrator,
} from "../../../hooks/api/useReportStepsService";
import OrchestratorSettingsModal from "../OrchestratorSettingsModal";
import styles from "./orchestrator-bar.module.css";

const STATE_META: Record<
	StepStatus,
	{ label: string; pill: string; dot: string }
> = {
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

function formatValue(value: unknown): string {
	return typeof value === "object" && value !== null
		? JSON.stringify(value)
		: String(value);
}

/**
 * Shared orchestrator control strip, rendered above the tabs so run state is
 * visible and adjustable from both Dashboard and Config. Status is a pill you
 * click to set any state; engine ticks and settings sit inline beside it.
 */
export default function OrchestratorBar({ reportId }: { reportId: number }) {
	const { message } = App.useApp();
	const { data, isLoading } = useGetOrchestratorStatus(reportId, {
		refetchInterval: 20000,
	});
	const updateOrch = useUpdateOrchestrator(reportId);
	const triggerEngine = useTriggerEngineTick(reportId);

	const [settingsOpen, setSettingsOpen] = useState(false);

	const status = data?.data?.status ?? "PENDING";
	const isProcessing = status === "PROCESSING";
	const metadata = data?.data?.metadata as Record<string, unknown> | null;
	const meta = STATE_META[status];

	const statusItems: MenuProps["items"] = STATE_ORDER.map((s) => ({
		key: s,
		label: (
			<span className={styles.menuItem}>
				<span className={`${styles.menuDot} ${STATE_META[s].dot}`} />
				{STATE_META[s].label}
			</span>
		),
		onClick: () => {
			if (s !== status) updateOrch.mutate({ status: s });
		},
	}));

	const triggerTick = (instance: number) => {
		triggerEngine.mutate(instance, {
			onSuccess: () =>
				message.success(`Engine tick sent (instance ${instance})`),
			onError: () => message.error("Failed to trigger engine tick"),
		});
	};

	if (isLoading) {
		return (
			<div className={styles.bar}>
				<Spin size="small" />
				<span className={styles.label}>Loading orchestrator…</span>
			</div>
		);
	}

	const settingsEntries = metadata ? Object.entries(metadata) : [];

	return (
		<div className={styles.bar}>
			<div className={styles.brand}>
				<span className={`${styles.brandDot} ${meta.dot}`} />
				Orchestrator
			</div>

			<div className={styles.group}>
				<span className={styles.label}>State</span>
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
			</div>

			<div className={styles.group}>
				<span className={styles.label}>Engine</span>
				{ENGINES.map((instance) => (
					<Button
						key={instance}
						size="small"
						icon={<ThunderboltOutlined />}
						disabled={!isProcessing}
						loading={
							triggerEngine.isPending && triggerEngine.variables === instance
						}
						onClick={() => triggerTick(instance)}
					>
						{instance}
					</Button>
				))}
			</div>

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
