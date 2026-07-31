# syntax=docker/dockerfile:1
#
# Production image for dating-ui (Next.js 16 standalone).
#
# IMPORTANT: NEXT_PUBLIC_* values are baked in at BUILD TIME (inlined into the
# client bundle). Changing them requires a rebuild — runtime env alone is not
# enough for browser-facing public vars. Pass via --build-arg / compose build.args.
#
# API_PROXY_TARGET is also used at build time for next.config rewrites
# (/api/* and /socket.io → dating-api). In compose/ECS set it to the internal
# API hostname (e.g. http://api:3001).

FROM node:22-slim AS builder

WORKDIR /app

# --- Build-time public env (baked into client JS) -----------------------------
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_SESSION_COOKIE_NAME=
ARG NEXT_PUBLIC_REALTIME=
ARG NEXT_PUBLIC_API_PORT=
ARG NEXT_PUBLIC_AUTH_TEST=
ARG NEXT_PUBLIC_ADMIN_ENABLED=
ARG NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES=
ARG NEXT_PUBLIC_MATCH_QUALITY_RUNBOOK_URL=
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT=
# Server-side rewrite target for /api and /socket.io (not exposed to browser).
ARG API_PROXY_TARGET=http://127.0.0.1:3001

ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SESSION_COOKIE_NAME=$NEXT_PUBLIC_SESSION_COOKIE_NAME \
    NEXT_PUBLIC_REALTIME=$NEXT_PUBLIC_REALTIME \
    NEXT_PUBLIC_API_PORT=$NEXT_PUBLIC_API_PORT \
    NEXT_PUBLIC_AUTH_TEST=$NEXT_PUBLIC_AUTH_TEST \
    NEXT_PUBLIC_ADMIN_ENABLED=$NEXT_PUBLIC_ADMIN_ENABLED \
    NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES=$NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES \
    NEXT_PUBLIC_MATCH_QUALITY_RUNBOOK_URL=$NEXT_PUBLIC_MATCH_QUALITY_RUNBOOK_URL \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT \
    API_PROXY_TARGET=$API_PROXY_TARGET \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs next-env.d.ts ./
COPY public ./public
COPY src ./src
COPY instrumentation.ts ./
COPY sentry.shared.config.ts sentry.server.config.ts sentry.client.config.ts ./
COPY content ./content

RUN npm run build

# --- runtime -----------------------------------------------------------------

FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

RUN mkdir -p /app \
  && chown -R node:node /app

# Next standalone output: server.js + minimal node_modules + traced files
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

CMD ["node", "server.js"]
