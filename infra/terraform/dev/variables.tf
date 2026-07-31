variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev / staging / prod)"
  type        = string
  default     = "dev"
}

variable "project" {
  description = "Project name used in resource prefixes"
  type        = string
  default     = "dating"
}

variable "vpc_cidr" {
  description = "VPC CIDR"
  type        = string
  default     = "10.20.0.0/16"
}

variable "az_count" {
  description = "Number of AZs"
  type        = number
  default     = 2
}

variable "single_nat_gateway" {
  description = "Single NAT for all AZs (cheaper for dev)"
  type        = bool
  default     = true
}

variable "enable_vpc_endpoints" {
  description = "Create VPC endpoints for ECR/SSM/Secrets/Logs/Rekognition/S3"
  type        = bool
  default     = true
}

variable "domain_name" {
  description = "Public hostname (e.g. dev.example.com). Empty skips Route53 record."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for domain_name"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM cert ARN in the same region as the ALB. Empty = HTTP-only bootstrap."
  type        = string
  default     = ""
}

variable "enable_cloudfront" {
  description = "Provision CloudFront + OAC + signing key group over the photo bucket"
  type        = bool
  default     = true
}

variable "redis_transit_encryption" {
  description = "ElastiCache in-transit encryption (use rediss:// when true)"
  type        = bool
  default     = false
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.small"
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "api_image_tag" {
  description = "dating-api image tag in ECR"
  type        = string
  default     = "latest"
}

variable "ui_image_tag" {
  description = "dating-ui image tag in ECR"
  type        = string
  default     = "latest"
}

variable "api_desired_count" {
  type    = number
  default = 1
}

variable "api_min_count" {
  type    = number
  default = 1
}

variable "api_max_count" {
  type    = number
  default = 2
}

variable "ui_desired_count" {
  type    = number
  default = 1
}

variable "api_secrets" {
  description = "ECS secrets for API (Story 03 fills ARNs). Empty until secrets exist."
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

variable "ui_secrets" {
  description = "ECS secrets for UI (Story 03)"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

variable "cors_origin" {
  description = "CORS_ORIGIN for the API (typically https://<domain_name>). Empty falls back to https://domain_name when set."
  type        = string
  default     = ""
}

variable "additional_tags" {
  description = "Extra tags merged into all resources"
  type        = map(string)
  default     = {}
}
