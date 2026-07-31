# Paste into infra/terraform/dev/main.tf → module "ecs" { ... }
# (Story 03). Prefer Secrets Manager-only mapping so keys already in the ECS
# module environment block are not duplicated.
#
# Full live wiring may already be present in main.tf when Stories 02+03 run
# in the same working tree.

# api_secrets = length(var.api_secrets) > 0 ? var.api_secrets : module.secrets.ecs_secrets_from_secretsmanager_only
# ui_secrets  = var.ui_secrets
# api_extra_environment = merge(
#   {
#     GOOGLE_CLIENT_ID            = var.google_client_id
#     SESSION_COOKIE_NAME         = "dating_session"
#     SESSION_TTL_DAYS            = "14"
#     NSFW_FLAG_THRESHOLD         = "50"
#     NSFW_AUTO_REJECT_THRESHOLD  = "80"
#     ADMIN_USER_IDS              = var.admin_user_ids
#     SENTRY_ENVIRONMENT          = var.environment
#     SENTRY_TRACES_SAMPLE_RATE   = "0.1"
#     DD_TRACE_ENABLED            = "0"
#     DD_ENV                      = var.environment
#     DD_SERVICE                  = "dating-api"
#     PRODUCT_ANALYTICS_ENABLED   = "true"
#     EMAIL_PROVIDER              = "disabled"
#     APP_PUBLIC_URL = coalesce(
#       var.app_public_url != "" ? var.app_public_url : null,
#       local.cors_origin != "" ? local.cors_origin : "https://dev.REPLACE_WITH_DOMAIN.tld"
#     )
#   },
#   var.cookie_domain != "" ? { COOKIE_DOMAIN = var.cookie_domain } : {},
#   var.enable_cloudfront ? {
#     PHOTO_CDN_KEY_PAIR_ID     = coalesce(module.cloudfront[0].key_pair_id, "")
#     PHOTO_CDN_URL_TTL_SECONDS = "3600"
#   } : {}
# )
# depends_on = [aws_iam_role_policy_attachment.ecs_execution_secrets]
