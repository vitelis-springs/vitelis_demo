/** biome-ignore-all lint/complexity/noStaticOnlyClass: Service methods are grouped statically to match existing module conventions. */

import type { MonitoringSettings } from "../app-settings/app-settings.service";
import { AppSettingsService } from "../app-settings/app-settings.service";
import { N8NService } from "../n8n/n8n.service";
import type { RunStepRow } from "./monitoring.repository";
import { MonitoringRepository } from "./monitoring.repository";
import {
	buildExecutionUrl,
	buildReportHref,
	durationMs,
	instanceForReportType,
	isStuck,
	productLabel,
	runStatus,
} from "./monitoring.tools";
import type {
	MonitorCompanyRow,
	MonitorReportRow,
	MonitorRunsResult,
	MonitorStepRow,
	MonitorSummary,
} from "./monitoring.types";

/** Runs, not steps — one run can carry dozens of step rows. */
const RUN_LIMIT = 200;

export class MonitoringService {
	/**
	 * The whole dashboard in one call: active report runs with their steps, plus
	 * the headline counts. Everything is read from Postgres — no n8n traffic.
	 */
	static async getRuns(): Promise<MonitorRunsResult> {
		const settings = await AppSettingsService.getMonitoring();
		const now = Date.now();
		const since = new Date(now - settings.lookbackHours * 3_600_000);
		const stuckAfterMs = settings.stuckAfterMinutes * 60_000;
		const stuckBefore = new Date(now - stuckAfterMs);

		const [stepRows, summaryRows] = await Promise.all([
			MonitoringRepository.findRunSteps({ since, runLimit: RUN_LIMIT }),
			MonitoringRepository.summarise({ since, stuckBefore }),
		]);

		// Hosts are resolved once per product rather than per row.
		const hostCache = new Map<string, string | null>();
		const hostFor = (reportType: string | null): string | null => {
			const key = instanceForReportType(reportType);
			if (!hostCache.has(key)) {
				hostCache.set(key, N8NService.getInstanceHost(key));
			}
			return hostCache.get(key) ?? null;
		};

		const reports = MonitoringService.groupIntoReports(
			stepRows,
			now,
			stuckAfterMs,
			hostFor,
		);

		const summary: MonitorSummary = {
			runs: summaryRows.reduce((total, row) => total + row.runs, 0),
			running: summaryRows.reduce((total, row) => total + row.running, 0),
			stuck: summaryRows.reduce((total, row) => total + row.stuck, 0),
			errors: summaryRows.reduce((total, row) => total + row.errors, 0),
			byProduct: summaryRows.map((row) => ({
				reportType: row.report_type ?? "unknown",
				label: productLabel(row.report_type),
				runs: row.runs,
				running: row.running,
				stuck: row.stuck,
				errors: row.errors,
			})),
		};

		return {
			reports,
			summary,
			stuckAfterMinutes: settings.stuckAfterMinutes,
			lookbackHours: settings.lookbackHours,
			truncated: summary.runs > MonitoringService.countCompanies(reports),
			generatedAt: new Date(now).toISOString(),
		};
	}

	private static countCompanies(reports: MonitorReportRow[]): number {
		return reports.reduce((total, report) => total + report.companyCount, 0);
	}

