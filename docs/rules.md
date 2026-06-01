# CRM Rules & Architecture — 2026

**Pair with:** [design.md](./design.md), [ARCHITECTURE.md](./ARCHITECTURE.md)

Single source of truth for frontend, backend, and team conventions.

---

## 1. Architecture Principles

- **Monorepo first** — everything lives in this repo
- **Server-first** — Server Components + Server Actions by default
- **Feature-based branches** — `feature/inventory-parser`, `feature/dynamic-rbac`
- **Shared code** — never duplicate models, components, or utils across apps
- **Dynamic RBAC** — permissions are data-driven
- **Clean boundaries** — `packages/db`, `packages/auth`, `packages/ui`, `packages/core`

---

## 2. Technology Stack

- Next.js 16+ App Router (`apps/crm/`)
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
| `@crm/db` | `packages/db` |
| `@crm/auth` | `packages/auth` |
| `@crm/lib` | `packages/lib` |
| `@crm/core` | `packages/core` |
| `@/*` | `apps/crm/src/*` |

---

## 3. File Placement

| What | Where |
|------|--------|
| shadcn primitives | `apps/crm/src/components/ui/` (add via CLI; graduate to `@crm/ui` when stable) |
| Shared Container | `@crm/ui` |
| App chrome | `apps/crm/src/components/` (`app-sidebar`, `app-header`) |
| Reused domain UI | `apps/crm/src/components/` |
| Route-only UI | Co-locate under `apps/crm/src/app/<route>/` |
| Server Actions | `actions.ts` next to the route |
| Mongoose models | `packages/db/src/models/` |
| Repositories | `packages/db/src/repositories/` |
| Zod schemas | `packages/lib/src/validation/` or co-located |
| Client hooks | `apps/crm/src/hooks/` |
| Design tokens | `apps/crm/src/app/globals.css` |

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
- **Never** pass multiple children to `Button` when `asChild` is set — Radix `Slot` allows exactly one element (e.g. `<Link>`). The shared `Button` keeps a single child for `asChild`; the spinner is only rendered on the native `<button>` path.
- Do not use `loading` with `asChild` (use a plain `<button>` or disable the link via `aria-busy` on the child if needed).
- Run `node scripts/verify-button-aschild.mjs` when changing `components/ui/button.tsx` (included in `pnpm preflight`).

---

## 5. Component Rules

### Server vs Client

- **Default:** Server Components for pages and data-fetching
- **`"use client"`** when needed: sidebar, header, forms with `useActionState`, hooks

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

Auth routes use `(auth)/layout.tsx` — **no sidebar**.

Page header block:

```tsx
<h1 className="text-2xl font-bold">Page title</h1>
<p className="text-sm text-muted-foreground">Subtitle</p>
```

Grids: stats `lg:grid-cols-4`, cards `lg:grid-cols-3`, filters `md:grid-cols-5`.

---

## 7. Forms & Data

1. Prefer Server Actions + `useActionState`
2. Form layout: `flex flex-col gap-6`; fields `gap-2`
3. Required fields: red asterisk next to Label
4. Errors: `text-sm text-red-600` from `state.fieldErrors`
5. Success: `useEffect` + `router.push()` or `redirect()` from action
6. Do not add react-hook-form without team agreement

---

## 8. Mail & notifications

When a feature must notify users by email:

1. Add or extend a `MailTemplate` in [`packages/db/src/seed-templates-data.ts`](../packages/db/src/seed-templates-data.ts) (unique `key`).
2. Run seed (missing templates only) or set `SEED_OVERWRITE_TEMPLATES=1` to refresh copy.
3. From `@crm/core`, call `sendTemplatedEmail({ templateKey, to, variables, actorUserId })` — never call Nodemailer from `apps/crm`.
4. Set `Reply-To` via `actorUserId` / `actorEmail` (the user whose action triggered the mail).
5. Optional admin overrides: `recipientRoleKeys` / `recipientUserIds` on the template (editable at `/admin/mail-templates`).
6. Logistics pickup events: use `enqueueLogisticsNotification` — template key must match `LogisticsNotificationKind`.

Permissions: `mail:manage` (templates), `mail:send` (invites, password reset).

---

## 9. RBAC Enforcement

1. **Middleware** — session cookie / JWT validation
2. **Layouts** — `requirePermission('key')` → `notFound()`
3. **Server Actions** — `await requirePermission('key')` as first line
4. **Sidebar** — hide nav items by permission (UI only)

### New permission workflow

1. Add key to seed or create via admin
2. Assign to roles at `/admin/permissions`
3. Guard routes and actions with `requirePermission`
4. Add breadcrumb translation in `app-header.tsx` if needed

---

## 10. Dynamic DataTable & EntitySheet (mandatory)

All **list / tabular UI** must use `@crm/ui` **`DataTable`** with `ColumnDef<T>` metadata. Panels (filters, sort, columns, create, row preview) use **`EntitySheet`**.

| Mode | When |
|------|------|
| `server` (default) | RSC page: `parseDataTableQuery` → `buildDataTableMongoQuery` → pass `data`, `query`, `total`, `basePath`, **`tableId`** |
| `client` | In-memory rows (builds, permissions snippets, dashboard tables): `mode="client"` + optional URL filters |

Column types: `string`, `number`, `boolean`, `enum`, `date`, **`image`**. User column visibility persists in `localStorage` per `tableId`.

Do **not** add new raw shadcn `Table` list views. Exceptions: documented in [ARCHITECTURE.md](./ARCHITECTURE.md) (RBAC matrix, small detail sub-grids).

---

## 11. Testing & Quality

- Unit tests for utils, validation schemas, permission helpers
- UI guard script: `node scripts/verify-button-aschild.mjs` (prevents React #143 on `Button asChild`)
- Server Action schema tests (no real Mongo in CI)
- Husky **pre-commit**: lint-staged (eslint + prettier)
- Husky **pre-push**: `pnpm preflight` (lint, typecheck, tests, build — same as CI)
- **E2E (Playwright)**: local only by default — `pnpm preflight:e2e` or `RUN_E2E=1 git push`. Not in GitHub CI (slow; needs built app + MongoDB). Config already defines `webServer` for when you run it locally.
- CI (`.github/workflows/ci.yml`): `pnpm lint`, `pnpm typecheck`, `pnpm test`, `verify-button-aschild`, `pnpm build`

Before pushing, agents and humans should run `pnpm preflight`. See `.cursor/rules/pre-push.mdc`.

---

## 12. Anti-patterns

| Don't | Do instead |
|-------|------------|
| Import across `apps/*` | Use `packages/*` |
| Bypass `requirePermission` | Enforce in layout + actions |
| Put business logic in `ui/` | Use `packages/core` or co-located actions |
| Rely on hiding nav for security | Server-side permission checks |
| Duplicate Mongoose models | Single model in `@crm/db` |
| Skip Container on standard pages | Consistent padding and max-width |
| Assume dark mode works without ThemeProvider | Already wired in root layout |

---

## 13. Development Workflow

1. Create feature branch from `main`
2. Implement complete vertical slice
3. PR with tests + doc updates
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
| RBAC seed | `packages/db/src/seed.ts` |
| Mail templates seed | `packages/db/src/seed-templates-data.ts` |
| Mail send API | `packages/core/src/mail/mailer.ts` |
| Auth config | `packages/auth/src/config.ts` |
| shadcn config | `apps/crm/components.json` |

---

*Last updated: May 2026*
