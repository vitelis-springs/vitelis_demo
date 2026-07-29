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

	static async findPending(limit: number): Promise<PendingDeliveryRow[]> {
		return prisma.$queryRaw<PendingDeliveryRow[]>`
			SELECT id, report_id, recipient_email, event_type, payload, attempt_count
			FROM notification_deliveries
			WHERE status = 'pending'
			ORDER BY created_at ASC, id ASC
			LIMIT ${limit}
		`;
	}

	static async markAttempted(id: bigint): Promise<void> {
		await prisma.$executeRaw`
			UPDATE notification_deliveries
			SET attempt_count = attempt_count + 1,
			    last_attempt_at = now(),
			    updated_at = now()
			WHERE id = ${id}
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

	static async markFailed(id: bigint, error: string): Promise<void> {
		await prisma.$executeRaw`
			UPDATE notification_deliveries
			SET status = 'failed',
			    last_error = ${error},
			    updated_at = now()
			WHERE id = ${id}
		`;
	}
}
