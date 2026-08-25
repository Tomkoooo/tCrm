# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
ENV HUSKY=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/crm/package.json ./apps/crm/
COPY packages/admin/package.json ./packages/admin/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db-core/package.json ./packages/db-core/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/hr/package.json ./packages/hr/
COPY packages/inventory/package.json ./packages/inventory/
COPY packages/lib/package.json ./packages/lib/
COPY packages/logistics/package.json ./packages/logistics/
COPY packages/mail/package.json ./packages/mail/
COPY packages/media/package.json ./packages/media/
COPY packages/rbac/package.json ./packages/rbac/
COPY packages/test-utils/package.json ./packages/test-utils/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder
ENV HUSKY=0
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time placeholders only — no DB/SMTP at image build; runtime env from compose/Portainer.
RUN export AUTH_SECRET=build-time-dummy-auth-secret-minimum-32-chars \
    MONGODB_URI=mongodb://127.0.0.1:27017 \
    MONGODB_DB_NAME=tcrm \
    AUTH_URL=http://localhost:3000 \
    APP_URL=http://localhost:3000 \
    SECRETS_ENCRYPTION_KEY=build-time-dummy-secrets-encryption-key-32 \
    SMTP_HOST=localhost \
    SMTP_PORT=587 \
    SMTP_USER=build \
    SMTP_PASS=build \
    SMTP_FROM=no-reply@build.local \
    SMTP_SECURE=false \
 && pnpm install --frozen-lockfile --ignore-scripts \
 && pnpm --filter @crm/app build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/crm/public ./apps/crm/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/crm/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/crm/.next/static ./apps/crm/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/docs/user-guide ./docs/user-guide

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/crm/server.js"]
