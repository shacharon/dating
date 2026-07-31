#!/usr/bin/env bash
# One-shot Prisma migrate via ECS RunTask (fixes L6 — never migrate on every task start).
# Uses dating-api image + scripts/docker-migrate.sh from Story 01.
#
# Required env:
#   ECS_CLUSTER
#   ECS_MIGRATE_TASK_DEFINITION   — task def ARN/family:rev (usually newly registered API TD)
#   ECS_SUBNET_IDS                — comma-separated private subnets
#   ECS_SECURITY_GROUP_IDS        — comma-separated (API SG)
# Optional:
#   ECS_MIGRATE_CONTAINER         — default dating-api
#   ECS_ASSIGN_PUBLIC_IP          — ENABLED|DISABLED (default DISABLED)
#   MIGRATE_WAIT_SECONDS          — default 900
set -euo pipefail

CLUSTER="${ECS_CLUSTER:?}"
TASK_DEF="${ECS_MIGRATE_TASK_DEFINITION:?}"
SUBNETS="${ECS_SUBNET_IDS:?}"
SGS="${ECS_SECURITY_GROUP_IDS:?}"
CONTAINER="${ECS_MIGRATE_CONTAINER:-dating-api}"
PUBLIC_IP="${ECS_ASSIGN_PUBLIC_IP:-DISABLED}"
WAIT_SECS="${MIGRATE_WAIT_SECONDS:-900}"

NETWORK_CONFIG="$(jq -nc \
  --arg subnets "$SUBNETS" \
  --arg sgs "$SGS" \
  --arg publicIp "$PUBLIC_IP" \
  '{
     awsvpcConfiguration: {
       subnets: ($subnets | split(",")),
       securityGroups: ($sgs | split(",")),
       assignPublicIp: $publicIp
     }
   }')"

OVERRIDES="$(jq -nc \
  --arg name "$CONTAINER" \
  '{
     containerOverrides: [
       {
         name: $name,
         command: ["./scripts/docker-migrate.sh"]
       }
     ]
   }')"

echo "Starting migrate run-task on cluster=${CLUSTER} taskDef=${TASK_DEF}"

RUN_OUT="$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_DEF" \
  --launch-type FARGATE \
  --count 1 \
  --network-configuration "$NETWORK_CONFIG" \
  --overrides "$OVERRIDES" \
  --output json)"

FAILURES="$(echo "$RUN_OUT" | jq -r '.failures | length')"
if [ "$FAILURES" != "0" ]; then
  echo "ERROR: ecs run-task reported failures:" >&2
  echo "$RUN_OUT" | jq '.failures' >&2
  exit 1
fi

TASK_ARN="$(echo "$RUN_OUT" | jq -r '.tasks[0].taskArn')"
if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" = "null" ]; then
  echo "ERROR: no task ARN from run-task" >&2
  echo "$RUN_OUT" >&2
  exit 1
fi

echo "Migrate task: $TASK_ARN"
echo "Waiting up to ${WAIT_SECS}s for STOPPED..."

DEADLINE=$((SECONDS + WAIT_SECS))
while true; do
  DESC="$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" --output json)"
  LAST="$(echo "$DESC" | jq -r '.tasks[0].lastStatus')"
  if [ "$LAST" = "STOPPED" ]; then
    break
  fi
  if [ "$SECONDS" -ge "$DEADLINE" ]; then
    echo "ERROR: migrate task timed out in status=${LAST}" >&2
    exit 1
  fi
  sleep 10
done

EXIT_CODE="$(echo "$DESC" | jq -r \
  --arg name "$CONTAINER" \
  '.tasks[0].containers[] | select(.name == $name) | .exitCode // "missing"')"
STOP_REASON="$(echo "$DESC" | jq -r '.tasks[0].stoppedReason // empty')"

echo "Migrate container exitCode=${EXIT_CODE} stoppedReason=${STOP_REASON}"

if [ "$EXIT_CODE" != "0" ]; then
  echo "ERROR: prisma migrate deploy failed — blocking deploy (L6 gate)." >&2
  exit 1
fi

echo "Migrate succeeded."
