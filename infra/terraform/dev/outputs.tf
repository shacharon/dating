# =============================================================================
# Outputs consumed by Stories 03 (secrets) and 04 (CI/CD)
# =============================================================================

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.alb_dns_name
}

output "app_url" {
  description = "Public app URL (HTTPS domain or http://ALB)"
  value = var.domain_name != "" ? (
    var.acm_certificate_arn != "" ? "https://${var.domain_name}" : "http://${var.domain_name}"
  ) : "http://${module.alb.alb_dns_name}"
}

output "rds_endpoint" {
  description = "RDS endpoint (host:port)"
  value       = module.rds.db_endpoint
}

output "rds_address" {
  description = "RDS hostname"
  value       = module.rds.db_address
}

output "rds_secrets_manager_arn" {
  description = "Secrets Manager ARN with username/password/database_url"
  value       = module.rds.secrets_manager_secret_arn
}

output "redis_endpoint" {
  description = "ElastiCache Redis hostname"
  value       = module.redis.primary_endpoint_address
}

output "redis_url" {
  description = "REDIS_URL (redis:// or rediss://)"
  value       = module.redis.redis_url
}

output "photo_bucket_name" {
  description = "Private photo S3 bucket name (PHOTO_S3_BUCKET)"
  value       = module.s3_photos.bucket_id
}

output "cloudfront_domain" {
  description = "CloudFront domain (PHOTO_CDN_DOMAIN); null if disabled"
  value       = try(module.cloudfront[0].domain_name, null)
}

output "cloudfront_key_pair_id" {
  description = "CloudFront key pair ID for signed URLs; null if CDN off"
  value       = try(module.cloudfront[0].key_pair_id, null)
}

output "cloudfront_signing_private_key_pem" {
  description = "CDN signing private key — store in Secrets Manager (Story 03); never commit"
  value       = try(module.cloudfront[0].signing_private_key_pem, null)
  sensitive   = true
}

output "ecr_dating_api_url" {
  description = "ECR repository URI for dating-api"
  value       = module.ecr.dating_api_repository_url
}

output "ecr_dating_ui_url" {
  description = "ECR repository URI for dating-ui"
  value       = module.ecr.dating_ui_repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_api_service_name" {
  description = "API ECS service name"
  value       = module.ecs.api_service_name
}

output "ecs_ui_service_name" {
  description = "UI ECS service name"
  value       = module.ecs.ui_service_name
}

output "ecs_task_role_arn" {
  description = "ECS task role ARN (S3 + Rekognition)"
  value       = module.iam.task_role_arn
}

output "ecs_execution_role_arn" {
  description = "ECS execution role ARN"
  value       = module.iam.execution_role_arn
}

output "api_security_group_id" {
  description = "API security group ID"
  value       = module.security_groups.api_security_group_id
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.networking.private_subnet_ids
}

output "api_service_discovery_hostname" {
  description = "Internal DNS for UI → API proxy"
  value       = module.ecs.api_service_discovery_hostname
}

output "ssm_parameter_path_prefix" {
  description = "SSM path prefix used by Story 03 secrets module"
  value       = "/dating/${var.environment}/api"
}
