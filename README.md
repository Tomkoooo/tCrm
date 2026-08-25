# tCrm

Internal CRM + future SaaS platform. Turborepo monorepo with Next.js 16 CRM app, dynamic RBAC, and 3SGP-derived design system.

## Quick start

```bash
# Prerequisites: Node 22, pnpm 9, MongoDB (or Docker)

cp .env.example apps/crm/.env.local
pnpm install

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). On an empty database the app sends you to `/setup` to create the first administrator — there is no seed script.

### Docker (full stack)

```bash
docker compose -f docker/docker-compose.yml up --build
```

Mongo Express: [http://localhost:8081](http://localhost:8081)

## Monorepo layout

```
apps/crm/              Main CRM application
packages/auth/         Auth.js v5 + session/permission helpers
packages/rbac/         Permission-module registry + baseline sync
packages/admin/        Users, invitations, roles, mail-template seed
packages/db-core/      Mongoose connection, models, repositories
packages/mail/         Templated mail sender
packages/media/        Media library service
packages/lib/          Utils + Zod validation + env helpers
packages/ui/           Shared Container, DataTable, EntitySheet, shadcn primitives
packages/inventory/     Products, Excel import, stock
packages/logistics/     Movements, reservations, jobs, vehicles
packages/hr/            People, leave, schedule sync, monthly hours
docker/                Docker Compose for local dev
docs/                  Architecture, rules, design system, user guide
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start CRM dev server |
| `pnpm build` | Production build (all packages) |
| `pnpm lint` | ESLint across workspace |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Vitest unit tests |
| First admin | Empty DB → `/setup` (RBAC baseline syncs on dashboard load) |

## Documentation

- [erp-motor.md](./docs/erp-motor.md) — **ERP-motor (HU)** — moduláris konstruktor, testreszabási rétegek, új cég bevezetése
- [AGENT_HANDOFF.md](./docs/AGENT_HANDOFF.md) — current status, known issues, **copy-paste prompt for next agent** (§8) — **read this first**
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — system design, RBAC, CI/CD
- [rules.md](./docs/rules.md) — coding conventions
- [design.md](./docs/design.md) — UI tokens, layout, components
- [TESTING.md](./docs/TESTING.md) — test inventory and commands
- [inventory.md](./docs/inventory.md) — Phase 1 product/import notes
- [logistics.md](./docs/logistics.md) — Phase 2 movements, jobs, vehicles
- [hr.md](./docs/hr.md) — Phase 3 job-first HR
- [user-guide/](./docs/user-guide/) — end-user help articles, rendered at `/help` and used by the in-app guided tour

## Phase roadmap

- **Phase 0:** Foundation — monorepo, auth, dynamic RBAC, admin (users, roles, mail templates, media, branding), help center, PWA.
- **Phase 1:** Inventory — products, categories, suppliers, warehouses/stock, Excel import/export, DataTable.
- **Phase 2:** Logistics (movements, reservations, jobs, vehicles) and builds (`/inventory/builds`).
- **Phase 3 (current):** Job-first HR — people, leave, calendar from logistics jobs, monthly hours. Not a port of old `/accounting`.
- **Later:** Offers, bookkeeping, titoktár, multi-tenant SaaS.

## Tech stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · MongoDB · Auth.js v5 · Turborepo · pnpm · Vitest · Docker · GitHub Actions
