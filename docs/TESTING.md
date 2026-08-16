# Unit, integration, and E2E tests

Last updated: 2026-08 (Phase 2 logistics). Counts below were verified by running `pnpm test` directly against this codebase — re-verify rather than trusting them blindly once more test files are added.

## CI vs local

| Command | Runs in GitHub CI | What it runs |
|---------|-------------------|--------------|
| `pnpm test` / `pnpm test:unit` | Yes | Vitest unit tests only (`*.integration.test.ts` excluded by each package's vitest config) |
| `pnpm test:integration` | No | MongoDB in-memory integration tests (`@crm/auth`, `@crm/employee-core`) |
| `pnpm test:e2e` | **No** | Playwright in `apps/crm` (browser + Next server) |
| `pnpm test:all` | No | Unit + E2E |

**Pass rate (unit):** re-verify with `pnpm test`. Phase 2 added `@crm/logistics` (availability/vehicle/reference tests) and logistics Zod tests in `@crm/lib`.

**Code coverage:** Not measured (no `@vitest/coverage-v8` in CI).

---

## Local commands

### Unit / integration

```bash
pnpm test              # same as test:unit (Turbo, all packages)
pnpm test:unit
pnpm --filter @crm/app test    # single package
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

`apps/crm/e2e/global-setup.ts` provisions whatever fixture users the current specs need before the run.

---

## Unit test inventory (by package)

| Package | Files | Tests | Covers |
|---------|-------|-------|--------|
| `@crm/app` | 5 | 20 | Login schema, help-article loading/permission filtering, active-nav highlighting, PWA install-prompt detection |
| `@crm/ui` | 2 | 8 | DataTable query parsing (pagination/sort/filters), column-preference persistence |
| `@crm/lib` | 6 | 24 | `cn()`, secret encrypt/decrypt, product display, BOM role, inventory + logistics validation |
| `@crm/inventory` | 6 | 31 | SKU generation, Excel columns, import parse/preview, warehouse stock columns |
| `@crm/logistics` | 3 | 7 | BOM availability math, vehicle cargo fit, movement references |
| `@crm/admin` | 1 | 3 | Invitation creation/validation |
| `@crm/media` | 1 | 3 | Upload constraint validation |
| `@crm/mail` | 1 | 2 | Mail template variable substitution |
| `@crm/rbac` | 1 | 2 | Permission-module registry (register/get/idempotency) |

`@crm/auth` and `@crm/employee-core` currently have only `*.integration.test.ts` files (run via `pnpm test:integration`, not part of the unit count above).

### Notable unit suites

**`src/lib/help/load-help.test.ts` (`@crm/app`)** — loads real files from `docs/user-guide/`, so it will break the moment that directory's content drifts from what the test expects (slugs, permission gates). If you edit `docs/user-guide/*.md`, re-run this file. This is intentional: it's the guardrail that would have caught the exact problem this doc rewrite fixed (stale help content shipping alongside dead routes).

**`src/lib/pwa/detect.test.ts` (`@crm/app`)** — install-prompt platform detection, added with the PWA feature.

---

## `@crm/auth` (integration, `test:integration`)

`src/permissions.integration.test.ts` — `getEffectivePermissionKeys` role+direct merge, inactive-user handling, `userHasPermission`/`userHasAnyPermission`. Uses `mongodb-memory-server`.

## `@crm/employee-core` (integration, `test:integration`)

`src/schedule.integration.test.ts` — schedule helper logic. Note: this package is not wired into any route yet (see ARCHITECTURE.md §2); its tests validate the library in isolation.

---

## Playwright E2E (`apps/crm/e2e`)

| Spec | Flow |
|------|------|
| `auth.spec.ts` | Admin login → dashboard |

This is the only E2E spec in the rebuilt app. Inventory list/import coverage is a follow-up.

---

## Gaps (follow-up)

- Vitest coverage thresholds (`@vitest/coverage-v8`)
- E2E coverage beyond login (admin CRUD flows, invite/reset-password flows, help/tour rendering)
- Integration test for the RBAC baseline sync (`ensurePermissionsSynced`) against a real Mongo instance, to help pin down the admin-role known issue in [AGENT_HANDOFF.md](./AGENT_HANDOFF.md)
