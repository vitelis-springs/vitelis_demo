# Report Email Notifications Plan

> **Post-v1 amendments.** This doc describes the original v1 design. Since then the
> implementation has grown beyond a few of the v1 decisions below — see the inline
> notes marked **[post-v1]** in sections 6, 10, 11 and 14. Backend notification
> support (subscriptions, delivery, dispatch) is generic across report types; only
> the reports-table **UI** currently wires the subscribe/recipients controls in for
> `sales_miner` reports.

## Загальний опис

Потрібно додати email notifications для report lifecycle events через n8n.
Основна сутність системи для v1 - конкретний `reports.id`: користувач підписується
на події конкретного report, а не на глобальні account preferences.

У v1 підтримуються три події:

- `REPORT_STARTED`
- `REPORT_COMPLETED`
- `REPORT_FAILED`

Поточний UI entry point - таблиця репортів. У рядку report буде одна toggle-кнопка:
`Subscribe` / `Unsubscribe`. Для v1 ця кнопка працює з email поточного JWT user і
підписує або відписує його одразу від усіх підтримуваних подій для конкретного
`report_id`. База і API мають дозволяти багато отримувачів для одного report, але
assign-to-others UI/API не входить у v1.

Backend є source of truth для стану report. n8n не визначає, чи report стартував,
завершився або впав. Backend періодично дивиться на `report_orhestrator` і
`report_step_statuses`, створює delivery records, а n8n тільки рендерить email
templates і відправляє email.

Delivery модель best-effort. Scheduled job запускається всередині app process на
startup і виконується кожні 5 хвилин. Сам tick
іде не окремим worker/microservice/CLI, а через internal HTTP endpoint
**[post-v1: v1 позначав internal HTTP endpoint як non-goal — знадобився через
Edge-runtime bundling конфлікт з `src/middleware.ts`, див. секцію 10]**. Якщо
`NOTIFICATIONS_SCHEDULER_ENABLED=false`, scheduler не стартує. Default behavior -
enabled. Якщо `N8N_NOTIFICATION_WEBHOOK_URL` або `INTERNAL_CRON_SECRET` не
задані, scheduler не стартує і пише warning у лог.

## Деталі імплементації

### 1. Event semantics

Notification scheduler enqueue-ить deliveries за простим правилом:

- є active subscription;
- поточний report state відповідає event condition;
- delivery з таким `dedupe_key` ще не існує.

Події не backfill-яться спеціальним окремим процесом. У v1 приймаємо, що scheduled
job може мати до 5 хвилин latency. Реальні reports тривають довше за цей інтервал;
короткі test reports можуть пропустити `REPORT_STARTED`, і це прийнятний v1 edge
case.

Event conditions:

- `REPORT_STARTED`: `report_orhestrator.status = PROCESSING`
- `REPORT_COMPLETED`: `report_orhestrator.status = DONE` і всі enabled step cells
  для report у статусі `DONE`
- `REPORT_FAILED`: `report_orhestrator.status = ERROR`

Для completed condition важливо не дивитися тільки на наявні rows у
`report_step_statuses`. Відсутній runtime row означає pending state. Тому completed
перевірка має рахувати матрицю `report_companies x report_steps` і блокувати
completion, якщо хоча б один enabled company-step cell missing або має статус не
`DONE`.

### 2. Supported events and channels

Supported events v1:

```ts
const REPORT_NOTIFICATION_EVENTS = [
  "REPORT_STARTED",
  "REPORT_COMPLETED",
  "REPORT_FAILED",
] as const;
```

Supported channel v1:

```ts
"email"
```

`event_type` у payload і DB має бути string enum, не number.

### 3. Database SQL file

DB changes мають бути додані як SQL file, але не виконані з цього repo. База
керується в іншому місці.

Файл:

```text
prisma/migrations_manual/002_report_notifications.sql
```

Створити дві таблиці.

`report_notification_subscriptions`:

