"use client";

import { ExportOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import {
	type StepStatus,
	useGetCompanyStepStatuses,
} from "../../../hooks/api/useReportStepsService";
import { formatDuration, runDuration } from "./run-format";
import { STATUS_META } from "./StatusCell";
import styles from "./steps-board.module.css";

function fmtTime(iso: string | null): string {
	if (!iso) return "—";
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

/**
 * Details of the last-clicked cell: company · step and the run metadata that
 * already arrives via step-runs — status, execution/workflow links, and the
 * start/end (a running step ticks from start to now, a pending one shows "—").
 */
export default function CellDetails({
	reportId,
	companyId,
	companyName,
	stepId,
	stepName,
	order,
	cellStatus,
}: {
	reportId: number;
	companyId: number;
	companyName: string;
	stepId: number;
	stepName: string;
	order: number;
	cellStatus: StepStatus;
}) {
	const { data } = useGetCompanyStepStatuses(reportId, companyId);
	const run = data?.data.find((r) => r.stepId === stepId);

	// Tick once a second so a running duration stays live.
	const [now, setNow] = useState(() => Date.now());
	// Status is the clicked cell's own status; timings/links come from the run.
	const status = cellStatus;
	const running = status === "PROCESSING";
	useEffect(() => {
		if (!running) return;
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, [running]);

	const meta = STATUS_META[status];
	const duration = runDuration(
		{
			status,
			startTime: run?.startTime ?? null,
			endTime: run?.endTime ?? null,
		},
		now,
	);

	return (
		<section className={styles.details} aria-label="Cell details">
			<div className={styles.detailsHead}>
				<span className={styles.detailsCompany}>{companyName}</span>
				<span className={styles.detailsSep}>·</span>
				<span className={styles.detailsStep}>
					{order}. {stepName}
				</span>
			</div>

			<div className={styles.detailsGrid}>
				<div className={styles.field}>
					<span className={styles.fieldLabel}>Status</span>
					<span className={styles.fieldVal}>
						<span className={styles.detailStatus}>
							<span className={`${styles.dot} ${meta.dot}`} />
							{meta.label}
						</span>
					</span>
				</div>

				<div className={styles.field}>
					<span className={styles.fieldLabel}>Execution</span>
					<span className={styles.fieldVal}>
						{run?.executionUrl ? (
							<a
								className={styles.detailLink}
								href={run.executionUrl}
								target="_blank"
								rel="noreferrer"
							>
								{run.execId} <ExportOutlined />
							</a>
						) : run?.execId ? (
							run.execId
						) : (
							<span className={styles.detailMuted}>—</span>
						)}
					</span>
				</div>

				<div className={styles.field}>
					<span className={styles.fieldLabel}>Workflow</span>
					<span className={styles.fieldVal}>
						{run?.workflowUrl ? (
							<a
								className={styles.detailLink}
								href={run.workflowUrl}
								target="_blank"
								rel="noreferrer"
							>
								Open <ExportOutlined />
							</a>
						) : (
							<span className={styles.detailMuted}>—</span>
						)}
					</span>
				</div>

				<div className={styles.field}>
					<span className={styles.fieldLabel}>Started</span>
					<span className={styles.fieldVal}>
						{fmtTime(run?.startTime ?? null)}
					</span>
				</div>

				<div className={styles.field}>
					<span className={styles.fieldLabel}>Finished</span>
					<span className={styles.fieldVal}>
						{duration.running ? (
							<span className={styles.detailMuted}>running…</span>
						) : (
							fmtTime(run?.endTime ?? null)
						)}
					</span>
				</div>

				<div className={styles.field}>
					<span className={styles.fieldLabel}>Duration</span>
					<span className={styles.fieldVal}>
						{status === "PENDING" ? "—" : formatDuration(duration.seconds)}
					</span>
				</div>
			</div>
		</section>
	);
}
