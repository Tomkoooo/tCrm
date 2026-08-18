# Unit, integration, and E2E tests

Last updated: 2026-08 (Phase 3 HR). Counts below drift — re-verify with `pnpm test`.

## CI vs local

| Command | Runs in GitHub CI | What it runs |
|---------|-------------------|--------------|
| `pnpm test` / `pnpm test:unit` | Yes | Vitest unit tests only (`*.integration.test.ts` excluded by each package's vitest config) |
| `pnpm test:integration` | No | MongoDB in-memory integration tests (`@crm/auth`) |
| `pnpm test:e2e` | **No** | Playwright in `apps/crm` (browser + Next server) |
| `pnpm test:all` | No | Unit + E2E |

**Pass rate (unit):** re-verify with `pnpm test`. Phase 3 adds `@crm/hr` (hours + availability unit tests).

**Code coverage:** Not measured (no `@vitest/coverage-v8` in CI).

---

## Local commands

### Unit / integration

```bash
pnpm test              # same as test:unit (Turbo, all packages)
pnpm test:unit
pnpm --filter @crm/hr test
pnpm --filter @crm/app test
```

### E2E (Playwright)

**Prerequisites**

1. MongoDB running (`MONGODB_URI` in `apps/crm/.env.local`).
2. A first admin — either run through `/setup` once, or create one directly.
3. Browsers once: `pnpm test:e2e:install`

```bash
pnpm test:e2e              # list reporter + HTML report path
pnpm test:e2e:ui           # interactive UI mode
pnpm test:e2e:report       # open last HTML report
pnpm test:all              # unit then E2E
```

---

## Unit test inventory (by package)

| Package | Covers |
|---------|--------|
| `@crm/app` | help load/filter, login schema, PWA, active-nav |
| `@crm/ui` | DataTable query, column prefs |
| `@crm/lib` | utils, inventory/logistics/hr validation |
| `@crm/inventory` | SKU (including sequential quick-add), Excel import, stock |
| `@crm/logistics` | availability, vehicles, references |
| `@crm/hr` | `overlapHours`, `rangesOverlap`, ObjectId helper |
| `@crm/admin` / `@crm/media` / `@crm/mail` / `@crm/rbac` | as before |

`@crm/auth` has `*.integration.test.ts` only (`pnpm test:integration`).

### Notable unit suites

**`src/lib/help/load-help.test.ts` (`@crm/app`)** — loads real files from `docs/user-guide/`. Edit help → re-run this file.

---

## Playwright E2E (`apps/crm/e2e`)

| Spec | Flow |
|------|------|
| `auth.spec.ts` | Admin login → dashboard |

---

## Gaps (follow-up)

- Vitest coverage thresholds
- E2E beyond login (HR people/leave, logistics jobs)
- Integration test for RBAC baseline sync
