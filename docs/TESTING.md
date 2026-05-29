# Unit and integration tests

Last updated: 2026-05.

## How to run

```bash
pnpm test          # all packages with a "test" script (Turbo)
pnpm --filter @crm/core test
pnpm --filter @crm/lib test
pnpm --filter @crm/auth test
pnpm --filter @crm/app test
```

**Pass rate (last run):** **28 / 28 tests passing (100%)** across the four packages wired into `pnpm test`.

**Code coverage:** Vitest **coverage is not configured** in this repo (no `@vitest/coverage-v8` / CI threshold). The percentages below describe **which areas have automated tests**, not line coverage from Istanbul.

| Package | Test files | Tests | In `pnpm test` | Approx. scope covered |
|---------|------------|-------|----------------|------------------------|
| `@crm/core` | 6 | 17 | Yes | Inventory SKU/import, logistics domain + DB integration |
| `@crm/lib` | 3 | 8 | Yes | `cn`, secrets crypto, logistics Zod |
| `@crm/auth` | 1 | 1 | Yes | Permission key format smoke check |
| `@crm/app` | 1 | 2 | Yes | Login Zod schema |
| `@crm/ui` | 2 | ~9 | **No** (no `test` script) | DataTable query + preferences (run manually if needed) |
| `@crm/db` | 0 | 0 | No | — |
| HR / accounting | 0 | 0 | No | New module; no tests yet |

**Overall:** Automated tests focus on **logistics stock**, **inventory import/SKU**, and small **shared utilities**. Most UI routes, auth session, RBAC resolution, and the **HR/accounting** module are untested.

---

## `@crm/core` (17 tests)

### `src/inventory/sku.test.ts` (unit)

| Scenario | What it verifies |
|----------|------------------|
| Prefix + pad to total length | `generateInternalSku` builds CRM SKU from category prefix and supplier digits |
| Normalize non-digits | Strips/normalizes input (e.g. `AB-60303008` → padded numeric SKU) |

### `src/inventory/import.test.ts` (integration-ish)

| Scenario | What it verifies |
|----------|------------------|
| Parse `docs/excel/Alutent.xlsx` | `parseInventoryXlsx` returns rows; each row has `supplierSku` and `crmCategorySlug` |

### `src/logistics/references.test.ts` (unit)

| Scenario | What it verifies |
|----------|------------------|
| GRN reference format | `formatMovementReference('grn', year, seq)` → `GRN-YYYY-NNNNN` |
| Pick / transfer prefixes | `PICK-` and `TRF-` reference strings |

### `src/logistics/vehicles.test.ts` (unit)

| Scenario | What it verifies |
|----------|------------------|
| Cargo within limits | `evaluateVehicleFit` accepts weight/volume under vehicle caps |
| Overweight cargo | Rejects with Hungarian reason containing „Súly” |

### `src/logistics/availability.test.ts` (unit)

| Scenario | What it verifies |
|----------|------------------|
| No BOM | `computeBomAvailabilityFromComponents` uses own stock only |
| Limiting component | Buildable qty = min over components (floor division) |
| Missing stock | Returns `canBuild: 0` when component not in stock map |

### `src/logistics/logistics.integration.test.ts` (integration, MongoMemoryServer)

Uses in-memory MongoDB; seeds user, two warehouses, product, stock at warehouse A.

**Reservations**

| Scenario | What it verifies |
|----------|------------------|
| Create reservation | Status `active`; `reserved` incremented on `StockLevel` |
| Insufficient stock | Throws when quantity > available |
| Release reservation | `reserved` back to 0 after cancel |

**Movements**

| Scenario | What it verifies |
|----------|------------------|
| GRN confirm | Increases `onHand` at destination; status `confirmed`; `GRN-` reference |
| Pick + reservation | Decreases on-hand and reserved; reservation `fulfilled` |
| Transfer | Moves qty between warehouses (70 / 30 split) |
| Cancel draft | No stock change; movement `cancelled` |

---

## `@crm/lib` (8 tests)

### `src/utils/cn.test.ts`

| Scenario | What it verifies |
|----------|------------------|
| Merge classes | Basic string join |
| Conditional | Falsy values skipped |
| Tailwind merge | Conflicting utilities resolved (`px-4` wins) |

### `src/utils/crypto.test.ts`

| Scenario | What it verifies |
|----------|------------------|
| Round-trip | `encryptSecret` / `decryptSecret` with `SECRETS_ENCRYPTION_KEY` |
| Unique ciphertext | Same plaintext → different encodings; both decrypt correctly |

### `src/validation/logistics.test.ts`

| Scenario | What it verifies |
|----------|------------------|
| GRN without destination | `createMovementSchema` fails without `toWarehouseId` |
| Valid reservation input | `createReservationSchema` accepts well-formed payload |
| Parse movement lines JSON | `parseMovementLinesJson` extracts product lines |

---

## `@crm/auth` (1 test)

### `src/permissions.test.ts`

| Scenario | What it verifies |
|----------|------------------|
| Key pattern | Sample keys match `/^[a-z]+:[a-z]+$/` (note: keys like `logistics:scope_all` use underscores and may not match this pattern in production) |

---

## `@crm/app` (2 tests)

### `src/app/(auth)/login/actions.test.ts`

| Scenario | What it verifies |
|----------|------------------|
| Valid login payload | `loginSchema` accepts email + password |
| Invalid email | `loginSchema` rejects malformed email |

---

## `@crm/ui` (not in Turbo `test`; ~9 cases if run manually)

Add `"test": "vitest run"` to `packages/ui/package.json` to include in `pnpm test`.

### `src/components/data-table/query.test.ts`

| Scenario | What it verifies |
|----------|------------------|
| Pagination | `skip` / `limit` from page + pageSize |
| Sort | Asc and desc on column key |
| Boolean filter | Parses `true` / `false` |
| Enum filter | `$in` array |
| Number range | `$gte` / `$lte` |
| Search | Builds `$and` with searchable columns |

### `src/components/data-table/preferences.test.ts`

| Scenario | What it verifies |
|----------|------------------|
| Default visible columns | Uses `defaultVisible` when no localStorage |
| Persist preferences | `setTablePreferences` / `getTablePreferences` round-trip |

---

## Gaps and recommendations

| Area | Status |
|------|--------|
| HR (`packages/core/src/hr`, accounting routes) | No tests |
| RBAC (`getEffectivePermissionKeys`, seed) | No tests |
| User provisioning / register with employee | No tests |
| Inventory commit / stock adjustments (beyond logistics path) | Partial via logistics integration only |
| E2E / Playwright | Not present |

To add coverage reporting: install `@vitest/coverage-v8` per package, enable `coverage` in `vitest.config.ts`, and optionally add a CI job with a minimum threshold.
