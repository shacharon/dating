# Sprint 20 Story 03 — secrets / config wiring (wired to Story 02 data plane).
# Do NOT put real secret values here. Use TF_VAR_* / CI / AWS CLI for operator secrets.

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
  cors_origin      = local.cors_origin != "" ? local.cors_origin : var.cors_origin
  app_public_url   = var.app_public_url != "" ? var.app_public_url : local.cors_origin
  admin_user_ids   = var.admin_user_ids

  photo_storage_driver    = "s3"
  photo_moderation_driver = "rekognition"
  structured_log_file     = "0"
  node_env                = "production"

  photo_cdn_enabled     = var.enable_cloudfront ? "1" : "0"
  photo_cdn_domain      = var.enable_cloudfront ? module.cloudfront[0].domain_name : ""
  photo_cdn_key_pair_id = var.enable_cloudfront ? coalesce(module.cloudfront[0].key_pair_id, "") : ""

  create_ui_build_params       = true
  ui_next_public_realtime      = "ws"
  ui_next_public_admin_enabled = var.ui_next_public_admin_enabled
  ui_api_proxy_target = coalesce(
    var.ui_api_proxy_target != "" ? var.ui_api_proxy_target : null,
    "http://dating-api.internal:3001"
  )
  ui_internal_api_url = coalesce(
    var.ui_internal_api_url != "" ? var.ui_internal_api_url : null,
    "http://dating-api.internal:3001"
  )
}

resource "aws_iam_role_policy_attachment" "ecs_execution_secrets" {
  role       = module.iam.execution_role_name
  policy_arn = module.secrets.execution_role_secrets_policy_arn
}
