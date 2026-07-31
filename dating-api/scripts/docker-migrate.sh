#!/bin/sh
# One-shot Prisma migration entrypoint for containers / ECS run-task.
# Kept SEPARATE from the API process start command (see Dockerfile CMD).
# Usage: docker compose run --rm migrate
#    or: docker run --rm -e DATABASE_URL=... dating-api ./scripts/docker-migrate.sh
set -eu

cd "$(dirname "$0")/.."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is required for prisma migrate deploy" >&2
  exit 1
fi

echo "Running prisma migrate deploy..."
exec npx prisma migrate deploy
