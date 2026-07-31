#!/usr/bin/env bash
# Rolling update an ECS service to a task definition ARN and wait for steady state.
#
# Usage:
#   ECS_CLUSTER=... ECS_SERVICE=... TASK_DEFINITION_ARN=... ./ecs-update-service.sh
set -euo pipefail

CLUSTER="${ECS_CLUSTER:?}"
SERVICE="${ECS_SERVICE:?}"
TASK_DEF="${TASK_DEFINITION_ARN:?}"

echo "Updating service ${SERVICE} on ${CLUSTER} → ${TASK_DEF}"

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --task-definition "$TASK_DEF" \
  --force-new-deployment \
  >/dev/null

echo "Waiting for services-stable..."
aws ecs wait services-stable \
  --cluster "$CLUSTER" \
  --services "$SERVICE"

echo "Service ${SERVICE} is stable."
