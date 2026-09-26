#!/usr/bin/env bash
# Cloud Agent install: idempotent bootstrap for the dating monorepo (API + UI).
# Installs system services (PostgreSQL, Redis), node deps, env files, and the DB schema.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

log() { printf '[install] %s\n' "$*"; }

log "Installing system packages (PostgreSQL, Redis) if missing..."
if ! command -v pg_ctlcluster >/dev/null 2>&1 || ! command -v redis-server >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib redis-server
fi

PG_VER="$(ls /usr/lib/postgresql 2>/dev/null | sort -n | tail -1)"

log "Starting PostgreSQL (cluster ${PG_VER})..."
sudo pg_ctlcluster "${PG_VER}" main start 2>/dev/null || sudo service postgresql start || true
for _ in $(seq 1 30); do sudo -u postgres pg_isready -q && break; sleep 1; done

log "Starting Redis..."
sudo service redis-server start 2>/dev/null || true

log "Ensuring database role + database exist..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dating') THEN
    CREATE ROLE dating LOGIN PASSWORD 'dating';
  END IF;
END $$;
SQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='dating'" | grep -q 1 \
  || sudo -u postgres createdb -O dating dating
sudo -u postgres psql -d dating -c "GRANT ALL ON SCHEMA public TO dating;" >/dev/null

log "Writing dating-api/.env (if absent)..."
if [ ! -f dating-api/.env ]; then
  cat > dating-api/.env <<ENV
DATABASE_URL="postgresql://dating:dating@127.0.0.1:5432/dating?schema=public&connection_limit=10&pool_timeout=10"
PORT=3001
NODE_ENV=development
SESSION_COOKIE_NAME=dating_session
SESSION_SECRET_PEPPER=local-dev-pepper-please-change-0123456789abcdef
SESSION_TTL_DAYS=14
COOKIE_SECURE=false
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
CORS_CREDENTIALS=true
REDIS_URL=redis://127.0.0.1:6379
EMAIL_PROVIDER=disabled
PUSH_PROVIDER=disabled
PHOTO_STORAGE_DRIVER=local
PHOTO_UPLOAD_DIR=uploads/profile-photos
PHOTO_MODERATION_DRIVER=mock
CONTENT_MODERATION_ENABLED=false
# Set a real Google OAuth Web client ID (or add GOOGLE_CLIENT_ID as an env secret) to enable Google Sign-In.
GOOGLE_CLIENT_ID=
# Placeholder so the API boots; add a real OPENAI_API_KEY env secret for profile analysis / matching.
OPENAI_API_KEY=${OPENAI_API_KEY:-sk-local-dev-placeholder}
ENV
fi

log "Writing dating-ui/.env.local (if absent)..."
if [ ! -f dating-ui/.env.local ]; then
  cat > dating-ui/.env.local <<'ENV'
# Same Web OAuth client ID as GOOGLE_CLIENT_ID in dating-api/.env (set to enable Google Sign-In).
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
# Leave API URL unset so the UI uses the same-origin /api proxy (see next.config.ts).
ENV
fi

log "Installing node dependencies (root, API, UI)..."
npm ci
npm ci --prefix dating-api
npm ci --prefix dating-ui

log "Generating Prisma client and syncing schema (prisma db push)..."
# Note: the historical migration chain does not replay cleanly on an empty DB
# (see 20260415000001_profile_submit_lifecycle). db push syncs the dev DB directly
# from prisma/schema.prisma, which is the reliable path for a fresh dev database.
( cd dating-api && npx prisma generate && npx prisma db push --skip-generate )

log "Done."
