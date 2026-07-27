/** biome-ignore-all lint/complexity/noStaticOnlyClass: Repository methods are grouped statically to match existing module conventions. */
import prisma from "../../../../lib/prisma";
import type { MonitorStepStatus } from "./monitoring.types";

export interface RunStepRow {
	report_id: number;
	report_name: string | null;
	report_type: string | null;
	company_id: number;
	company_name: string | null;
	step_id: number;
	step_name: string | null;
	step_order: number | null;
	workflow_id: string | null;
	exec_id: string;
	status: MonitorStepStatus;
	start_time: Date;
	end_time: Date | null;
}

export interface SummaryRow {
	report_type: string | null;
	runs: number;
	running: number;
	stuck: number;
	errors: number;
}

/**
 * Both queries share the same two CTEs:
 *
 *   eligible    — step rows the dashboard can see at all: an exec_id in metadata
 *                 and a start_time. Rows without them predate the timing rollout
 *                 and are ignored, per the agreed rule.
 *   active_runs — (report, company) pairs that are either still running or were
 *                 last active inside the lookback window.
 *
 * The list is capped but the summary is not, so the headline numbers stay correct
 * when the list is trimmed.
 *
 * Optional filters are passed as nullable/boolean parameters rather than composed
 * Prisma.sql fragments: fragment composition does not survive the Next.js bundle
 * (fragments arrive as plain bind parameters and Postgres rejects the result).
 */
export class MonitoringRepository {
	/** Every step of the most recently active runs, newest run first. */
	static async findRunSteps(params: {
		since: Date;
		runLimit: number;
	}): Promise<RunStepRow[]> {
		return prisma.$queryRaw<RunStepRow[]>`
			WITH eligible AS (
				SELECT
					rss.report_id,
					rss.company_id,
					rss.step_id,
					rss.status::text AS status,
					rss.start_time,
					rss.end_time,
					NULLIF(trim(rss.metadata->>'exec_id'), '') AS exec_id
				FROM report_step_statuses rss
				WHERE rss.start_time IS NOT NULL
				  AND NULLIF(trim(rss.metadata->>'exec_id'), '') IS NOT NULL
			),
			active_runs AS (
				SELECT
					e.report_id,
					e.company_id,
					MAX(COALESCE(e.end_time, e.start_time)) AS last_activity
				FROM eligible e
				GROUP BY e.report_id, e.company_id
				-- running work is always relevant; finished runs age out of the window
				HAVING bool_or(e.status = 'PROCESSING')
				    OR MAX(COALESCE(e.end_time, e.start_time)) >= ${params.since}
				ORDER BY last_activity DESC
				LIMIT ${params.runLimit}
			),
			-- Keep every company of a report together and order reports by their
			-- most recent activity, so the grouped output never interleaves reports.
			report_activity AS (
				SELECT report_id, MAX(last_activity) AS report_last_activity
				FROM active_runs
				GROUP BY report_id
			)
			SELECT
				e.report_id::int            AS report_id,
				r.name                      AS report_name,
				r.report_type               AS report_type,
				e.company_id::int           AS company_id,
				c.name                      AS company_name,
				e.step_id::int              AS step_id,
				rgs.name                    AS step_name,
				rs.step_order::int          AS step_order,
				NULLIF(trim(rgs.workflow_id), '') AS workflow_id,
				e.exec_id                   AS exec_id,
				e.status                    AS status,
				e.start_time                AS start_time,
				e.end_time                  AS end_time
			FROM eligible e
			JOIN active_runs ar
			  ON ar.report_id = e.report_id
			 AND ar.company_id = e.company_id
			JOIN report_activity rp
			  ON rp.report_id = e.report_id
			JOIN reports r
			  ON r.id = e.report_id
			JOIN companies c
			  ON c.id = e.company_id
			JOIN report_generation_steps rgs
			  ON rgs.id = e.step_id
			LEFT JOIN report_steps rs
			  ON rs.report_id = e.report_id
			 AND rs.step_id = e.step_id
			ORDER BY rp.report_last_activity DESC, e.report_id,
			         ar.last_activity DESC, e.company_id, e.start_time, e.step_id
		`;
	}

	/** Uncapped counts over the same run set, grouped by product. */
	static async summarise(params: {
		since: Date;
		stuckBefore: Date;
	}): Promise<SummaryRow[]> {
		return prisma.$queryRaw<SummaryRow[]>`
			WITH eligible AS (
				SELECT
					rss.report_id,
					rss.company_id,
					rss.status::text AS status,
					rss.start_time,
					rss.end_time
				FROM report_step_statuses rss
				WHERE rss.start_time IS NOT NULL
				  AND NULLIF(trim(rss.metadata->>'exec_id'), '') IS NOT NULL
			),
			active_runs AS (
				SELECT
					e.report_id,
					e.company_id
				FROM eligible e
				GROUP BY e.report_id, e.company_id
				HAVING bool_or(e.status = 'PROCESSING')
				    OR MAX(COALESCE(e.end_time, e.start_time)) >= ${params.since}
			)
			SELECT
				r.report_type AS report_type,
				COUNT(DISTINCT (e.report_id, e.company_id))::int AS runs,
				COUNT(*) FILTER (WHERE e.status = 'PROCESSING')::int AS running,
				COUNT(*) FILTER (
					WHERE e.status = 'PROCESSING'
					  AND e.start_time < ${params.stuckBefore}
				)::int AS stuck,
				COUNT(*) FILTER (WHERE e.status = 'ERROR')::int AS errors
			FROM eligible e
			JOIN active_runs ar
			  ON ar.report_id = e.report_id
			 AND ar.company_id = e.company_id
			JOIN reports r
			  ON r.id = e.report_id
			GROUP BY r.report_type
			ORDER BY r.report_type
		`;
	}
}
