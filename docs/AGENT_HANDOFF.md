# Agent handoff — tCrm

**Last updated: 2026-08-16**

Canonical catch-up document for agents continuing work on this monorepo. Read this **first**, before [ARCHITECTURE.md](./ARCHITECTURE.md) — this file has current status and known issues; ARCHITECTURE.md has stable design patterns.

---

## 1. What just happened — the rebuild

The CRM was **rebuilt from scratch** per the architectural plan in the root [README.md](../README.md): the old inventory/logistics/HR/accounting codebase was deleted and replaced with a fresh foundation slice. This is why package names changed (`@crm/db` → `@crm/db-core`, `@crm/core` removed and split into `@crm/admin`/`@crm/rbac`/`@crm/mail`/`@crm/media`, etc.) and why routes like `/inventory`, `/logistics`, `/accounting` no longer exist.

- **Branch:** `rebuild/core-engine` — the rebuild is **uncommitted** as of this writing. Do not assume it's on `main`.
- **Reference material:** `_legacy-core-reference/` holds the old `packages/core` source (HR, inventory, logistics business logic) as a porting reference for when those phases are rebuilt. It is not imported by anything live — do not wire it back in without re-reviewing it against the current models/permissions first.
- **Docs were previously stale:** the entire `docs/` tree and `.cursor/rules/*.mdc` still described the pre-rebuild system (wrong package names, routes, test counts) despite an explicit earlier request to delete them. This pass (2026-07-27) deleted the dead docs and rewrote the rest against the actual current codebase. If you find *more* stale references (e.g. in `.cursor/rules/`), treat them the same way: verify against the code, don't propagate.

---

## 2. Project snapshot

| Item | Detail |
|------|--------|
| **App** | `apps/crm` (`@crm/app`) — Next.js 16 App Router |
| **Packages** | `@crm/auth`, `@crm/db-core`, `@crm/rbac`, `@crm/admin`, `@crm/mail`, `@crm/media`, `@crm/inventory`, `@crm/employee-core` (HR unwired), `@crm/lib`, `@crm/ui` |
| **Stack** | React 19, TypeScript strict, Tailwind v4, shadcn New York+zinc, MongoDB/Mongoose, Auth.js v5, Turborepo/pnpm |
| **Design** | [design.md](./design.md), [rules.md](./rules.md) |
| **Last commit** | `ff792f8` — `feat(crm): add PWA support with mobile install prompt` |

---

## 3. Current feature surface

