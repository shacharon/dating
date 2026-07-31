# Sprint 20 Story 03 — SSM / Secrets Manager + ECS secret mappings.
# Consumes Story 02 module outputs (RDS, Redis, S3, CloudFront, IAM).
#
# Do NOT put real secret values in git. Set OPENAI_API_KEY (and optional keys) via:
#   aws secretsmanager put-secret-value …
#   or sensitive TF_VAR_* at apply time
#
# Non-secret review surface: infra/env/dev.tfvars.example + DEV_CONFIG_MANIFEST.md

locals {
  secrets_cors_origin = coalesce(
    var.cors_origin != "" ? var.cors_origin : null,
    local.cors_origin != "" ? local.cors_origin : null,
    "https://dev.REPLACE_WITH_DOMAIN.tld"
  )

  secrets_app_public_url = coalesce(
    var.app_public_url != "" ? var.app_public_url : null,
    var.domain_name != "" ? "https://${var.domain_name}" : null,
    local.secrets_cors_origin
  )

  secrets_ui_proxy = (
    var.ui_api_proxy_target != "" ? var.ui_api_proxy_target : (
      var.enable_service_discovery_for_secrets
      ? "http://dating-api.dating.internal:3001"
      : "http://${module.alb.alb_dns_name}"
    )
  )
}

module "secrets" {
  source = "../modules/secrets"

  name_prefix = local.name_prefix
  environment = var.environment
  tags        = local.common_tags

  database_url_secret_arn = module.rds.secrets_manager_secret_arn
  redis_url               = module.redis.redis_url
  photo_s3_bucket         = module.s3_photos.bucket_id
  photo_s3_region         = var.aws_region

  google_client_id = var.google_client_id
  cookie_secure    = "true"
  cookie_domain    = var.cookie_domain
  cors_origin      = local.secrets_cors_origin
  app_public_url   = local.secrets_app_public_url
  admin_user_ids   = var.admin_user_ids

  photo_storage_driver    = "s3"
  photo_moderation_driver = "rekognition"
  structured_log_file     = "0"
  node_env                = "production"

  photo_cdn_enabled     = var.enable_cloudfront ? "1" : "0"
  photo_cdn_domain      = var.enable_cloudfront ? module.cloudfront[0].domain_name : ""
  photo_cdn_key_pair_id = var.enable_cloudfront ? coalesce(module.cloudfront[0].key_pair_id, "") : ""

  # Inject CDN private key when CloudFront signing is on (value written below)
  inject_photo_cdn_private_key = var.enable_cloudfront

  create_ui_build_params       = true
  ui_next_public_realtime      = "ws"
  ui_next_public_admin_enabled = var.ui_next_public_admin_enabled
  ui_api_proxy_target          = local.secrets_ui_proxy
  ui_internal_api_url          = coalesce(var.ui_internal_api_url != "" ? var.ui_internal_api_url : null, local.secrets_ui_proxy)

  depends_on = [
    module.rds,
    module.redis,
    module.s3_photos,
  ]
}

# Preserve \n escapes as a single-line secret (app expects escaped newlines).
resource "aws_secretsmanager_secret_version" "photo_cdn_private_key" {
  count = var.enable_cloudfront ? 1 : 0

  secret_id = module.secrets.secret_arns["PHOTO_CDN_PRIVATE_KEY"]
  secret_string = replace(
    module.cloudfront[0].signing_private_key_pem,
    "\n",
    "\\n"
  )
}

# Least-privilege read on exactly the params/secrets this module owns (+ RDS DATABASE_URL).
resource "aws_iam_role_policy_attachment" "ecs_execution_secrets" {
  role       = module.iam.execution_role_name
  policy_arn = module.secrets.execution_role_secrets_policy_arn
}
