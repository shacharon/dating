# Story 03 outputs — Story 04 CI and operators consume these.

output "secrets_execution_role_policy_arn" {
  description = "Attached to ECS task execution role for SSM + Secrets Manager reads"
  value       = module.secrets.execution_role_secrets_policy_arn
}

output "secrets_ecs_api_secrets" {
  description = "Full API secrets[] (SSM + Secrets Manager) — use only if ECS env does not duplicate keys"
  value       = module.secrets.ecs_api_secrets
}

output "secrets_ecs_secretsmanager_only" {
  description = "API secrets[] for Secrets Manager only (preferred with Story 02 ECS environment block)"
  value       = module.secrets.ecs_secrets_from_secretsmanager_only
}

output "secrets_database_url_value_from" {
  description = "DATABASE_URL ECS valueFrom"
  value       = module.secrets.database_url_value_from
}

output "secrets_ssm_parameter_names" {
  description = "API SSM parameter names (reviewable config surface)"
  value       = module.secrets.ssm_parameter_names
}

output "secrets_secret_arns" {
  description = "App secret ARNs (no secret values)"
  value       = module.secrets.secret_arns
}

output "secrets_ui_build_parameter_names" {
  description = "SSM names for UI Docker build-args (Story 04) — NEXT_PUBLIC_* require image rebuild"
  value       = module.secrets.ui_build_parameter_names
}

output "secrets_unset_in_cloud" {
  description = "Must not appear in task def / SSM"
  value       = module.secrets.unset_in_cloud
}
