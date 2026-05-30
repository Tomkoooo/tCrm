# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/crm/package.json ./apps/crm/
COPY packages/auth/package.json ./packages/auth/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/lib/package.json ./packages/lib/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time placeholders only — no DB/SMTP at image build; runtime env from compose/Portainer.
ENV AUTH_SECRET=build-time-dummy-auth-secret-minimum-32-chars
ENV MONGODB_URI=mongodb://127.0.0.1:27017
ENV MONGODB_DB_NAME=tcrm
ENV AUTH_URL=http://localhost:3000
ENV APP_URL=http://localhost:3000
ENV SECRETS_ENCRYPTION_KEY=build-time-dummy-secrets-encryption-key-32
ENV SMTP_HOST=localhost
ENV SMTP_PORT=587
ENV SMTP_USER=build
ENV SMTP_PASS=build
ENV SMTP_FROM=no-reply@build.local
ENV SMTP_SECURE=false
RUN pnpm --filter @crm/app build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/crm/public ./apps/crm/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/crm/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/crm/.next/static ./apps/crm/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/crm/server.js"]
