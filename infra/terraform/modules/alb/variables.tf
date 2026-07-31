variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the ALB"
  type        = list(string)
}

variable "security_group_id" {
  description = "ALB security group ID"
  type        = string
}

variable "api_port" {
  description = "API container port"
  type        = number
  default     = 3001
}

variable "ui_port" {
  description = "UI container port"
  type        = number
  default     = 3000
}

variable "ui_health_check_path" {
  description = "UI health check path"
  type        = string
  default     = "/"
}

variable "api_stickiness_duration" {
  description = "API TG stickiness cookie duration (seconds)"
  type        = number
  default     = 86400
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS (empty = HTTP-only bootstrap)"
  type        = string
  default     = ""
}

variable "ssl_policy" {
  description = "ALB SSL policy"
  type        = string
  default     = "ELBSecurityPolicy-TLS13-1-2-2021-06"
}

variable "enable_deletion_protection" {
  description = "ALB deletion protection (OFF for destroyable dev)"
  type        = bool
  default     = false
}

variable "idle_timeout" {
  description = "ALB idle timeout (raise for long-lived WebSockets)"
  type        = number
  default     = 60
}

variable "domain_name" {
  description = "Optional Route53 record name (e.g. dev.example.com)"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Optional Route53 hosted zone ID"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
