# Agent handoff — tCrm

**Last updated: 2026-08-18**

Canonical catch-up document for agents continuing work on this monorepo. Read this **first**, before [ARCHITECTURE.md](./ARCHITECTURE.md) — this file has current status and known issues; ARCHITECTURE.md has stable design patterns.

---

## 1. What just happened — the rebuild

The CRM was **rebuilt from scratch** per the architectural plan in the root [README.md](../README.md): package names changed (`@crm/db` → `@crm/db-core`, `@crm/core` split into `@crm/admin`/`@crm/rbac`/`@crm/mail`/`@crm/media`/`@crm/inventory`/`@crm/logistics`/`@crm/hr`).

- **Branch:** landed on `main` from `rebuild/core-engine` (Phase 0+1, Phase 2, Phase 3 job-first HR).
- Inventory, logistics, builds, stock count, and HR (`/hr/*`) are live. Offers, bookkeeping, and titoktár are not.

---

## 2. Project snapshot

| Item | Detail |
|------|--------|
| **App** | `apps/crm` (`@crm/app`) — Next.js 16 App Router |
| **Packages** | `@crm/auth`, `@crm/db-core`, `@crm/rbac`, `@crm/admin`, `@crm/mail`, `@crm/media`, `@crm/inventory`, `@crm/logistics`, `@crm/hr`, `@crm/lib`, `@crm/ui` |
| **Stack** | React 19, TypeScript strict, Tailwind v4, shadcn New York+zinc, MongoDB/Mongoose, Auth.js v5, Turborepo/pnpm |
| **Design** | [design.md](./design.md), [rules.md](./rules.md) |
| **Docs** | [inventory.md](./inventory.md), [logistics.md](./logistics.md), [hr.md](./hr.md) |

---

## 3. Current feature surface

See [ARCHITECTURE.md §4](./ARCHITECTURE.md#4-current-feature-surface). Summary: auth, `/setup`, dashboard, `/account`, `/help`, admin, inventory, logistics + builds, **HR** (`/hr`, people, calendar, leave, hours, me).

Pickup crew uses HR `employeeIds`; job windows sync to `ScheduleEntry`. Dual modes: logistics vs roster. Companies + leave-year matrix live. Hours = job + shift durations.

---

## 4. Known issues

Each entry: **symptom → what the code review shows → likely cause → next step**.

### Administrator role missing access keys after a module add

- **Symptom:** the `admin` role is missing permission keys it should have (e.g. the Adminisztráció sidebar section doesn't appear because `admin:access` is missing). Clicking **"Baseline jogosultságok szinkronizálása"** used to look like a no-op.
- **What the code shows:** `ensurePermissionsSynced` rebuilds `admin` from every registered `PermissionModule`. `upsertRole` now uses `Role.updateOne` so `permissionIds` always persist (DocumentArray assignment + `save()` could skip change detection).
- **Next step:** after deploy, run **"Baseline jogosultságok szinkronizálása"** once so new `hr:*` / `logistics:*` keys land on admin.

### Env / `MONGODB_URI` mismatch

- **Symptom:** app behaves as if data is missing/stale even though MongoDB Compass shows it.
- **Cause:** Next.js reads env from `apps/crm/.env.local`, not the repo root `.env`.
- **Fix:** confirm `MONGODB_URI` in `apps/crm/.env.local`.

---

## 5. First-run / setup flow

Unchanged — see earlier diagram in git history if needed. Setup seeds RBAC + engine mail templates; logistics mail templates seed on dashboard load; after Phase 3 deploy, sync baseline permissions for `hr:*`.

---

## 6. Local bootstrap

| Variable | Required | Notes |
|----------|----------|-------|
| `MONGODB_URI` | Yes | Must match whatever you use to inspect the DB |
| `MONGODB_DB_NAME` | No | Default `tcrm` |
| `AUTH_SECRET` | Yes | 32+ chars; keep stable across restarts |
| `AUTH_URL` | Yes | e.g. `http://localhost:3000` |
| `APP_URL` | No | Preferred over `AUTH_URL` for links in emails |
| `SMTP_*` | Yes (for mail) | See `.env.example` |
| `ALLOW_PUBLIC_REGISTRATION` | No | `true` to enable `/register` after setup |

```bash
pnpm install
pnpm dev
```

**Verify:** `pnpm preflight` (or `pnpm lint && pnpm typecheck && pnpm test && pnpm build`)

---

## 7. Recommended near-term follow-ups

- [ ] After deploy, sync baseline permissions once and confirm admin has `admin:access` + `hr:*`
- [ ] Expand E2E coverage (inventory, logistics jobs, HR people/leave)
- [ ] Offers / bookkeeping / titoktár when explicitly scoped

---

## 8. Copy-paste prompt for next agent

```
You are continuing work on tCrm (Next.js 16, React 19, MongoDB, Auth.js v5,
Turborepo/pnpm). Phase 0–2 and Phase 3 job-first HR (`@crm/hr`, `/hr/*`) are live.
Do not restore the old `/accounting` tree. Offers/bookkeeping/titoktár are not built
unless asked.

Read: docs/AGENT_HANDOFF.md, docs/ARCHITECTURE.md, docs/hr.md, docs/logistics.md,
docs/inventory.md, docs/rules.md, docs/design.md, docs/TESTING.md.

After new permission modules, remind operators: Admin → Szerepkörök →
Baseline jogosultságok szinkronizálása.

Before building: git status; pnpm preflight. If touching RBAC, read AGENT_HANDOFF §4.
```

---

## 9. Do not

- Import deleted pre-rebuild packages into the live app
- Restore the old `/accounting` tree, teams, or cookie-based multi-company membership
- Invent offers or SaaS multi-tenant in this slice
