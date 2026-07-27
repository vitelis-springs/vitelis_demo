import type { N8NInstanceKey } from "../n8n/n8n.service";
import type { MonitorStepStatus } from "./monitoring.types";

export const PRODUCT_LABELS: Record<string, string> = {
	biz_miner: "BizMiner",
	sales_miner: "SalesMiner",
};

export function productLabel(reportType: string | null): string {
	if (!reportType) return "Other";
	return PRODUCT_LABELS[reportType] ?? reportType;
}

/** BizMiner runs on its own n8n instance; everything else shares the main one. */
export function instanceForReportType(
	reportType: string | null,
): N8NInstanceKey {
	return reportType === "biz_miner" ? "bizminer" : "salesminer";
}

/**
 * Deep link to the exact n8n execution behind a step. The execution id always
 * exists here, but the workflow id is a manual mapping on
 * report_generation_steps, so a step can still be unlinkable.
 */
export function buildExecutionUrl(
	host: string | null,
	workflowId: string | null,
	executionId: string,
): string | null {
	if (!host || !workflowId) return null;
	return `${host}workflow/${workflowId}/executions/${executionId}`;
}

/** Report detail routes differ per product — see src/app/(client). */
export function buildReportHref(
	reportType: string | null,
	reportId: number,
): string {
	if (reportType === "biz_miner") return `/biz-miner/${reportId}`;
	if (reportType === "sales_miner") return `/sales-miner/reports/${reportId}`;
	return `/deep-dive/${reportId}`;
}

/**
 * How long a step has taken. A finished step is measured end-to-end; a running
 * one is measured against the clock, which is what makes stuck runs grow.
 */
export function durationMs(
	startedAt: Date,
	finishedAt: Date | null,
	now: number,
): number {
	const end = finishedAt ? finishedAt.getTime() : now;
	return Math.max(0, end - startedAt.getTime());
}

/**
 * Nothing reconciles report_step_statuses when an n8n run dies mid-flight, so a
 * step sitting in PROCESSING past the threshold is the only signal that a run
 * was lost.
 */
export function isStuck(
	status: MonitorStepStatus,
	durationMs: number,
	thresholdMs: number,
): boolean {
	return status === "PROCESSING" && durationMs >= thresholdMs;
}

/** A run is failed if anything failed, running while anything is still going. */
export function runStatus(counts: {
	running: number;
	error: number;
}): "running" | "error" | "done" {
	if (counts.running > 0) return "running";
	if (counts.error > 0) return "error";
	return "done";
}
