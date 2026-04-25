# Backend Module Refactor Guide

## Summary

This guide defines a reusable backend refactor strategy using the `deep-dive`
module as the reference example.

The goal is not to split files mechanically. The goal is to separate backend
responsibilities by clear boundaries:

- `types`
- `tools`
- `repository`
- `service`
- `controller`

For large modules like `deep-dive`, also split by bounded context instead of
keeping one large module-level controller, service, and repository.

## Shared Strategy

Do not create one global `shared` folder that becomes a dump for everything.
Use two levels of shared code.

Global backend shared code:

```txt
src/app/server/shared/
  http/
    parse.ts
    responses.ts
  types/
    pagination.ts
    api-result.ts
  tools/
    json.ts
    dates.ts
    pagination.ts
```

Use this only for backend-wide primitives that do not know about a specific
business module.

Module-local shared code:

```txt
src/app/server/modules/deep-dive/shared/
  deep-dive.types.ts
  deep-dive.tools.ts
```

Use this only for things shared inside `deep-dive`. If a helper is only used by
one bounded context, keep it inside that context instead.

## Layer Rules

### Types

`types` files define contracts only:

- DTOs
- request payloads
- response payloads
- enum-like union types
- service input/output types
- repository payload types

Rules:

- No Prisma queries.
- No `NextRequest`.
- No `NextResponse`.
- No business logic.
- Avoid leaking Prisma-generated types into frontend-facing DTOs.

### Tools

`tools` files contain pure helpers:

- parsing
- normalization
- sorting
- mapping helpers
- pagination helpers
- score/value helpers

Rules:

- No Prisma access.
- No auth.
- No `NextRequest`.
- No `NextResponse`.
- Prefer deterministic functions that are easy to unit test.

### Repository

`repository` files own database access:

- Prisma queries
- raw SQL
- transaction boundaries
- database-shaped reads and writes

Rules:

- No HTTP response handling.
- No request parsing.
- No auth.
- Keep business decisions out unless they are required for a safe transaction.

### Service

`service` files own business logic:

- orchestration
- validation of domain rules
- composition of multiple repository calls
- mapping database rows into domain/API responses

Rules:

- No `NextRequest`.
- No `NextResponse`.
- Do not read query params directly.
- Do not perform auth checks.

### Controller

`controller` files own the HTTP boundary:

- auth
- route param parsing
- query param parsing
- body parsing
- calling services
- returning `NextResponse`

Rules:

- No Prisma queries.
- No raw SQL.
- No heavy business logic.
- No complex response mapping beyond HTTP-level shape and status codes.

## Recommended Deep-Dive Structure

Treat `deep-dive` as a group of bounded contexts, not one giant module.

Recommended target structure:

```txt
src/app/server/modules/deep-dive/
  index.ts

  shared/
    deep-dive.types.ts
    deep-dive.tools.ts

  reports/
    reports.types.ts
    reports.tools.ts
    reports.repository.ts
    reports.service.ts
    reports.controller.ts

  settings/
    settings.types.ts
    settings.repository.ts
    settings.service.ts
    settings.controller.ts

  model/
    model.types.ts
    model.tools.ts
    model.repository.ts
    model.service.ts
    model.controller.ts

  companies/
    companies.types.ts
    companies.tools.ts
    companies.repository.ts
    companies.service.ts
    companies.controller.ts

  data-points/
    data-points.types.ts
    data-points.tools.ts
    data-points.repository.ts
    data-points.service.ts
    data-points.controller.ts

  sources/
    sources.types.ts
    sources.tools.ts
    sources.repository.ts
    sources.service.ts
    sources.controller.ts

  queries/
    queries.types.ts
    queries.repository.ts
    queries.service.ts
    queries.controller.ts

  validation/
    validation.types.ts
    validation.tools.ts
    validation.repository.ts
    validation.service.ts
    validation.controller.ts

  sales-miner/
    sales-miner.types.ts
    sales-miner.tools.ts
    sales-miner.repository.ts
    sales-miner.service.ts
    sales-miner.controller.ts
```

## Suggested Migration Order

Use an incremental migration. Keep old public imports stable while moving logic
behind them.

Recommended order:

1. `validation`
2. `model`
3. `companies`
4. `data-points`
5. `sources`
6. `queries`
7. `settings`
8. `reports`
9. `sales-miner`

Start with `validation` because it is relatively isolated and already maps well
to separate endpoints.

For each bounded context:

1. Extract context-specific types first.
2. Extract pure tools next.
3. Move Prisma access into the context repository.
4. Move business composition into the context service.
5. Move HTTP parsing/auth/response handling into the context controller.
6. Keep the old `DeepDiveController`, `DeepDiveService`, and
   `DeepDiveRepository` as temporary facades where needed.
7. Remove facade methods only after all route imports and tests are migrated.

## API And Type Stability

Refactor must not change public behavior unless a separate product/API change is
explicitly planned.

Rules:

- Existing API route paths stay the same.
- Existing response body shapes stay the same.
- Existing status codes stay the same.
- Existing auth behavior stays the same.
- Frontend-facing DTOs must remain stable.
- Repository return types may be database-shaped.
- Service return types should be domain/API-shaped.
- Controller responses should be HTTP-shaped.

## Testing Strategy

Before moving a bounded context, identify or add regression coverage for current
behavior.

For each migrated context, verify:

- same route behavior;
- same auth behavior;
- same status codes;
- same response body shape;
- same query/body validation behavior;
- same database query intent where practical.

Recommended checks:

```sh
yarn eslint --max-warnings=0 <changed-files>
yarn type
yarn test:deep-dive:e2e
```

If global `yarn type` is already failing on unrelated code, record the unrelated
failures and still run targeted lint/tests for the changed context.

## Practical Rules

- Prefer moving one bounded context at a time.
- Do not introduce new abstractions before extracting obvious boundaries.
- Do not move code to global `shared` unless at least two modules need it.
- Do not create circular dependencies between bounded contexts.
- Keep diffs small and reversible.
- Keep facade compatibility during migration.
- Delete old facade methods only when imports and tests prove they are unused.

## Deep-Dive First Candidate: Validation

`validation` is the best first extraction candidate.

Target files:

```txt
src/app/server/modules/deep-dive/validation/
  validation.types.ts
  validation.tools.ts
  validation.repository.ts
  validation.service.ts
  validation.controller.ts
```

Expected ownership:

- `validation.types.ts`: validation statuses, rule DTOs, company validation
  response types.
- `validation.tools.ts`: status parsing, score extraction, row sorting,
  row-to-DTO mapping.
- `validation.repository.ts`: validation summaries, rule config queries,
  validation-by-company queries.
- `validation.service.ts`: validation business orchestration and response
  composition.
- `validation.controller.ts`: request parsing, admin auth, service calls, HTTP
  responses.

Keep existing API routes stable while delegating to the new controller/service.

## Assumptions

- Use lowercase `shared`, not `Shared`.
- Keep backend shared code under `src/app/server/shared`.
- Keep module-specific shared code under `src/app/server/modules/<module>/shared`.
- Use incremental migration with temporary facades.
- Do not change public API behavior as part of structural refactors.