See [ARCHITECTURE.md §4](./ARCHITECTURE.md#4-current-feature-surface) for the authoritative route list. Summary: auth, first-run `/setup`, dashboard, `/account`, `/help`, admin (users/permissions/mail-templates/media/branding/warehouses), and **Phase 1 inventory** (`/inventory`, categories, suppliers, Excel import/export).

Logistics, offers, accounting/HR, and titoktár are not built yet. `_legacy-core-reference/` is porting reference only.

---

## 4. Known issues

Each entry: **symptom → what the code review shows → likely cause → next step**.

### Administrator role missing access keys; "Baseline jogosultságok szinkronizálása" doesn't fix it

- **Symptom:** the `admin` role is missing permission keys it should have (e.g. the Adminisztráció sidebar section doesn't appear because `admin:access` is missing, or an admin page 404s via `requirePermission`). Clicking **"Baseline jogosultságok szinkronizálása"** on `/admin/permissions` does not resolve it.
- **What the code shows (reviewed 2026-07-27):** the sync pipeline itself is self-consistent —
  - `packages/rbac/src/bootstrap.ts::ensurePermissionsSynced` always rebuilds the `admin` role's `permissionIds` from **every currently registered** `PermissionModule` key, never a hand-maintained list.
  - `apps/crm/src/lib/rbac-bootstrap.ts` registers exactly two modules (`enginePermissions`, `mediaPermissions`) — both are real, both are registered. No orphaned/unregistered `PermissionModule` was found anywhere else in the repo.
  - `packages/auth/src/config.ts`'s `session()` callback recomputes `getEffectivePermissionKeys` from the database **on every session read** — permissions are not cached in the JWT, so a stale client session is not the cause either.
  - The sync button's own gate (`requirePermission('roles:manage')` on `/admin/permissions` and inside `syncBaselinePermissionsAction`) means if an admin can reach and click the button at all, their role already has `roles:manage` — so a *complete* lockout isn't possible via this path; a *partial* one (missing some other key) is.
- **Most likely actual cause, given the above:** this is a **data or environment problem in the running deployment**, not a logic bug in the code as written:
  1. A leftover `Role` document with `key: 'admin'` from before the rebuild, in a database that hasn't been through `/setup` or a sync since the rebuild landed.
  2. The app connecting to a different MongoDB URI than the one being inspected (this bit the team before the rebuild too — see the env-loading note below).
  3. An error inside `ensurePermissionsSynced` being swallowed/misreported by `syncBaselinePermissionsAction`'s try/catch (check the toast message text and server logs, not just "did it look like it ran").
- **Next step for whoever picks this up:** connect to the actual runtime `MONGODB_URI`, inspect the `roles` collection for `key: 'admin'` and compare its `permissionIds` against the `permissions` collection; then click the sync button and diff before/after. Do not "fix" this by hand-editing the DB once — the sync is supposed to be idempotent and self-healing, so if it isn't, the bug is likely in error handling/visibility around the sync call, not in what it computes.
- **Why this is documented instead of fixed here:** the user flagged this as inherited from the pre-rebuild role-management approach and explicitly deferred it during this doc pass — treat it as a real, open P1, not resolved.

### Env / `MONGODB_URI` mismatch (carried over from before the rebuild, still a live footgun)

- **Symptom:** app behaves as if data is missing/stale even though MongoDB Compass shows it.
- **Cause:** Next.js reads env from `apps/crm/.env.local`, not the repo root `.env`.
- **Fix:** confirm `MONGODB_URI` in `apps/crm/.env.local` matches whatever tool you're using to inspect the database.

---

## 5. First-run / setup flow

```mermaid
flowchart TD
  visit[Any request] --> mw[middleware.ts]
  mw -->|no "initialized" cookie| setup["/setup"]
  setup --> action[setupAdminAction]
  action --> rbac[ensureRbacBootstrapped]
  action --> mailseed[seedEngineMailTemplates]
  action --> user[Create admin User with admin Role]
  user --> cookie[setInitializedCookie]
  cookie --> login["/login"]
  mw -->|initialized, no session| login
  mw -->|initialized + session| app[Dashboard routes]
```

| File | Role |
|------|------|
| `apps/crm/src/middleware.ts` | Edge: initialized-cookie + session-token check only — no Mongoose |
| `apps/crm/src/lib/initialized-cookie.ts` | Signed cookie marking "an admin exists" without a DB round-trip on every request |
| `apps/crm/src/app/(setup)/setup/actions.ts` | Creates first admin; calls `ensureRbacBootstrapped()` + `seedEngineMailTemplates()` |
| `packages/db-core/src/system.ts` | `hasAnyAdminUser()` |

`/register` is disabled after setup unless `ALLOW_PUBLIC_REGISTRATION=true`.

---

## 6. Environment checklist

```bash
cp .env.example apps/crm/.env.local
```

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

Open http://localhost:3000 — redirects to `/setup` when no admin exists yet.

**Verify:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

## 7. Recommended near-term follow-ups

- [ ] Commit the rebuild on `rebuild/core-engine` once verified (it is currently uncommitted working-tree state)
- [ ] Root-cause the admin-role sync issue (§4) against a real deployment DB
- [ ] Review `.cursor/rules/*.mdc` for the same pre-rebuild staleness this doc pass fixed in `docs/`
- [ ] Decide whether/when to wire `@crm/employee-core` into a route, or remove it if the HR phase isn't imminent
- [ ] Expand E2E coverage beyond `auth.spec.ts` (inventory list/import, admin CRUD)
- [ ] Phase 2: logistics, offers, builds

---

## 8. Copy-paste prompt for next agent

```
You are continuing work on tCrm, an internal CRM monorepo (Next.js 16, React 19,
MongoDB, Auth.js v5, Turborepo/pnpm) rebuilt from scratch. Phase 0 (foundation)
and Phase 1 (inventory) are live. Next is Phase 2: logistics, offers, builds.

Read in order: docs/AGENT_HANDOFF.md, docs/ARCHITECTURE.md, docs/inventory.md,
docs/rules.md, docs/design.md, docs/TESTING.md. Treat `_legacy-core-reference/`
as porting reference only.

After adding inventory permissions, remind operators to sync baseline RBAC
(Admin → Szerepkörök → Baseline jogosultságok szinkronizálása).

Before building anything new:
1. Check git status/log — the rebuild may still be uncommitted on rebuild/core-engine.
2. Run pnpm lint && pnpm typecheck && pnpm test && pnpm build.
3. If asked to touch RBAC/permissions, read AGENT_HANDOFF.md §4 first — there's an
   open, deliberately-unfixed known issue there (admin role missing access keys).

Constraints: never import across apps/*; no Mongoose/Node APIs in Edge middleware;
Server Components by default; requirePermission() on every admin mutation; DataTable/
EntitySheet for any list UI; update docs/user-guide/*.md and, if applicable, the
driver.js tour steps whenever you add/remove/re-gate a route.
```

---

## 9. Key file index

| Area | Path |
|------|------|
| Middleware | `apps/crm/src/middleware.ts` |
| Initialized-cookie | `apps/crm/src/lib/initialized-cookie.ts` |
| Setup | `apps/crm/src/app/(setup)/setup/` |
| RBAC bootstrap (module registration) | `apps/crm/src/lib/rbac-bootstrap.ts` |
| Baseline sync | `packages/rbac/src/bootstrap.ts` |
| Permission modules | `packages/admin/src/permissions.ts`, `packages/media/src/permissions.ts` |
| DB models | `packages/db-core/src/models/` |
| Connection | `packages/db-core/src/connection.ts` |
| Auth config | `packages/auth/src/config.ts`, `packages/auth/src/session.ts` |
| Help loader | `apps/crm/src/lib/help/load-help.ts` |
| Help content | `docs/user-guide/*.md` |
| Guided tour | `apps/crm/src/lib/tour/` |
| Validation (Zod) | `packages/lib/src/validation/` |
| Env helpers | `packages/lib/src/env.ts` |
| UI shared | `packages/ui/` |
| Next config | `apps/crm/next.config.ts` |

---

## 10. Conventions (quick reminder)

- Server Components by default; `"use client"` only when needed
- Server Actions + `useActionState` for forms (not RHF)
- Co-locate `actions.ts` next to routes
- `requirePermission()` on every admin mutation
- Wrap pages in `<Container>` from `@crm/ui`
- Never import across `apps/*` — use `packages/*`
- Keep `docs/user-guide/*.md` and the driver.js tour in sync with real routes/permissions
