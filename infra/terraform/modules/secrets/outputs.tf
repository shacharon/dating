output "ssm_parameter_arns" {
  description = "Map of env var name → SSM parameter ARN"
  value       = { for k, p in aws_ssm_parameter.api_config : k => p.arn }
}

output "ssm_parameter_names" {
  description = "Map of env var name → SSM parameter name"
  value       = { for k, p in aws_ssm_parameter.api_config : k => p.name }
}

output "secret_arns" {
  description = "Map of secret env var name → Secrets Manager ARN (excludes DATABASE_URL when using RDS secret)"
  value = merge(
    { for k, s in aws_secretsmanager_secret.operator : k => s.arn },
    {
      SESSION_SECRET_PEPPER    = aws_secretsmanager_secret.session_pepper.arn
      EMAIL_UNSUBSCRIBE_SECRET = aws_secretsmanager_secret.email_unsubscribe.arn
    },
    var.database_url_secret_arn == null ? {
      DATABASE_URL = aws_secretsmanager_secret.database_url_fallback[0].arn
    } : {}
  )
}

output "database_url_value_from" {
  description = "ECS secrets valueFrom for DATABASE_URL (RDS JSON key or fallback ARN)"
  value       = local.database_url_value_from
}

output "ecs_environment" {
  description = "Literal environment[] block (alternative to SSM injection for static config)"
  value       = local.ecs_environment
  sensitive   = false
}

output "ecs_api_secrets" {
  description = "Recommended secrets[] for API container_definitions (SSM + Secrets Manager)"
  value       = local.ecs_api_secrets
}

output "ecs_secrets_from_secretsmanager_only" {
  description = "Secrets Manager entries only — pair with ecs_environment for plain config"
  value       = local.ecs_secrets_from_secretsmanager
}

output "execution_role_secrets_policy_arn" {
  description = "IAM policy ARN to attach to the ECS task execution role"
  value       = aws_iam_policy.ecs_execution_secrets_read.arn
}

output "execution_role_secrets_policy_json" {
  description = "Raw IAM policy JSON (if Story 02 prefers inline policy)"
  value       = data.aws_iam_policy_document.ecs_execution_secrets_read.json
}

output "ui_build_parameter_arns" {
  description = "SSM ARNs for UI build args (Story 04 CI) — not for ECS task def"
  value       = { for k, p in aws_ssm_parameter.ui_build : k => p.arn }
}

output "ui_build_parameter_names" {
  description = "SSM names for UI build args"
  value       = { for k, p in aws_ssm_parameter.ui_build : k => p.name }
}

output "param_prefix" {
  description = "SSM path prefix for API config"
  value       = local.param_prefix
}

output "unset_in_cloud" {
  description = "Env vars that must NOT be set in cloud task defs / SSM"
  value       = ["PHOTO_MODERATION_AUTO_APPROVE", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
}
