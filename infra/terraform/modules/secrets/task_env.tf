# ECS task-definition env mappings for Story 02 / 04 to plug into
# aws_ecs_task_definition container_definitions.

locals {
  # Plain environment (values resolved at plan/apply from SSM-managed config).
  # Prefer referencing SSM at deploy time via secrets{} for mutable config, OR
  # inline these static cloud defaults. We expose BOTH:
  #   - ecs_environment: literal name/value for simple wiring
  #   - ecs_secrets_from_ssm: valueFrom = SSM ARN (preferred — single source of truth)

  ecs_environment = [
    for k, v in local.api_config_all : {
      name  = k
      value = v
    }
  ]

  ecs_secrets_from_ssm = [
    for k, p in aws_ssm_parameter.api_config : {
      name      = k
      valueFrom = p.arn
    }
  ]

  # Secrets Manager injections
  database_url_value_from = (
    var.database_url_secret_arn != null
    ? "${var.database_url_secret_arn}:database_url::"
    : aws_secretsmanager_secret.database_url_fallback[0].arn
  )

  # Required + always-generated secrets (shells must have a version before first deploy:
  # OPENAI via CLI; SESSION / EMAIL_UNSUBSCRIBE auto-generated when enabled).
  ecs_secrets_required = concat(
    [
      {
        name      = "DATABASE_URL"
        valueFrom = local.database_url_value_from
      },
      {
        name      = "OPENAI_API_KEY"
        valueFrom = aws_secretsmanager_secret.operator["OPENAI_API_KEY"].arn
      },
      {
        name      = "SESSION_SECRET_PEPPER"
        valueFrom = aws_secretsmanager_secret.session_pepper.arn
      },
    ],
    var.generate_email_unsubscribe_secret || var.inject_email_unsubscribe_secret ? [
      {
        name      = "EMAIL_UNSUBSCRIBE_SECRET"
        valueFrom = aws_secretsmanager_secret.email_unsubscribe.arn
      }
    ] : []
  )

  # Optional secrets — only inject when enabled so empty shells don't crash ECS pulls
  ecs_secrets_optional = concat(
    var.inject_resend_api_key || var.resend_api_key != "" ? [
      { name = "RESEND_API_KEY", valueFrom = aws_secretsmanager_secret.operator["RESEND_API_KEY"].arn }
    ] : [],
    var.inject_photo_cdn_private_key || var.photo_cdn_private_key != "" ? [
      { name = "PHOTO_CDN_PRIVATE_KEY", valueFrom = aws_secretsmanager_secret.operator["PHOTO_CDN_PRIVATE_KEY"].arn }
    ] : [],
    var.inject_sentry_dsn || var.sentry_dsn != "" ? [
      { name = "SENTRY_DSN", valueFrom = aws_secretsmanager_secret.operator["SENTRY_DSN"].arn }
    ] : [],
    var.inject_dd_api_key || var.dd_api_key != "" ? [
      { name = "DD_API_KEY", valueFrom = aws_secretsmanager_secret.operator["DD_API_KEY"].arn }
    ] : [],
    var.inject_product_analytics_hash_salt ? [
      { name = "PRODUCT_ANALYTICS_HASH_SALT", valueFrom = aws_secretsmanager_secret.operator["PRODUCT_ANALYTICS_HASH_SALT"].arn }
    ] : []
  )

  ecs_secrets_from_secretsmanager = concat(
    local.ecs_secrets_required,
    local.ecs_secrets_optional,
  )

  # Full secrets block for the API container (SSM params + Secrets Manager).
  # WARNING: do not also set the same keys in container environment[].
  # Story 02 ECS module already inlines many cloud defaults in environment —
  # prefer ecs_secrets_from_secretsmanager_only there to avoid duplicate keys.
  ecs_api_secrets = concat(
    local.ecs_secrets_from_ssm,
    local.ecs_secrets_from_secretsmanager,
  )

  # All secret/param ARNs the execution role must be allowed to read
  ssm_parameter_arns = [for p in aws_ssm_parameter.api_config : p.arn]

  secretsmanager_arns = compact(concat(
    [aws_secretsmanager_secret.session_pepper.arn],
    [aws_secretsmanager_secret.email_unsubscribe.arn],
    [for s in aws_secretsmanager_secret.operator : s.arn],
    var.database_url_secret_arn != null ? [var.database_url_secret_arn] : [aws_secretsmanager_secret.database_url_fallback[0].arn],
  ))
}
