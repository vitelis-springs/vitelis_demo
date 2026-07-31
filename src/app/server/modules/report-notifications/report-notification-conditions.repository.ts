/** biome-ignore-all lint/complexity/noStaticOnlyClass: Repository methods are grouped statically to match existing module conventions. */
import prisma from "../../../../lib/prisma";

export interface DueReportRow {
	report_id: number;
	report_name: string | null;
	report_type: string | null;
	status: string;
}

/**
 * Reads report_orhestrator / report_step_statuses / report_companies /
 * report_steps to decide which reports currently satisfy a notification
 * event condition. Backend is the source of truth for report state — n8n
 * never determines started/completed/failed.
 */
export class ReportNotificationConditionsRepository {
	static async findStarted(): Promise<DueReportRow[]> {
		return prisma.$queryRaw<DueReportRow[]>`
			SELECT ro.report_id AS report_id, r.name AS report_name,
			       r.report_type AS report_type, ro.status::text AS status
			FROM report_orhestrator ro
			JOIN reports r ON r.id = ro.report_id
			WHERE ro.status = 'PROCESSING'
		`;
	}

	static async findFailed(): Promise<DueReportRow[]> {
		return prisma.$queryRaw<DueReportRow[]>`
			SELECT ro.report_id AS report_id, r.name AS report_name,
			       r.report_type AS report_type, ro.status::text AS status
			FROM report_orhestrator ro
			JOIN reports r ON r.id = ro.report_id
			WHERE ro.status = 'ERROR'
		`;
	}

	/**
	 * Completed requires the orchestrator to say DONE *and* every enabled
	 * company-step cell (report_companies x report_steps) to have a
	 * report_step_statuses row with status DONE. A missing runtime row is
	 * treated as pending, not as "no event" — it blocks completion.
	 */
	static async findCompleted(): Promise<DueReportRow[]> {
		return prisma.$queryRaw<DueReportRow[]>`
			WITH orchestrator_done AS (
				SELECT ro.report_id AS report_id, r.name AS report_name,
				       r.report_type AS report_type, ro.status::text AS status
				FROM report_orhestrator ro
				JOIN reports r ON r.id = ro.report_id
				WHERE ro.status = 'DONE'
			),
			expected_cells AS (
				SELECT rc.report_id, rc.company_id, rs.step_id
				FROM report_companies rc
				JOIN report_steps rs ON rs.report_id = rc.report_id
				WHERE rc.report_id IN (SELECT report_id FROM orchestrator_done)
			),
			incomplete_reports AS (
				SELECT DISTINCT ec.report_id
				FROM expected_cells ec
				LEFT JOIN report_step_statuses rss
				  ON rss.report_id = ec.report_id
				 AND rss.company_id = ec.company_id
				 AND rss.step_id = ec.step_id
				WHERE rss.status IS NULL OR rss.status <> 'DONE'
			)
			SELECT od.report_id, od.report_name, od.report_type, od.status
			FROM orchestrator_done od
			WHERE od.report_id NOT IN (SELECT report_id FROM incomplete_reports)
		`;
	}
}
