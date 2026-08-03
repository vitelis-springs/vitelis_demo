-- Migration: report notification subscriptions and delivery outbox
-- Apply outside this repo's runtime DB workflow. Do not run automatically from app code.

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.report_notification_subscriptions (
  id              bigserial                PRIMARY KEY,
  report_id       integer                  NOT NULL,
  recipient_email text                     NOT NULL,
  event_type      text                     NOT NULL,
  channel         text                     NOT NULL DEFAULT 'email',
  enabled         boolean                  NOT NULL DEFAULT true,
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  updated_at      timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT report_notification_subscriptions_report_fk
    FOREIGN KEY (report_id)
    REFERENCES public.reports(id)
    ON DELETE CASCADE,

  CONSTRAINT report_notification_subscriptions_recipient_email_check
    CHECK (recipient_email = lower(btrim(recipient_email)) AND recipient_email <> ''),

  CONSTRAINT report_notification_subscriptions_event_type_check
    CHECK (event_type IN ('REPORT_STARTED', 'REPORT_COMPLETED', 'REPORT_FAILED')),

  CONSTRAINT report_notification_subscriptions_channel_check
    CHECK (channel IN ('email')),

  CONSTRAINT report_notification_subscriptions_unique
    UNIQUE (report_id, recipient_email, event_type, channel)
);

CREATE INDEX IF NOT EXISTS idx_report_notification_subscriptions_enabled_event
  ON public.report_notification_subscriptions (event_type, channel, report_id)
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_report_notification_subscriptions_recipient
  ON public.report_notification_subscriptions (recipient_email, report_id)
  WHERE enabled = true;

-- ----

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id               bigserial                PRIMARY KEY,
  report_id        integer                  NOT NULL,
  recipient_email  text                     NOT NULL,
  event_type       text                     NOT NULL,
  channel          text                     NOT NULL DEFAULT 'email',
  status           text                     NOT NULL DEFAULT 'pending',
  dedupe_key       text                     NOT NULL,
  payload          jsonb                    NOT NULL,
  attempt_count    integer                  NOT NULL DEFAULT 0,
  last_attempt_at  timestamp with time zone,
  last_error       text,
  dispatched_at    timestamp with time zone,
  created_at       timestamp with time zone NOT NULL DEFAULT now(),
  updated_at       timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT notification_deliveries_report_fk
    FOREIGN KEY (report_id)
    REFERENCES public.reports(id)
    ON DELETE CASCADE,

  CONSTRAINT notification_deliveries_recipient_email_check
    CHECK (recipient_email = lower(btrim(recipient_email)) AND recipient_email <> ''),

  CONSTRAINT notification_deliveries_event_type_check
    CHECK (event_type IN ('REPORT_STARTED', 'REPORT_COMPLETED', 'REPORT_FAILED')),

  CONSTRAINT notification_deliveries_channel_check
    CHECK (channel IN ('email')),

  CONSTRAINT notification_deliveries_status_check
    CHECK (status IN ('pending', 'dispatched', 'failed')),

  CONSTRAINT notification_deliveries_attempt_count_check
    CHECK (attempt_count >= 0),

  CONSTRAINT notification_deliveries_dedupe_key_unique
    UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_pending
  ON public.notification_deliveries (created_at, id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_report_event
  ON public.notification_deliveries (report_id, event_type, channel);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_recipient
  ON public.notification_deliveries (recipient_email, report_id);
