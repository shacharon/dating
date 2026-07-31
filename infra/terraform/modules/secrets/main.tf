locals {
  param_prefix  = "/dating/${var.environment}/api"
  secret_prefix = "dating/${var.environment}/api"
  ui_prefix     = "/dating/${var.environment}/ui"

  # Non-secret API config → SSM Parameter Store (String)
  # PHOTO_MODERATION_AUTO_APPROVE is intentionally ABSENT (must stay unset in cloud).
  api_config = {
    PORT                           = var.port
    NODE_ENV                       = var.node_env
    REDIS_URL                      = var.redis_url
    GOOGLE_CLIENT_ID               = var.google_client_id
    SESSION_COOKIE_NAME            = var.session_cookie_name
    SESSION_TTL_DAYS               = var.session_ttl_days
    COOKIE_SECURE                  = var.cookie_secure
    CORS_ORIGIN                    = var.cors_origin
    CORS_CREDENTIALS               = var.cors_credentials
    PHOTO_STORAGE_DRIVER           = var.photo_storage_driver
    PHOTO_S3_BUCKET                = var.photo_s3_bucket
    PHOTO_S3_REGION                = var.photo_s3_region
    PHOTO_S3_PREFIX                = var.photo_s3_prefix
    PHOTO_MODERATION_DRIVER        = var.photo_moderation_driver
    PHOTO_FACE_DETECTION_ENABLED   = var.photo_face_detection_enabled
    NSFW_FLAG_THRESHOLD            = var.nsfw_flag_threshold
    NSFW_AUTO_REJECT_THRESHOLD     = var.nsfw_auto_reject_threshold
    STRUCTURED_LOG_FILE            = var.structured_log_file
    ADMIN_USER_IDS                 = var.admin_user_ids
    PHOTO_CDN_ENABLED              = var.photo_cdn_enabled
    PHOTO_CDN_DOMAIN               = var.photo_cdn_domain
    PHOTO_CDN_KEY_PAIR_ID          = var.photo_cdn_key_pair_id
    PHOTO_CDN_URL_TTL_SECONDS      = var.photo_cdn_url_ttl_seconds
    EMAIL_PROVIDER                 = var.email_provider
    EMAIL_FROM                     = var.email_from
    APP_PUBLIC_URL                 = var.app_public_url
    EMAIL_MESSAGE_DEBOUNCE_MINUTES = var.email_message_debounce_minutes
    SENTRY_ENVIRONMENT             = var.sentry_environment
    SENTRY_TRACES_SAMPLE_RATE      = var.sentry_traces_sample_rate
    DD_TRACE_ENABLED               = var.dd_trace_enabled
    DD_ENV                         = var.dd_env
    DD_SERVICE                     = var.dd_service
    PRODUCT_ANALYTICS_ENABLED      = var.product_analytics_enabled
    REPORT_OPS_EMAIL               = var.report_ops_email
  }

  # Optional COOKIE_DOMAIN — only publish when non-empty so host-only cookies work when unset
  cookie_domain_map = var.cookie_domain != "" ? { COOKIE_DOMAIN = var.cookie_domain } : {}

  api_config_all = merge(local.api_config, local.cookie_domain_map)

  # Secrets Manager shells (values set out-of-band or via optional TF_VAR_*)
  # DATABASE_URL comes from Story 02 RDS secret when database_url_secret_arn is set.
  operator_secret_names = {
    OPENAI_API_KEY              = "OPENAI_API_KEY"
    RESEND_API_KEY              = "RESEND_API_KEY"
    PHOTO_CDN_PRIVATE_KEY       = "PHOTO_CDN_PRIVATE_KEY"
    SENTRY_DSN                  = "SENTRY_DSN"
    DD_API_KEY                  = "DD_API_KEY"
    PRODUCT_ANALYTICS_HASH_SALT = "PRODUCT_ANALYTICS_HASH_SALT"
  }

  operator_secret_values = {
    OPENAI_API_KEY              = var.openai_api_key
    RESEND_API_KEY              = var.resend_api_key
    PHOTO_CDN_PRIVATE_KEY       = var.photo_cdn_private_key
    SENTRY_DSN                  = var.sentry_dsn
    DD_API_KEY                  = var.dd_api_key
    PRODUCT_ANALYTICS_HASH_SALT = "" # always set via CLI; never via tfvars in git
  }

  ui_build_params = {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID    = var.ui_next_public_google_client_id != "" ? var.ui_next_public_google_client_id : var.google_client_id
    NEXT_PUBLIC_API_URL             = var.ui_next_public_api_url
    NEXT_PUBLIC_REALTIME            = var.ui_next_public_realtime
    NEXT_PUBLIC_ADMIN_ENABLED       = var.ui_next_public_admin_enabled
    NEXT_PUBLIC_SESSION_COOKIE_NAME = var.ui_next_public_session_cookie_name
    NEXT_PUBLIC_SENTRY_DSN          = var.ui_next_public_sentry_dsn
    NEXT_PUBLIC_SENTRY_ENVIRONMENT  = var.ui_next_public_sentry_environment
    API_PROXY_TARGET                = var.ui_api_proxy_target
    INTERNAL_API_URL                = var.ui_internal_api_url
  }
}

