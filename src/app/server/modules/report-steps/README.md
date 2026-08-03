# Report Steps Module

Local notes for the report orchestration and step-status model. Based on the
live PostgreSQL schema checked through MCP on 2026-07-27.

## Model

`reports` is the root entity. The module has three separate layers:

- Catalog: `report_generation_steps` plus reusable step presets.
- Report config: `report_companies` and `report_steps`.
- Runtime state: `report_step_statuses` and `report_orhestrator`.

```text
reports.id
  -> report_companies(report_id, company_id) -> companies.id
  -> report_steps(report_id, step_id, step_order) -> report_generation_steps.id
  -> report_step_statuses(report_id, company_id, step_id, status)
  -> report_orhestrator(report_id, status, metadata)
```

## Tables

| Table | Role |
| --- | --- |
| `report_generation_steps` | Global catalog of executable steps. Not report-specific. |
| `report_step_templates` | Preset header: named reusable step set. |
| `report_step_template_steps` | Ordered steps inside a preset. |
| `report_companies` | Companies included in one report. |
| `report_steps` | Steps enabled for one report, with `step_order`. |
| `report_step_statuses` | Runtime status for one report/company/step cell. |
| `report_orhestrator` | One report-level orchestration status row. |

## Read Model

The dashboard matrix should be built from config first:

1. Load companies from `report_companies`.
2. Load enabled steps from `report_steps` joined to `report_generation_steps`.
3. Load existing rows from `report_step_statuses`.
4. Render every company x enabled step cell; missing status rows mean `PENDING`.

Do not derive enabled steps from `report_step_statuses`. Status rows are runtime
state, not configuration.

## Status Updates

Single-cell and bulk edits upsert `report_step_statuses`.

Before writing, validate:

- every `company_id` belongs to the report through `report_companies`;
- every `step_id` is enabled for the report through `report_steps`;
- bulk updates are applied in one transaction.

Bulk payloads may be explicit cells:

```json
{ "cells": [{ "company_id": 1, "step_id": 10 }], "status": "DONE" }
```

or company x step expansion:

```json
{ "company_ids": [1, 2], "step_ids": [10, 20], "status": "DONE" }
```

## Orchestrator State

`report_orhestrator` stores the coarse report-level process state. It is
separate from `report_step_statuses`, which stores detailed company x step
state. Keep the misspelled table name unless doing a full migration.

## Presets

Presets are saved step-set configurations:

- `report_step_templates`: preset name/code/metadata.
- `report_step_template_steps`: preset steps and order.

Creating a preset snapshots current `report_steps`. Applying a preset is
replace-only:

1. Delete current `report_steps`.
2. Insert preset steps with normalized order.
3. Removed step statuses are deleted by cascade.

Treat preset apply as a destructive config replacement.

## Pitfalls

- `report_companies.id` is not `companies.id`; use `report_companies.company_id`.
- `report_steps` is the source of truth for enabled report steps.
- `(report_id, step_order)` is not unique, so normalize order in snapshots.
- Preset ids are `bigint`; keep them as strings at API boundaries.
