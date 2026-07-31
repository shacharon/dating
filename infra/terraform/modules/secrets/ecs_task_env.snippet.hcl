# Example container_definitions fragment for Story 02 ECS task definition.
# Prefer module outputs over copy-paste:
#   secrets     = module.secrets.ecs_api_secrets
#   # OR
#   environment = module.secrets.ecs_environment
#   secrets     = module.secrets.ecs_secrets_from_secretsmanager_only
#
# Attach IAM:
#   aws_iam_role_policy_attachment.ecs_exec_secrets = {
#     role       = aws_iam_role.ecs_execution.name
#     policy_arn = module.secrets.execution_role_secrets_policy_arn
#   }

# --- Recommended (all config via secrets: SSM String + Secrets Manager) ---
#
# container_definitions = jsonencode([{
#   name      = "dating-api"
#   image     = "${module.ecr.api_repository_url}:latest"
#   essential = true
#   portMappings = [{ containerPort = 3001, protocol = "tcp" }]
#   secrets   = module.secrets.ecs_api_secrets
#   # Do NOT set PHOTO_MODERATION_AUTO_APPROVE
#   # Do NOT set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (use task role)
#   logConfiguration = { ... }
# }])

# --- Alternative (inline non-secret env + Secrets Manager only) ---
#
# environment = module.secrets.ecs_environment
# secrets     = module.secrets.ecs_secrets_from_secretsmanager_only
