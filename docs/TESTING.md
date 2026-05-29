# Unit, integration, and E2E tests

Last updated: 2026-05.

## CI vs local

| Command | Runs in GitHub CI | What it runs |
|---------|-------------------|--------------|
| `pnpm test` / `pnpm test:unit` | Yes | Vitest across `@crm/lib`, `@crm/core`, `@crm/auth`, `@crm/app`, `@crm/ui` |
| `pnpm test:e2e` | **No** | Playwright in `apps/crm` (browser + Next server) |
| `pnpm test:all` | No | Unit then E2E (full local check) |

**Pass rate (unit):** **72 / 72 tests passing (100%)** via `pnpm test`.

**Code coverage:** Not measured (no `@vitest/coverage-v8` in CI).

---

## Local commands

### Unit / integration

```bash
pnpm test              # same as test:unit (Turbo)
pnpm test:unit
pnpm --filter @crm/core test
```

### E2E (Playwright)

**Prerequisites**

1. MongoDB running (`MONGODB_URI` in `apps/crm/.env.local`).
2. Seeded admin (or defaults): `pnpm --filter @crm/db seed`
3. Browsers once: `pnpm test:e2e:install`

```bash
pnpm test:e2e              # list reporter + HTML report path
pnpm test:e2e:ui           # interactive UI mode
pnpm test:e2e:report       # open last HTML report
pnpm test:all              # unit then E2E
```

E2E uses `next start` (builds first if `.next` missing). With `pnpm dev` already on port 3000, Playwright reuses that server.

**Env vars** (optional; see [`.env.example`](../.env.example)):

| Variable | Default | Purpose |
|----------|---------|---------|
| `E2E_ADMIN_EMAIL` | `admin@tcrm.local` | Admin login |
| `E2E_ADMIN_PASSWORD` | `admin123456` | Admin password |
| `E2E_EMPLOYEE_EMAIL` | `e2e-employee@tcrm.local` | Self-service HR user |
| `E2E_EMPLOYEE_PASSWORD` | `e2eemployee123` | Employee password |
| `PLAYWRIGHT_BASE_URL` | `http://localhost:3000` | App base URL |

`e2e/global-setup.ts` ensures the E2E employee user and linked `Employee` record exist.

---

## `@crm/lib` (21 tests)

### `src/validation/hr.test.ts`

| Scenario | Verifies |
|----------|----------|
| Valid / invalid company slug | `companySchema` |
| Valid / invalid employee email | `employeeSchema` |
| User employee profile schema | `userEmployeeProfileSchema` |
| Checkbox parsing | `parseLinkEmployeeFromForm` |
| Form profile extraction | `employeeProfileFromForm` |
| Schedule window | `scheduleEntrySchema` end after start |

### `src/utils/cn.test.ts`, `crypto.test.ts`, `validation/logistics.test.ts`

Unchanged — class merge, secret round-trip, movement/reservation Zod.

---

## `@crm/core` (37 tests)

### `src/hr/company-scope.test.ts` (unit)

| Scenario | Verifies |
|----------|----------|
| Global scope flags | `hasGlobalHrScope` |
| Company filters | `buildCompanyFilter`, `buildCompanyIdFilter` |

### `src/hr/user-provisioning.integration.test.ts`

| Scenario | Verifies |
|----------|----------|
| Provision with employee | User + employee + `employee` role |
| Duplicate email | Hungarian error |
| HR scope denial | Out-of-scope company blocked |
| Upsert employee | Create and update single record |

### `src/hr/requests.integration.test.ts`

| Scenario | Verifies |
|----------|----------|
| Submit / wrong user | Own requests only |
| Cancel pending | Status `cancelled` |
| Approve holiday | Summary + schedule `off` entry |
| Reject | No side effects |
| Self-approval | Blocked |

### `src/hr/schedules.integration.test.ts`

| Scenario | Verifies |
|----------|----------|
| Shift hours sum | `suggestWorkedHoursFromSchedule` excludes `off` |

### Logistics / inventory

Existing: SKU, import, vehicles, availability, references, `logistics.integration.test.ts`.

---

## `@crm/auth` (4 tests)

### `src/permissions.integration.test.ts`

| Scenario | Verifies |
|----------|----------|
| Role + direct merge | `getEffectivePermissionKeys` |
| Inactive user | Empty set |
| `userHasPermission` / `userHasAnyPermission` | Key checks |

Uses `mongodb-memory-server` + `ensureBaselineRbac()`.

---

## `@crm/app` (2 tests)

### `src/app/(auth)/login/actions.test.ts`

`loginSchema` valid email / invalid email.

---

## `@crm/ui` (8 tests)

### `src/components/data-table/query.test.ts`

Pagination, sort, boolean/enum/number filters, search.

### `src/components/data-table/preferences.test.ts`

Default visible columns, persisted preferences.

---

## Playwright E2E (`apps/crm/e2e`)

| Spec | Flow |
|------|------|
| `auth.spec.ts` | Admin login → dashboard |
| `accounting-hr.spec.ts` | Admin → `/accounting` → overview heading |
| `accounting-my.spec.ts` | E2E employee → `/accounting/my` → schedule UI |

**Selectors:** `data-testid` on `login-form`, `login-submit`, `accounting-overview`, `my-hr-schedule`, `my-no-employee`.

**Reports:** Terminal `list` reporter + `apps/crm/playwright-report/index.html`.

---

## Gaps (follow-up)

- Vitest coverage thresholds (`@vitest/coverage-v8`)
- Full HR approval flows in browser
- Inventory commit beyond logistics integration
- Register-with-employee server action test
