"use client";

import { ExportOutlined } from "@ant-design/icons";
import {
	type StepStatus,
	type StepsMatrixStep,
	useGetCompanyStepStatuses,
} from "../../../hooks/api/useReportStepsService";
import { formatDuration, runDuration } from "./run-format";
import { STATUS_META } from "./StatusCell";
import styles from "./steps-board.module.css";

function settingsCount(settings: unknown): number {
	if (settings && typeof settings === "object" && !Array.isArray(settings)) {
		return Object.keys(settings as Record<string, unknown>).length;
	}
	return 0;
}

function fmtTime(iso: string | null | undefined): string {
	if (!iso) return "—";
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

/**
 * Compact hover card for a single company × step cell. Surfaces the step's
 * definition (order, name, dependency, settings, url), the cell's status, and
 * the run metadata that CellDetails also shows — started/completed, duration,
 * and the n8n execution id + link. The wrapping Popover only mounts this on
 * hover, so the per-company run query fires lazily and is cached by React
 * Query. Purely presentational otherwise; the Popover owns the show/hide.
 */
export default function CellHoverCard({
	reportId,
	companyName,
	companyId,
	step,
	status,
}: {
	reportId: number;
	companyName: string;
	companyId: number;
	step: StepsMatrixStep;
	status: StepStatus;
}) {
	const { data } = useGetCompanyStepStatuses(reportId, companyId);
	const run = data?.data.find((r) => r.stepId === step.id);

	const meta = STATUS_META[status];
	const settings = settingsCount(step.settings);
	const duration = runDuration({
		status,
		startTime: run?.startTime ?? null,
		endTime: run?.endTime ?? null,
	});

	return (
		<div className={styles.hoverCard}>
			<div className={styles.hcHead}>
				<span className={styles.hcCompany}>{companyName}</span>
				<span className={styles.hcId}>#{companyId}</span>
			</div>
			<div className={styles.hcStep}>
				{step.order}. {step.name}
			</div>
			<span className={styles.hcStatus}>
				<span className={`${styles.dot} ${meta.dot}`} />
				{meta.label}
			</span>
			{(step.dependency || settings > 0 || step.url) && (
				<div className={styles.hcTags}>
					{step.dependency && (
						<span className={styles.ctxTag}>needs {step.dependency}</span>
					)}
					{settings > 0 && (
						<span className={styles.ctxTag}>
							{settings} setting{settings === 1 ? "" : "s"}
						</span>
					)}
					{step.url && <span className={styles.hcCode}>{step.url}</span>}
				</div>
			)}

			<dl className={styles.hcRuns}>
				<dt className={styles.hcRunLabel}>Started</dt>
				<dd className={styles.hcRunVal}>{fmtTime(run?.startTime)}</dd>

				<dt className={styles.hcRunLabel}>Completed</dt>
				<dd className={styles.hcRunVal}>
					{duration.running ? (
						<span className={styles.detailMuted}>running…</span>
					) : (
						fmtTime(run?.endTime)
					)}
				</dd>

				<dt className={styles.hcRunLabel}>Duration</dt>
				<dd className={styles.hcRunVal}>
					{status === "PENDING" ? "—" : formatDuration(duration.seconds)}
				</dd>

				<dt className={styles.hcRunLabel}>Execution</dt>
				<dd className={styles.hcRunVal}>
					{run?.executionUrl ? (
						<a
							className={styles.detailLink}
							href={run.executionUrl}
							target="_blank"
							rel="noreferrer"
						>
							{run.execId ?? "Open"} <ExportOutlined />
						</a>
					) : run?.execId ? (
						run.execId
					) : (
						<span className={styles.detailMuted}>—</span>
					)}
				</dd>
			</dl>
		</div>
	);
}
