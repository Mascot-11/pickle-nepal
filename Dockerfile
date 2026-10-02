# syntax=docker/dockerfile:1

# ---- full deps (used for building) ----------------------------------------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate \
  && apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# Production-only dependencies for the runtime image.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod

# ---- build -----------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# No secrets are baked into the image; DATABASE_URL is only needed if a build
# ever needs to prerender data, and is supplied as a build arg if required.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm db:generate
RUN pnpm build

# ---- runner ----------------------------------------------------------------
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl curl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Runtime deps are production-only; the builder's Prisma Client is copied in
# afterwards because pnpm generates it inside its virtual store.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.pnpm/@prisma+client* /app/node_modules/.pnpm/
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

CMD ["pnpm", "start"]