- `id bigserial primary key`
- `report_id int not null references reports(id) on delete cascade`
- `recipient_email text not null`
- `event_type text not null`
- `channel text not null default 'email'`
- `enabled boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- unique `(report_id, recipient_email, event_type, channel)`

`notification_deliveries`:

- `id bigserial primary key`
- `report_id int not null references reports(id) on delete cascade`
- `recipient_email text not null`
- `event_type text not null`
- `channel text not null default 'email'`
- `status text not null default 'pending'`
- `dedupe_key text not null unique`
- `payload jsonb not null`
- `attempt_count int not null default 0`
- `last_attempt_at timestamptz null`
- `last_error text null`
- `dispatched_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Optional SQL check constraints can restrict known statuses/events/channels, but keep
them easy to extend.

### 4. Prisma schema contract

Update `prisma/schema.prisma` with models for both new tables so the application
schema contract is visible in the repo.

Runtime code for these tables should still use raw SQL through Prisma
`$queryRaw` / `$executeRaw`, not generated Prisma model APIs. This avoids coupling
v1 runtime to whether the external DB migration and generated Prisma client are
already in sync.

Do not execute DB migration from this repo.

### 5. Subscription API

Use `/me` endpoints for current JWT email only.

Endpoints:

```http
GET /api/sales-miner/reports/notification-subscriptions/me?report_ids=1,2,3
GET /api/sales-miner/reports/{id}/notification-subscriptions/me
POST /api/sales-miner/reports/{id}/notification-subscriptions/me
DELETE /api/sales-miner/reports/{id}/notification-subscriptions/me
```

Auth:

- require authenticated admin user;
- use JWT email as `recipient_email`;
- do not accept `recipient_email` in `/me` body/query.

Email normalization:

```ts
recipient_email = auth.user.email.trim().toLowerCase()
```

Mutation behavior:

- `POST` enables all v1 events for current email and report;
- `DELETE` disables all v1 events for current email and report;
- do not delete subscription rows; set `enabled=false`;
- re-subscribe re-enables existing rows or creates missing rows.

Report existence:

- single report endpoints return `404` if report does not exist;
- bulk endpoint returns `400` for invalid ids / empty list;
- bulk endpoint returns `404` with missing ids if any requested report id does not
  exist;
- duplicate ids can be deduped silently.

Response shape should include both summary and per-event state:

```json
{
  "supported_events": ["REPORT_STARTED", "REPORT_COMPLETED", "REPORT_FAILED"],
  "reports": {
    "123": {
      "report_id": 123,
      "recipient_email": "anna@example.com",
      "fully_subscribed": true,
      "events": {
        "REPORT_STARTED": true,
        "REPORT_COMPLETED": true,
        "REPORT_FAILED": true
      }
    }
  }
}
```

`fully_subscribed = true` only when all supported events are enabled for that
`report_id + recipient_email + channel`.

### 6. Reports table UI

Add one toggle button per report row:

- if `fully_subscribed=false`, show `Subscribe`;
- clicking `Subscribe` calls `POST .../{id}/notification-subscriptions/me`;
- if `fully_subscribed=true`, show `Unsubscribe`;
- clicking `Unsubscribe` calls `DELETE .../{id}/notification-subscriptions/me`;
- button has loading state during mutation;
- after mutation, refresh the subscription state for visible reports.

Use bulk state endpoint for visible reports to avoid N+1 requests.

The v1 button manages all supported events at once. Partial per-event management is
future UI work.

**[post-v1]** Implemented beyond v1 scope, still `sales_miner`-only in the UI:
subscribing other recipients (`Recipients` modal, backed by the non-`/me`
`/notification-subscriptions` endpoints) and per-event granularity (checkboxes per
`REPORT_STARTED`/`REPORT_COMPLETED`/`REPORT_FAILED` instead of all-or-nothing),
via an optional `event_type` on the same endpoints.

### 7. Delivery dedupe

