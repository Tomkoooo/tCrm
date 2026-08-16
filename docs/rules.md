# CRM Rules & Conventions

**Pair with:** [design.md](./design.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [AGENT_HANDOFF.md](./AGENT_HANDOFF.md)

Single source of truth for frontend, backend, and team conventions in the rebuilt app. Package names and routes below match the **current** codebase — see [ARCHITECTURE.md §4](./ARCHITECTURE.md#4-current-feature-surface) for the full route list before assuming a feature exists.

---

## 1. Architecture Principles

- **Monorepo first** — everything lives in this repo
- **Server-first** — Server Components + Server Actions by default
- **Feature-based branches** — `feature/<short-description>`
- **Shared code** — never duplicate models, components, or utils across apps
- **Dynamic RBAC** — permissions are data-driven, declared as `PermissionModule`s and registered at boot (see ARCHITECTURE.md §6) — never a hardcoded role enum
- **Clean boundaries** — `packages/db-core`, `packages/auth`, `packages/rbac`, `packages/admin`, `packages/mail`, `packages/media`, `packages/ui`, `packages/lib`

---

## 2. Technology Stack

- Next.js 16 App Router (`apps/crm/`)
- TypeScript strict
- Tailwind CSS v4 + shadcn/ui (New York + zinc)
- MongoDB + Mongoose 9.x
- Auth.js v5 (NextAuth beta)
- Server Actions for mutations
- Lucide React icons
- Sonner for toasts
- Turborepo + pnpm workspaces

### Workspace aliases

| Alias | Maps to |
|-------|---------|
| `@crm/ui` | `packages/ui` |
| `@crm/db-core` | `packages/db-core` |
| `@crm/auth` | `packages/auth` |
| `@crm/rbac` | `packages/rbac` |
| `@crm/admin` | `packages/admin` |
| `@crm/mail` | `packages/mail` |
| `@crm/media` | `packages/media` |
| `@crm/lib` | `packages/lib` |
| `@crm/inventory` | `packages/inventory` |
| `@crm/employee-core` | `packages/employee-core` (not yet wired into any HR route) |
| `@/*` | `apps/crm/src/*` |

There is no `@crm/core` or `@crm/db` in the rebuilt app — if you see either in old notes or comments, they refer to the pre-rebuild codebase (`_legacy-core-reference/`), not something to import.

---

## 3. File Placement

| What | Where |
|------|--------|
| shadcn primitives | `apps/crm/src/components/ui/` (add via CLI; graduate to `@crm/ui` when stable) |
| Shared Container / DataTable / EntitySheet | `@crm/ui` |
| App chrome | `apps/crm/src/components/` (`app-sidebar`, `app-header`, `branding-provider`) |
| Route-only UI | Co-locate under `apps/crm/src/app/<route>/` |
| Server Actions | `actions.ts` next to the route |
| Mongoose models | `packages/db-core/src/models/` |
| Repositories | `packages/db-core/src/repositories/` |
| Zod schemas | `packages/lib/src/validation/` or co-located |
| Client hooks | `apps/crm/src/hooks/` |
| Design tokens | `apps/crm/src/app/globals.css` |
| Help articles (súgó) | `docs/user-guide/*.md` — rendered at `/help`, loaded by `apps/crm/src/lib/help/load-help.ts` |
| Guided tour steps | `apps/crm/src/lib/tour/` — driven by `data-tour` attributes on shell elements |

---

## 4. Styling Rules

1. Prefer semantic tokens: `bg-background`, `text-foreground`, `bg-primary`, etc.
2. Avoid raw palette classes except status semantics
3. Always merge with `cn()` from `@/lib/utils` or `@crm/lib`
4. Wrap page content in `<Container>` from `@crm/ui`
5. Do not edit `ui/` primitives for one-offs — compose wrappers
6. Extend shadcn via `className`, not forks

### `Button` loading and `asChild`

- Use `loading` / `loadingText` on submit and async actions (replaces manual `disabled` + label swap).
- **Never** pass multiple children to `Button` when `asChild` is set — Radix `Slot` allows exactly one element (e.g. `<Link>`).
- Do not use `loading` with `asChild`.
- Run `node scripts/verify-button-aschild.mjs` when changing `components/ui/button.tsx` (included in `pnpm preflight`).

---

## 5. Component Rules

### Server vs Client

- **Default:** Server Components for pages and data-fetching
- **`"use client"`** when needed: sidebar, header, forms with `useActionState`, hooks, the guided tour trigger

### Icons

- Import from `lucide-react`
- Nav/menu: `className="h-4 w-4"`
- Stat headers: `className="h-4 w-4 text-muted-foreground"`

---

## 6. Layout Rules

Shell pattern (dashboard routes):

```
SidebarProvider → AppSidebar + SidebarInset → AppHeader + main
```

Auth routes use `(auth)/layout.tsx` — **no sidebar**. Setup routes use `(setup)/setup/` — also no sidebar.

Page header block:

```tsx
<h1 className="text-2xl font-bold">Page title</h1>
<p className="text-sm text-muted-foreground">Subtitle</p>
```

---

## 7. Forms & Data

1. Prefer Server Actions + `useActionState`
2. Form layout: `flex flex-col gap-6`; fields `gap-2`
3. Required fields: red asterisk next to Label
4. Errors: `text-sm text-red-600` from `state.fieldErrors`
5. Success: `useEffect` + `router.push()` or `redirect()` from action, or `router.refresh()` for in-place updates (see the permissions sync button pattern)
6. Do not add react-hook-form without team agreement

---

## 8. Mail & notifications

1. Add or extend a `MailTemplate` in `@crm/admin`'s seed data (unique `key`).
2. Templates seed on `/setup` via `seedEngineMailTemplates()`.
3. Send via `@crm/mail` — never call Nodemailer directly from `apps/crm`.
4. Reply-To is set from the acting user, falling back to `SMTP_FROM`.
5. Optional admin overrides: recipient role/user fields on the template (editable at `/admin/mail-templates`).

Permissions: `mail:manage` (templates), `mail:send` (invites, password reset).

---

## 9. RBAC Enforcement

1. **Middleware** — session presence only, no DB access (Edge-safe)
2. **Layouts** — `requirePermission('key')` → `notFound()`
3. **Server Actions** — `await requirePermission('key')` as first line
4. **Sidebar** — hide nav items by permission (UI only, not a security boundary)

### New permission workflow

1. Add the key to the owning module's `permissions.ts` (`@crm/admin` for cross-cutting keys, `@crm/media` for media, or a new `PermissionModule` registered in `apps/crm/src/lib/rbac-bootstrap.ts` for a new domain)
2. Run the baseline sync (automatic on next process start, or manually via **Baseline jogosultságok szinkronizálása** on `/admin/permissions`)
3. Assign to non-system roles at `/admin/permissions` (the `admin` role always gets every key automatically)
4. Guard routes and actions with `requirePermission`
5. Add a `docs/user-guide/*.md` article (or update an existing one's `permissions:` frontmatter) so `/help` and the driver.js tour stay accurate for the new gate

---

## 10. Dynamic DataTable & EntitySheet (mandatory)

All **list / tabular UI** must use `@crm/ui` **`DataTable`** with `ColumnDef<T>` metadata. Panels (filters, sort, columns, create, row preview) use **`EntitySheet`**.

| Mode | When |
|------|------|
| `server` (default) | RSC page: `parseDataTableQuery` → `buildDataTableMongoQuery` → pass `data`, `query`, `total`, `basePath`, **`tableId`** |
| `client` | In-memory rows: `mode="client"` + optional URL filters |

Column types: `string`, `number`, `boolean`, `enum`, `date`, `image`. User column visibility persists in `localStorage` per `tableId`.

Do **not** add new raw shadcn `Table` list views. Documented exception: the RBAC permission matrix on `/admin/permissions`.

---

## 11. Testing & Quality

See [TESTING.md](./TESTING.md) for the current, verified test inventory. In short:

- Unit tests for utils, validation schemas, permission helpers, co-located per package
- UI guard script: `node scripts/verify-button-aschild.mjs` (prevents React #143 on `Button asChild`)
- Husky **pre-commit**: lint-staged (eslint + prettier)
- Husky **pre-push**: `pnpm preflight` (lint, typecheck, tests, build — same as CI)
- **E2E (Playwright)**: local only — `pnpm preflight:e2e` or `RUN_E2E=1 git push`. Not in GitHub CI.
- CI (`.github/workflows/ci.yml`): `pnpm lint`, `pnpm typecheck`, `pnpm test`, `verify-button-aschild`, `pnpm build`

Before pushing, agents and humans should run `pnpm preflight`.

---

## 12. Anti-patterns

| Don't | Do instead |
|-------|------------|
| Import across `apps/*` | Use `packages/*` |
| Bypass `requirePermission` | Enforce in layout + actions |
| Put business logic in `ui/` | Use a domain package or co-located actions |
| Rely on hiding nav for security | Server-side permission checks |
| Duplicate Mongoose models | Single model in `@crm/db-core` |
| Skip Container on standard pages | Consistent padding and max-width |
| Hand-maintain a flat permission list for the `admin` role | Let `ensurePermissionsSynced` recompute it from registered modules |
| Copy code from `_legacy-core-reference/` verbatim | Treat it as reference only — re-review against current models/permissions before reusing |
| Write a new `docs/user-guide/*.md` chapter for a feature that isn't actually routable yet | Ship the route first, then document it |

---

## 13. Development Workflow

1. Create feature branch from `main`
2. Implement complete vertical slice
3. PR with tests + doc updates (ARCHITECTURE.md / rules.md / user-guide as relevant)
4. Merge → CI → Docker publish on main

---

## 14. Source of Truth Files

| Pattern | File |
|---------|------|
| Tokens | `apps/crm/src/app/globals.css` |
| Root layout | `apps/crm/src/app/layout.tsx` |
| Dashboard shell | `apps/crm/src/app/(dashboard)/layout.tsx` |
| Sidebar | `apps/crm/src/components/app-sidebar.tsx` |
| Header | `apps/crm/src/components/app-header.tsx` |
| Permission modules | `apps/crm/src/lib/rbac-bootstrap.ts`, `packages/admin/src/permissions.ts`, `packages/media/src/permissions.ts` |
| Baseline sync | `packages/rbac/src/bootstrap.ts` |
| Mail send | `packages/mail/src` |
| Auth config | `packages/auth/src/config.ts` |
| shadcn config | `apps/crm/components.json` |
| Help articles | `docs/user-guide/*.md` |

---

*Last updated: 2026-07 (post-rebuild).*