# =============================================================================
# SSM Parameter Store — plain config (String)
# =============================================================================

resource "aws_ssm_parameter" "api_config" {
  for_each = local.api_config_all

  name        = "${local.param_prefix}/${each.key}"
  description = "dating-api ${each.key} (${var.environment})"
  type        = "String"
  value       = each.value
  overwrite   = true

  tags = merge(var.tags, {
    Name      = "${var.name_prefix}-ssm-${each.key}"
    App       = "dating-api"
    ConfigKey = each.key
  })
}

# =============================================================================
# Secrets Manager — app secrets (shells; versions optional / generated)
# =============================================================================

resource "aws_secretsmanager_secret" "operator" {
  for_each = local.operator_secret_names

  name_prefix             = "${local.secret_prefix}/${each.key}-"
  description             = "dating-api ${each.key} (${var.environment}) — set value via CLI; never commit"
  recovery_window_in_days = var.secret_recovery_window_days

  tags = merge(var.tags, {
    Name      = "${var.name_prefix}-secret-${each.key}"
    App       = "dating-api"
    SecretKey = each.key
  })
}

resource "aws_secretsmanager_secret_version" "operator" {
  # Keys only — values are sensitive and must not appear in for_each.
  for_each = toset(nonsensitive([
    for k, v in local.operator_secret_values : k
    if v != ""
  ]))

  secret_id     = aws_secretsmanager_secret.operator[each.key].id
  secret_string = local.operator_secret_values[each.key]
}

resource "random_password" "session_pepper" {
  count = var.generate_session_pepper ? 1 : 0

  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "session_pepper" {
  name_prefix             = "${local.secret_prefix}/SESSION_SECRET_PEPPER-"
  description             = "dating-api SESSION_SECRET_PEPPER (${var.environment})"
  recovery_window_in_days = var.secret_recovery_window_days

  tags = merge(var.tags, {
    Name      = "${var.name_prefix}-secret-SESSION_SECRET_PEPPER"
    App       = "dating-api"
    SecretKey = "SESSION_SECRET_PEPPER"
  })
}

resource "aws_secretsmanager_secret_version" "session_pepper" {
  count = var.generate_session_pepper ? 1 : 0

  secret_id     = aws_secretsmanager_secret.session_pepper.id
  secret_string = random_password.session_pepper[0].result
}

resource "random_password" "email_unsubscribe" {
  count = var.generate_email_unsubscribe_secret ? 1 : 0

  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "email_unsubscribe" {
  name_prefix             = "${local.secret_prefix}/EMAIL_UNSUBSCRIBE_SECRET-"
  description             = "dating-api EMAIL_UNSUBSCRIBE_SECRET (${var.environment})"
  recovery_window_in_days = var.secret_recovery_window_days

  tags = merge(var.tags, {
    Name      = "${var.name_prefix}-secret-EMAIL_UNSUBSCRIBE_SECRET"
    App       = "dating-api"
    SecretKey = "EMAIL_UNSUBSCRIBE_SECRET"
  })
}

resource "aws_secretsmanager_secret_version" "email_unsubscribe" {
  count = var.generate_email_unsubscribe_secret ? 1 : 0

  secret_id     = aws_secretsmanager_secret.email_unsubscribe.id
  secret_string = random_password.email_unsubscribe[0].result
}

# Optional fallback DATABASE_URL secret when Story 02 RDS ARN is not wired yet.
# Prefer database_url_secret_arn (JSON key database_url) from modules/rds.
resource "aws_secretsmanager_secret" "database_url_fallback" {
  count = var.database_url_secret_arn == null ? 1 : 0

  name_prefix             = "${local.secret_prefix}/DATABASE_URL-"
  description             = "dating-api DATABASE_URL fallback (${var.environment}) — prefer Story 02 RDS secret"
  recovery_window_in_days = var.secret_recovery_window_days

  tags = merge(var.tags, {
    Name      = "${var.name_prefix}-secret-DATABASE_URL"
    App       = "dating-api"
    SecretKey = "DATABASE_URL"
  })
}

# =============================================================================
# UI build-time params (Story 04) — SSM only; NOT injected into ECS task def
# =============================================================================

resource "aws_ssm_parameter" "ui_build" {
  for_each = var.create_ui_build_params ? local.ui_build_params : {}

  name        = "${local.ui_prefix}/build/${each.key}"
  description = "dating-ui build-arg ${each.key} (${var.environment}) — changing NEXT_PUBLIC_* requires image rebuild"
  type        = "String"
  value       = each.value
  overwrite   = true

  tags = merge(var.tags, {
    Name      = "${var.name_prefix}-ui-build-${each.key}"
    App       = "dating-ui"
    BakeTime  = "build"
    ConfigKey = each.key
  })
}
