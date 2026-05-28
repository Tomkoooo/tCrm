# tCrm

Internal CRM + future SaaS platform. Turborepo monorepo with Next.js 16 CRM app, dynamic RBAC, and 3SGP-derived design system.

## Quick start

```bash
# Prerequisites: Node 20, pnpm 9, MongoDB (or Docker)

cp .env.example apps/crm/.env.local
pnpm install

# Seed database (requires MongoDB running)
pnpm --filter @crm/db seed

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Default admin after seed:

- Email: `admin@tcrm.local`
- Password: `admin123456`

### Docker (full stack)

```bash
docker compose -f docker/docker-compose.yml up --build
```

Mongo Express: [http://localhost:8081](http://localhost:8081)

## Monorepo layout

```
apps/crm/          Main CRM application
packages/auth/     Auth.js + RBAC helpers
packages/db/       Mongoose models + seed
packages/lib/      Utils + Zod validation
packages/ui/       Shared Container + (graduating shadcn)
packages/core/     Business logic (Phase 1+)
docker/            Docker Compose for local dev
docs/              Architecture, rules, design system
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start CRM dev server |
| `pnpm build` | Production build (all packages) |
| `pnpm lint` | ESLint across workspace |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Vitest unit tests |
| `pnpm --filter @crm/db seed` | Seed permissions, roles, admin user |

## Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — system design, RBAC, CI/CD
- [rules.md](./docs/rules.md) — coding conventions
- [design.md](./docs/design.md) — UI tokens, layout, components

## Phase roadmap

- **Phase 0 (current):** Foundation — monorepo, auth, RBAC admin, dashboard shell
- **Phase 1:** Inventory — product schema, Excel parser, dynamic DataTable
- **Phase 2:** Logistics, offers, builds; `apps/landing` (tWeb fork)
- **Phase 3:** Accounting, multi-tenant SaaS, reporting

## Tech stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · MongoDB · Auth.js v5 · Turborepo · pnpm · Vitest · Docker · GitHub Actions
