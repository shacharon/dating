#!/usr/bin/env bash
# Cloud Agent start: bring up per-boot services (PostgreSQL, Redis) idempotently.
set -euo pipefail

log() { printf '[start] %s\n' "$*"; }

PG_VER="$(ls /usr/lib/postgresql 2>/dev/null | sort -n | tail -1)"

log "Starting PostgreSQL (cluster ${PG_VER})..."
sudo pg_ctlcluster "${PG_VER}" main start 2>/dev/null || sudo service postgresql start || true
for _ in $(seq 1 30); do sudo -u postgres pg_isready -q && break; sleep 1; done

log "Starting Redis..."
sudo service redis-server start 2>/dev/null || true

# Self-heal: ensure the app role + database exist even if disk state was reset.
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL' >/dev/null 2>&1 || true
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dating') THEN
    CREATE ROLE dating LOGIN PASSWORD 'dating';
  END IF;
END $$;
SQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='dating'" | grep -q 1 \
  || sudo -u postgres createdb -O dating dating

log "Services ready (PostgreSQL:5432, Redis:6379)."