One delivery row represents:

```text
1 event + 1 recipient + 1 channel + 1 report
```

`dedupe_key` format:

```text
report:{report_id}:event:{event_type}:channel:email:recipient:{normalized_email}
```

Examples:

```text
report:123:event:REPORT_STARTED:channel:email:recipient:anna@example.com
report:123:event:REPORT_COMPLETED:channel:email:recipient:anna@example.com
report:123:event:REPORT_FAILED:channel:email:recipient:anna@example.com
```

This guarantees at most one delivery per report/event/email/channel.

Unsubscribe does not cancel already-created pending deliveries. It only affects
future delivery creation.

### 8. n8n payload contract

Backend owns event data. n8n owns email templates and email sending.

Delivery payload:

```json
{
  "email": "anna@example.com",
  "cc": "",
  "event_type": "REPORT_COMPLETED",
  "template_data": {
    "report_id": 123,
    "report_name": "Korn Ferry Coaching",
    "report_type": "sales_miner",
    "report_url": "https://app.example.com/sales-miner/reports/123",
    "status": "DONE",
    "occurred_at": "2026-07-27T12:34:56.000Z"
  }
}
```

Notes:

- top-level field is `email`;
- top-level `cc` is an empty string in v1;
- `event_type` is a string enum;
- `template_data` contains report context for n8n templates;
- store exact payload JSON in `notification_deliveries.payload`.

### 9. Dynamic report URL

Build absolute report URLs with server-side `APP_BASE_URL`.

Route resolver:

- `sales_miner` -> `{APP_BASE_URL}/sales-miner/reports/{id}`
- `biz_miner` -> `{APP_BASE_URL}/biz-miner/{id}`
- `internal` -> `{APP_BASE_URL}/vitelis-sales/{id}`
- unknown/null -> `{APP_BASE_URL}/deep-dive/{id}`

Include both `report_type` and `report_url` in `template_data`.

### 10. Scheduler

Add notification scheduler on app startup, in `src/instrumentation.ts` **[post-v1:
must be named exactly `instrumentation.ts` — Next.js only loads that filename, not
`instrumentation.node.ts`]**.

Do not use `N8NTasksService.runCycle()` for notifications.

**[post-v1]** `src/middleware.ts` runs on the Edge runtime, which forces Next.js to
also Edge-bundle `instrumentation.ts`. Importing Prisma-backed service code there
(even behind a `NEXT_RUNTIME` guard) breaks that Edge bundle, since webpack still
resolves the import graph statically. So the actual cron logic lives in two plain
Node.js route handlers instead, and `instrumentation.ts`'s `setInterval` only ever
calls them over `fetch()` — zero app/Prisma imports in the instrumentation file
itself:

```http
POST /api/internal/orchestrator-cron
POST /api/internal/notification-cron
```

Both endpoints require an `x-internal-cron-secret` header matching
`INTERNAL_CRON_SECRET`, checked before any side effects; missing/mismatched secret
returns `401`. This closes off what would otherwise be a public, unauthenticated
way to trigger cron cycles on demand.

Scheduler behavior:

- starts only in Node runtime;
- global guard prevents duplicate scheduler registration in the same process;
- interval: 5 minutes;
- feature flag: `NOTIFICATIONS_SCHEDULER_ENABLED`;
- default enabled;
- if `NOTIFICATIONS_SCHEDULER_ENABLED=false`, do not start;
- if `N8N_NOTIFICATION_WEBHOOK_URL` or `INTERNAL_CRON_SECRET` is missing, do not
  start and log warning once;
- run has overlap guard: if previous run is still executing, skip next tick.

Run steps:

1. enqueue due deliveries for `REPORT_STARTED`, `REPORT_COMPLETED`, `REPORT_FAILED`;
2. dispatch pending deliveries to `N8N_NOTIFICATION_WEBHOOK_URL`.

### 11. Delivery dispatch

Statuses:

- `pending`: created, not dispatched yet, or a failed attempt eligible for retry;
- `processing`: claimed by a dispatch cycle, in flight **[post-v1, see below]**;
- `dispatched`: backend passed request to n8n; does not mean final email delivery;
- `failed`: backend permanently gave up (attempts exhausted).

Keep debug fields:

- `attempt_count`
- `last_attempt_at`
- `last_error`
- `dispatched_at`

Dispatch behavior:

- atomically claim up to `limit` due pending deliveries: flip them to `processing`
  and increment `attempt_count`/`last_attempt_at` in one `UPDATE ... FOR UPDATE
  SKIP LOCKED` statement, so two concurrent cron ticks can never dispatch the same
  row twice **[post-v1: v1 had a plain `SELECT` + separate `markAttempted` update,
  which raced under concurrent dispatch]**;
- POST payload to `N8N_NOTIFICATION_WEBHOOK_URL`;
- if the request is accepted/successful enough for backend dispatch semantics, set
  `status='dispatched'` and `dispatched_at=now()`;
- if the request throws or the response is not ok, retry with backoff
  **[post-v1: v1 had no retry loop — any failure was permanent]**: below
  `MAX_DELIVERY_ATTEMPTS` (5), set `status='pending'` and `last_error`; once
  exhausted, set `status='failed'` and `last_error`. Retry eligibility is computed
  on the fly from `last_attempt_at` + a backoff step keyed off `attempt_count`
  (1m / 5m / 15m / 1h) at claim time — no extra "next attempt" column.

Do not wait for final SMTP/provider delivery from n8n.

**[post-v1]** Restarting a report (orchestrator status set back to `PROCESSING`,
which is what the reports-table "Active" state maps to) deletes all
`notification_deliveries` rows for that `report_id` on the backend, so the
lifecycle events can dedupe-fire again for the new run instead of staying
suppressed by deliveries from the previous run.

### 12. Repository/service shape

Suggested modules:

```text
src/app/server/modules/report-notifications/
  report-notifications.constants.ts
  report-notifications.repository.ts
  report-notifications.service.ts
  notification-deliveries.repository.ts
  notification-deliveries.service.ts
  notification-cron.ts
  report-url.ts
```

Keep raw SQL isolated in repository files.

High-level service methods:

```ts
getMySubscriptionState(reportIds, recipientEmail)
subscribeAll(reportId, recipientEmail)
unsubscribeAll(reportId, recipientEmail)
enqueueDueReportEvents()
dispatchPendingDeliveries()
runNotificationCronOnce()
```

### 13. Tests

Add focused tests for backend logic:

- email normalization;
- `fully_subscribed` calculation;
- `POST` enables all supported events;
- `DELETE` disables all supported events;
- bulk endpoint returns `404` for missing report ids;
- dedupe key generation;
- route resolver by `report_type`;
- completed condition blocks when any enabled company-step cell is missing/not
  `DONE`;
- failed condition only needs orchestrator `ERROR`;
- scheduler no-op when webhook env missing;
- pending delivery transitions to `dispatched` or `failed`.

UI test can be minimal:

- button shows `Subscribe` when not fully subscribed;
- button shows `Unsubscribe` when fully subscribed;
- mutation invalidates/refetches subscription state.

### 14. Explicit non-goals for v1

Do not implement:

- ~~assign-to-others UI~~ **[post-v1: implemented, see section 6]**;
- non-email channels;
- ~~per-event UI management~~ **[post-v1: implemented, see section 6]**;
- ~~retry loop~~ **[post-v1: implemented, see section 11]**;
- delivery provider webhooks;
- separate worker/microservice;
- CLI cron command;
- ~~internal HTTP cron endpoint~~ **[post-v1: implemented, see section 10 —
  required by an Edge-runtime bundling constraint, not a scope decision]**;
- direct DB migration execution from this repo;
- dependency on `N8NTasksService.runCycle()`.
