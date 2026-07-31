# syntax=docker/dockerfile:1
#
# Production image for dating-api (NestJS + Prisma).
# Uses node:22-slim (Debian) — NOT Alpine — to avoid Prisma OpenSSL/musl issues.

FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src

# prisma.config.ts requires DATABASE_URL even for `generate` (no DB connection made).
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"

RUN npx prisma generate \
  && npm run build \
  && npm prune --omit=dev \
  && npm install prisma@6.19.2 --omit=dev --no-save

# Clear build-time placeholder; real URL is injected at runtime.
ENV DATABASE_URL=

# --- runtime -----------------------------------------------------------------

FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    STRUCTURED_LOG_FILE=0

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/uploads/profile-photos \
  && chown -R node:node /app

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node scripts/docker-migrate.sh ./scripts/docker-migrate.sh

RUN chmod +x ./scripts/docker-migrate.sh

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# App start only — migrations run via scripts/docker-migrate.sh (one-shot), never here.
# Nest outDir flattens sourceRoot (`src/`) → `dist/main.js` (not `dist/src/main.js`).
CMD ["node", "dist/main.js"]
