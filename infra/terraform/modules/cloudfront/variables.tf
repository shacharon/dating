variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "bucket_id" {
  description = "Photo S3 bucket name"
  type        = string
}

variable "bucket_arn" {
  description = "Photo S3 bucket ARN"
  type        = string
}

variable "bucket_regional_domain_name" {
  description = "S3 regional domain name"
  type        = string
}

variable "create_signing_key" {
  description = "Create CloudFront key pair + key group for signed URLs"
  type        = bool
  default     = true
}

variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

variable "default_ttl" {
  description = "Default cache TTL seconds"
  type        = number
  default     = 3600
}

variable "max_ttl" {
  description = "Max cache TTL seconds"
  type        = number
  default     = 86400
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
