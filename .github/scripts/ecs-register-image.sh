#!/usr/bin/env bash
# Register a new ECS task definition revision with an updated container image.
# Prints the new taskDefinitionArn on stdout (last line).
#
# Usage:
#   ./ecs-register-image.sh <task-family> <container-name> <image-uri>
set -euo pipefail

FAMILY="${1:?task family required}"
CONTAINER="${2:?container name required}"
IMAGE="${3:?image URI required}"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

aws ecs describe-task-definition \
  --task-definition "$FAMILY" \
  --query taskDefinition \
  --output json \
| jq --arg IMAGE "$IMAGE" --arg NAME "$CONTAINER" '
  .containerDefinitions |= map(if .name == $NAME then .image = $IMAGE else . end)
  | del(
      .taskDefinitionArn,
      .revision,
      .status,
      .requiresAttributes,
      .compatibilities,
      .registeredAt,
      .registeredBy,
      .deregisteredAt
    )
' > "$TMP"

NEW_ARN="$(aws ecs register-task-definition \
  --cli-input-json "file://${TMP}" \
  --query taskDefinition.taskDefinitionArn \
  --output text)"

echo "Registered ${NEW_ARN}" >&2
echo "$NEW_ARN"
