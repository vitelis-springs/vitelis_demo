import type { N8NInstanceKey } from "../n8n/n8n.service";

export type { N8NInstanceKey };

export type MonitorStepStatus = "PENDING" | "PROCESSING" | "DONE" | "ERROR";

/** Rolled-up state of a whole report run, derived from its step rows. */
export type MonitorRunStatus = "running" | "error" | "done";

/**
 * One step of one report run. Only steps that carry both an exec_id and a
 * start_time reach this type — everything else is invisible to the dashboard.
 */
export interface MonitorStepRow {
	stepId: number;
	stepName: string | null;
	stepOrder: number | null;
	workflowId: string | null;
	/** report_step_statuses.metadata->>'exec_id'. Never null by construction. */
	executionId: string;
	status: MonitorStepStatus;
	startedAt: string;
	finishedAt: string | null;
	/** Wall clock the step has taken: end_time - start_time, or now - start_time while running. */
	durationMs: number;
	/** Still running, and running for longer than the configured threshold. */
	isStuck: boolean;
	/** Deep link to the exact n8n execution. Null when the step has no workflow_id yet. */
	n8nUrl: string | null;
}

export interface MonitorRunCounts {
	total: number;
	running: number;
	done: number;
	error: number;
}

/**
 * One (report, company) pair with the steps executed for it. A single report can
 * be run for several companies, so these sit under a MonitorReportRow rather than
 * at the top level.
 */
export interface MonitorCompanyRow {
	key: string;
	reportId: number;
	companyId: number;
	companyName: string | null;
	status: MonitorRunStatus;
	/** Earliest step start. */
	startedAt: string;
	/** Latest step end, null while any step is still running. */
	finishedAt: string | null;
	durationMs: number;
	counts: MonitorRunCounts;
	stuck: number;
	steps: MonitorStepRow[];
}

/**
 * A report, with every company it is currently running for. Status, counts and
 * timing are rolled up across all of its companies.
 */
export interface MonitorReportRow {
	key: string;
	reportId: number;
	reportName: string | null;
	reportType: string | null;
	status: MonitorRunStatus;
	/** Earliest step start across all companies. */
	startedAt: string;
	/** Latest step end, null while any company is still running. */
	finishedAt: string | null;
	durationMs: number;
	counts: MonitorRunCounts;
	stuck: number;
	companyCount: number;
	reportHref: string;
	companies: MonitorCompanyRow[];
}

export interface MonitorSummaryBucket {
	reportType: string;
	label: string;
	runs: number;
	running: number;
	stuck: number;
	errors: number;
}

export interface MonitorSummary {
	runs: number;
	running: number;
	stuck: number;
	errors: number;
	byProduct: MonitorSummaryBucket[];
}

export interface MonitorRunsResult {
	reports: MonitorReportRow[];
	summary: MonitorSummary;
	stuckAfterMinutes: number;
	lookbackHours: number;
	/**
	 * True when more (report, company) runs matched than the cap allows, so the
	 * displayed companies are trimmed.
	 */
	truncated: boolean;
	generatedAt: string;
}
