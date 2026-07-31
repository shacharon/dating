locals {
  name_prefix = "${var.project}-${var.environment}"

  common_tags = merge(
    {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Sprint      = "20"
    },
    var.additional_tags
  )

  cors_origin = var.cors_origin != "" ? var.cors_origin : (
    var.domain_name != "" ? "https://${var.domain_name}" : ""
  )
}

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------

module "networking" {
  source = "../modules/networking"

  name_prefix        = local.name_prefix
  vpc_cidr           = var.vpc_cidr
  az_count           = var.az_count
  single_nat_gateway = var.single_nat_gateway
  tags               = local.common_tags
}

module "security_groups" {
  source = "../modules/security_groups"

  name_prefix = local.name_prefix
  vpc_id      = module.networking.vpc_id
  tags        = local.common_tags
}

module "vpc_endpoints" {
  count  = var.enable_vpc_endpoints ? 1 : 0
  source = "../modules/vpc_endpoints"

  name_prefix             = local.name_prefix
  aws_region              = var.aws_region
  vpc_id                  = module.networking.vpc_id
  vpc_cidr                = module.networking.vpc_cidr
  private_subnet_ids      = module.networking.private_subnet_ids
  private_route_table_ids = module.networking.private_route_table_ids
  tags                    = local.common_tags
}

# ---------------------------------------------------------------------------
# Data stores + object storage
# ---------------------------------------------------------------------------

module "rds" {
  source = "../modules/rds"

  name_prefix         = local.name_prefix
  private_subnet_ids  = module.networking.private_subnet_ids
  security_group_id   = module.security_groups.rds_security_group_id
  instance_class      = var.rds_instance_class
  deletion_protection = false
  skip_final_snapshot = true
  tags                = local.common_tags
}

module "redis" {
  source = "../modules/redis"

  name_prefix                = local.name_prefix
  private_subnet_ids         = module.networking.private_subnet_ids
  security_group_id          = module.security_groups.redis_security_group_id
  node_type                  = var.redis_node_type
  transit_encryption_enabled = var.redis_transit_encryption
  tags                       = local.common_tags
}

module "s3_photos" {
  source = "../modules/s3_photos"

  name_prefix   = local.name_prefix
  bucket_prefix = "${local.name_prefix}-photos-"
  force_destroy = true
  tags          = local.common_tags
}

module "cloudfront" {
  count  = var.enable_cloudfront ? 1 : 0
  source = "../modules/cloudfront"

  name_prefix                 = local.name_prefix
  bucket_id                   = module.s3_photos.bucket_id
  bucket_arn                  = module.s3_photos.bucket_arn
  bucket_regional_domain_name = module.s3_photos.bucket_regional_domain_name
  create_signing_key          = true
  tags                        = local.common_tags
}

# ---------------------------------------------------------------------------
# IAM + ECR
# ---------------------------------------------------------------------------

module "iam" {
  source = "../modules/iam"

  name_prefix               = local.name_prefix
  photo_bucket_arn          = module.s3_photos.bucket_arn
  secrets_arns              = [module.rds.secrets_manager_secret_arn]
  ssm_parameter_path_prefix = "${var.project}/${var.environment}"
  tags                      = local.common_tags
}

module "ecr" {
  source = "../modules/ecr"

  repository_names = ["dating-api", "dating-ui"]
  force_delete     = true
  tags             = local.common_tags
}

# ---------------------------------------------------------------------------
# ALB + ECS
# ---------------------------------------------------------------------------

module "alb" {
  source = "../modules/alb"

  name_prefix                = local.name_prefix
  vpc_id                     = module.networking.vpc_id
  public_subnet_ids          = module.networking.public_subnet_ids
  security_group_id          = module.security_groups.alb_security_group_id
  acm_certificate_arn        = var.acm_certificate_arn
  domain_name                = var.domain_name
  route53_zone_id            = var.route53_zone_id
  enable_deletion_protection = false
  tags                       = local.common_tags
}

module "ecs" {
  source = "../modules/ecs"

  name_prefix           = local.name_prefix
  aws_region            = var.aws_region
  vpc_id                = module.networking.vpc_id
  private_subnet_ids    = module.networking.private_subnet_ids
  api_security_group_id = module.security_groups.api_security_group_id
  ui_security_group_id  = module.security_groups.ui_security_group_id
  api_target_group_arn  = module.alb.api_target_group_arn
  ui_target_group_arn   = module.alb.ui_target_group_arn
  execution_role_arn    = module.iam.execution_role_arn
  task_role_arn         = module.iam.task_role_arn
  api_repository_url    = module.ecr.dating_api_repository_url
  ui_repository_url     = module.ecr.dating_ui_repository_url
  api_image_tag         = var.api_image_tag
  ui_image_tag          = var.ui_image_tag
  api_desired_count     = var.api_desired_count
  api_min_count         = var.api_min_count
  api_max_count         = var.api_max_count
  ui_desired_count      = var.ui_desired_count
  photo_bucket_name     = module.s3_photos.bucket_id
  redis_url             = module.redis.redis_url
  cors_origin           = local.cors_origin
  photo_cdn_domain      = var.enable_cloudfront ? module.cloudfront[0].domain_name : ""
  alb_dns_name          = module.alb.alb_dns_name
  # Story 03: Secrets Manager only — ECS module already sets plain cloud env (avoid duplicate keys)
  api_secrets = length(var.api_secrets) > 0 ? var.api_secrets : module.secrets.ecs_secrets_from_secretsmanager_only
  ui_secrets  = var.ui_secrets
  api_extra_environment = merge(
    {
      GOOGLE_CLIENT_ID           = var.google_client_id
      SESSION_COOKIE_NAME        = "dating_session"
      SESSION_TTL_DAYS           = "14"
      NSFW_FLAG_THRESHOLD        = "50"
      NSFW_AUTO_REJECT_THRESHOLD = "80"
      ADMIN_USER_IDS             = var.admin_user_ids
      SENTRY_ENVIRONMENT         = var.environment
      SENTRY_TRACES_SAMPLE_RATE  = "0.1"
      DD_TRACE_ENABLED           = "0"
      DD_ENV                     = var.environment
      DD_SERVICE                 = "dating-api"
      PRODUCT_ANALYTICS_ENABLED  = "true"
      EMAIL_PROVIDER             = "disabled"
      APP_PUBLIC_URL = coalesce(
        var.app_public_url != "" ? var.app_public_url : null,
        local.cors_origin != "" ? local.cors_origin : "https://dev.REPLACE_WITH_DOMAIN.tld"
      )
    },
    var.cookie_domain != "" ? { COOKIE_DOMAIN = var.cookie_domain } : {},
    var.enable_cloudfront ? {
      PHOTO_CDN_KEY_PAIR_ID     = coalesce(module.cloudfront[0].key_pair_id, "")
      PHOTO_CDN_URL_TTL_SECONDS = "3600"
    } : {}
  )
  tags = local.common_tags

  depends_on = [aws_iam_role_policy_attachment.ecs_execution_secrets]
}