	/**
	 * Fold the flat step rows into a report → company → step tree. The SQL returns
	 * every company of a report contiguously, reports newest-first, so insertion
	 * order is already the display order.
	 */
	private static groupIntoReports(
		stepRows: RunStepRow[],
		now: number,
		stuckAfterMs: number,
		hostFor: (reportType: string | null) => string | null,
	): MonitorReportRow[] {
		const byReport = new Map<number, MonitorReportRow>();
		const byCompany = new Map<string, MonitorCompanyRow>();

		for (const row of stepRows) {
			let report = byReport.get(row.report_id);
			if (!report) {
				report = {
					key: `${row.report_id}`,
					reportId: row.report_id,
					reportName: row.report_name,
					reportType: row.report_type,
					status: "done",
					startedAt: row.start_time.toISOString(),
					finishedAt: null,
					durationMs: 0,
					counts: { total: 0, running: 0, done: 0, error: 0 },
					stuck: 0,
					companyCount: 0,
					reportHref: buildReportHref(row.report_type, row.report_id),
					companies: [],
				};
				byReport.set(row.report_id, report);
			}

			const companyKey = `${row.report_id}:${row.company_id}`;
			let company = byCompany.get(companyKey);
			if (!company) {
				company = {
					key: companyKey,
					reportId: row.report_id,
					companyId: row.company_id,
					companyName: row.company_name,
					status: "done",
					startedAt: row.start_time.toISOString(),
					finishedAt: null,
					durationMs: 0,
					counts: { total: 0, running: 0, done: 0, error: 0 },
					stuck: 0,
					steps: [],
				};
				byCompany.set(companyKey, company);
				report.companies.push(company);
			}

			const stepDuration = durationMs(row.start_time, row.end_time, now);
			const stepStuck = isStuck(row.status, stepDuration, stuckAfterMs);

			const step: MonitorStepRow = {
				stepId: row.step_id,
				stepName: row.step_name,
				stepOrder: row.step_order,
				workflowId: row.workflow_id,
				executionId: row.exec_id,
				status: row.status,
				startedAt: row.start_time.toISOString(),
				finishedAt: row.end_time?.toISOString() ?? null,
				durationMs: stepDuration,
				isStuck: stepStuck,
				n8nUrl: buildExecutionUrl(
					hostFor(row.report_type),
					row.workflow_id,
					row.exec_id,
				),
			};

			company.steps.push(step);
			company.counts.total += 1;
			if (row.status === "PROCESSING") company.counts.running += 1;
			else if (row.status === "ERROR") company.counts.error += 1;
			else if (row.status === "DONE") company.counts.done += 1;
			if (stepStuck) company.stuck += 1;
			if (step.startedAt < company.startedAt)
				company.startedAt = step.startedAt;
		}

		const reports = Array.from(byReport.values());

		for (const report of reports) {
			for (const company of report.companies) {
				MonitoringService.finalise(company, company.steps, now);
			}

			// Roll company totals up to the report.
			report.companyCount = report.companies.length;
			for (const company of report.companies) {
				report.counts.total += company.counts.total;
				report.counts.running += company.counts.running;
				report.counts.done += company.counts.done;
				report.counts.error += company.counts.error;
				report.stuck += company.stuck;
				if (company.startedAt < report.startedAt)
					report.startedAt = company.startedAt;
			}
			MonitoringService.finalise(report, [], now, report.companies);
		}

		return reports;
	}

	/**
	 * Derive rolled-up status, finished time and duration for a run node. A node
	 * is only "finished" once every one of its children has an end; children are
	 * the node's own steps, or (for a report) its companies.
	 */
	private static finalise(
		node: MonitorCompanyRow | MonitorReportRow,
		steps: MonitorStepRow[],
		now: number,
		companies?: MonitorCompanyRow[],
	): void {
		node.status = runStatus(node.counts);

		const ends = companies
			? companies.map((company) => company.finishedAt)
			: steps.map((step) => step.finishedAt);

		node.finishedAt =
			ends.length > 0 && ends.every((end): end is string => end !== null)
				? ends.reduce((latest, end) => (end > latest ? end : latest))
				: null;

		node.durationMs = durationMs(
			new Date(node.startedAt),
			node.finishedAt ? new Date(node.finishedAt) : null,
			now,
		);
	}

	static async getSettings(): Promise<MonitoringSettings> {
		return AppSettingsService.getMonitoring();
	}

	static async updateSettings(
		settings: MonitoringSettings,
	): Promise<MonitoringSettings> {
		return AppSettingsService.updateMonitoring(settings);
	}
}
