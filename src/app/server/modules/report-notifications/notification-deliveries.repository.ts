/** biome-ignore-all lint/complexity/noStaticOnlyClass: Repository methods are grouped statically to match existing module conventions. */
import prisma from "../../../../lib/prisma";
import { NOTIFICATION_CHANNEL } from "./report-notifications.constants";

export interface PendingDeliveryRow {
	id: bigint;
	report_id: number;
	recipient_email: string;
	event_type: string;
	payload: unknown;
	attempt_count: number;
}

export interface NewDeliveryRow {
	reportId: number;
	recipientEmail: string;
	eventType: string;
	dedupeKey: string;
	payload: unknown;
}

/** A delivery that has failed this many times is marked permanently 'failed' instead of retried. */
export const MAX_DELIVERY_ATTEMPTS = 5;

/**
 * Raw-SQL access to notification_deliveries. Kept off the generated Prisma
 * model API on purpose — see REPORT_NOTIFICATIONS_PLAN.md section 4.
 */
export class NotificationDeliveriesRepository {
	/**
	 * Inserts one row per delivery, skipping any whose dedupe_key already
	 * exists. Returns how many were actually inserted.
	 */
	static async insertDue(rows: NewDeliveryRow[]): Promise<number> {
		let inserted = 0;
		for (const row of rows) {
			const payloadJson = JSON.stringify(row.payload);
			const result = await prisma.$executeRaw`
				INSERT INTO notification_deliveries
					(report_id, recipient_email, event_type, channel, status, dedupe_key, payload)
				VALUES (
					${row.reportId},
					${row.recipientEmail},
					${row.eventType},
					${NOTIFICATION_CHANNEL},
					'pending',
					${row.dedupeKey},
					${payloadJson}::jsonb
				)
				ON CONFLICT (dedupe_key) DO NOTHING
			`;
			inserted += result;
		}
		return inserted;
	}

	/**
	 * Atomically claims up to `limit` due deliveries and flips them to
	 * 'processing' in one statement (FOR UPDATE SKIP LOCKED), so two
	 * concurrent cron runs can never dispatch the same row twice.
	 *
	 * Retry backoff is computed on the fly from the existing last_attempt_at
	 * column rather than a stored "next attempt" timestamp: a row is only
	 * eligible again once enough time has passed since its last attempt,
	 * where "enough" grows with how many attempts it's already had.
	 */
	static async claimPending(limit: number): Promise<PendingDeliveryRow[]> {
		return prisma.$queryRaw<PendingDeliveryRow[]>`
			UPDATE notification_deliveries
			SET status = 'processing',
			    attempt_count = attempt_count + 1,
			    last_attempt_at = now(),
			    updated_at = now()
			WHERE id IN (
				SELECT id
				FROM notification_deliveries
				WHERE status = 'pending'
				  AND (
				    last_attempt_at IS NULL
				    OR last_attempt_at <= now() - (
				      CASE attempt_count
				        WHEN 0 THEN INTERVAL '0 seconds'
				        WHEN 1 THEN INTERVAL '1 minute'
				        WHEN 2 THEN INTERVAL '5 minutes'
				        WHEN 3 THEN INTERVAL '15 minutes'
				        ELSE INTERVAL '1 hour'
				      END
				    )
				  )
				ORDER BY created_at ASC, id ASC
				LIMIT ${limit}
				FOR UPDATE SKIP LOCKED
			)
			RETURNING id, report_id, recipient_email, event_type, payload, attempt_count
		`;
	}

	static async markDispatched(id: bigint): Promise<void> {
		await prisma.$executeRaw`
			UPDATE notification_deliveries
			SET status = 'dispatched',
			    dispatched_at = now(),
			    updated_at = now()
			WHERE id = ${id}
		`;
	}

	/**
	 * Records a failed attempt. `attemptCount` is the row's attempt_count
	 * *after* claimPending's increment, i.e. the number of attempts made
	 * including this one. Below MAX_DELIVERY_ATTEMPTS the delivery goes back
	 * to 'pending' for another try (subject to claimPending's backoff
	 * window); once exhausted it's marked permanently 'failed'.
	 */
	static async markFailed(
		id: bigint,
		error: string,
		attemptCount: number,
	): Promise<void> {
		const status = attemptCount >= MAX_DELIVERY_ATTEMPTS ? "failed" : "pending";
		await prisma.$executeRaw`
			UPDATE notification_deliveries
			SET status = ${status},
			    last_error = ${error},
			    updated_at = now()
			WHERE id = ${id}
		`;
	}

	/**
	 * Wipes all deliveries for a report, regardless of status. Used when an
	 * orchestrator restart (status -> PROCESSING) should let the report's
	 * lifecycle notifications (started/completed/failed) fire again instead
	 * of staying deduped against the previous run.
	 */
	static async resetForReport(reportId: number): Promise<void> {
		await prisma.$executeRaw`
			DELETE FROM notification_deliveries
			WHERE report_id = ${reportId}
		`;
	}
}
