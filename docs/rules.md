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

## 8. RBAC Enforcement

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

## 9. Dynamic DataTable & EntitySheet (mandatory)

All **list / tabular UI** must use `@crm/ui` **`DataTable`** with `ColumnDef<T>` metadata. Panels (filters, sort, columns, create, row preview) use **`EntitySheet`**.

| Mode | When |
|------|------|
| `server` (default) | RSC page: `parseDataTableQuery` → `buildDataTableMongoQuery` → pass `data`, `query`, `total`, `basePath`, **`tableId`** |
| `client` | In-memory rows (builds, permissions snippets, dashboard tables): `mode="client"` + optional URL filters |

Column types: `string`, `number`, `boolean`, `enum`, `date`, **`image`**. User column visibility persists in `localStorage` per `tableId`.

Do **not** add new raw shadcn `Table` list views. Exceptions: documented in [ARCHITECTURE.md](./ARCHITECTURE.md) (RBAC matrix, small detail sub-grids).

---

## 10. Testing & Quality

- Unit tests for utils, validation schemas, permission helpers
- Server Action schema tests (no real Mongo in CI)
- Husky pre-commit: lint-staged (eslint + prettier)
- CI: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`

---

## 11. Anti-patterns

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

## 12. Development Workflow

1. Create feature branch from `main`
2. Implement complete vertical slice
3. PR with tests + doc updates
4. Merge → CI → Docker publish on main

---

## 13. Source of Truth Files

| Pattern | File |
|---------|------|
| Tokens | `apps/crm/src/app/globals.css` |
| Root layout | `apps/crm/src/app/layout.tsx` |
| Dashboard shell | `apps/crm/src/app/(dashboard)/layout.tsx` |
| Sidebar | `apps/crm/src/components/app-sidebar.tsx` |
| Header | `apps/crm/src/components/app-header.tsx` |
| RBAC seed | `packages/db/src/seed.ts` |
| Auth config | `packages/auth/src/config.ts` |
| shadcn config | `apps/crm/components.json` |

---

*Last updated: May 2026*
