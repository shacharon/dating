variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "aws_region" {
  description = "AWS region (for awslogs + PHOTO_S3_REGION)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID (service discovery namespace)"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for Fargate tasks"
  type        = list(string)
}

variable "api_security_group_id" {
  description = "API task security group"
  type        = string
}

variable "ui_security_group_id" {
  description = "UI task security group"
  type        = string
}

variable "api_target_group_arn" {
  description = "ALB API target group ARN"
  type        = string
}

variable "ui_target_group_arn" {
  description = "ALB UI target group ARN"
  type        = string
}

variable "execution_role_arn" {
  description = "ECS execution role ARN"
  type        = string
}

variable "task_role_arn" {
  description = "ECS task role ARN"
  type        = string
}

variable "api_repository_url" {
  description = "ECR URI for dating-api"
  type        = string
}

variable "ui_repository_url" {
  description = "ECR URI for dating-ui"
  type        = string
}

variable "api_image_tag" {
  description = "API image tag"
  type        = string
  default     = "latest"
}

variable "ui_image_tag" {
  description = "UI image tag"
  type        = string
  default     = "latest"
}

variable "api_port" {
  type    = number
  default = 3001
}

variable "ui_port" {
  type    = number
  default = 3000
}

variable "api_cpu" {
  type    = number
  default = 512
}

variable "api_memory" {
  type    = number
  default = 1024
}

variable "ui_cpu" {
  type    = number
  default = 256
}

variable "ui_memory" {
  type    = number
  default = 512
}

variable "api_desired_count" {
  description = "Desired API tasks"
  type        = number
  default     = 1
}

variable "api_min_count" {
  description = "Autoscaling min API tasks"
  type        = number
  default     = 1
}

variable "api_max_count" {
  description = "Autoscaling max API tasks (Story: 1–2)"
  type        = number
  default     = 2
}

variable "ui_desired_count" {
  description = "Desired UI tasks"
  type        = number
  default     = 1
}

variable "photo_bucket_name" {
  description = "PHOTO_S3_BUCKET"
  type        = string
}

variable "photo_s3_prefix" {
  type    = string
  default = "profile-photos"
}

variable "redis_url" {
  description = "REDIS_URL (non-secret endpoint string)"
  type        = string
  default     = ""
}

variable "cors_origin" {
  description = "CORS_ORIGIN (public app URL)"
  type        = string
  default     = ""
}

variable "photo_cdn_domain" {
  description = "CloudFront domain for PHOTO_CDN_DOMAIN"
  type        = string
  default     = ""
}

variable "alb_dns_name" {
  description = "ALB DNS for UI proxy fallback"
  type        = string
  default     = ""
}

variable "api_extra_environment" {
  description = "Extra plain env vars for API"
  type        = map(string)
  default     = {}
}

variable "ui_extra_environment" {
  description = "Extra plain env vars for UI"
  type        = map(string)
  default     = {}
}

variable "api_secrets" {
  description = <<-EOT
    ECS secrets for API task definition. Story 03 fills real ARNs.
    Example placeholder shape:
    [
      { name = "DATABASE_URL", valueFrom = "arn:aws:secretsmanager:...:secret:xxx:database_url::" },
      { name = "OPENAI_API_KEY", valueFrom = "arn:aws:ssm:...:parameter/dating/dev/OPENAI_API_KEY" }
    ]
  EOT
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

variable "ui_secrets" {
  description = "ECS secrets for UI task definition (Story 03)"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

variable "enable_service_discovery" {
  description = "Create Cloud Map namespace for dating-api.internal DNS"
  type        = bool
  default     = true
}

variable "service_discovery_namespace" {
  description = "Private DNS namespace (e.g. dating.internal → dating-api.dating.internal)"
  type        = string
  default     = "internal"
}

variable "enable_container_insights" {
  type    = bool
  default = false
}

variable "enable_execute_command" {
  description = "Enable ECS Exec for debugging"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "tags" {
  type    = map(string)
  default = {}
}
