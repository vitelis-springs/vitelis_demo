-- Migration: allow notification_deliveries.status = 'processing'
-- Apply outside this repo's runtime DB workflow. Do not run automatically from app code.
--
-- Needed for the atomic claim (dispatchPendingDeliveries): a delivery is
-- flipped to 'processing' for the duration of one dispatch attempt so a
-- second concurrent cron run can't pick up the same row (see
-- NotificationDeliveriesRepository.claimPending, which uses
-- FOR UPDATE SKIP LOCKED on top of this).
--
-- No new column is introduced for retry backoff: eligibility for another
-- attempt is computed from the existing last_attempt_at + attempt_count
-- columns at query time (see claimPending's CASE expression).

ALTER TABLE public.notification_deliveries
  DROP CONSTRAINT notification_deliveries_status_check;

ALTER TABLE public.notification_deliveries
  ADD CONSTRAINT notification_deliveries_status_check
    CHECK (status IN ('pending', 'processing', 'dispatched', 'failed'));
