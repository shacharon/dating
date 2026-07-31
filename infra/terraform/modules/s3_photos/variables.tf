variable "name_prefix" {
  description = "Prefix for resource names / tags"
  type        = string
}

variable "bucket_prefix" {
  description = "S3 bucket name prefix (AWS appends unique suffix)"
  type        = string
  default     = "dating-dev-photos-"
}

variable "force_destroy" {
  description = "Allow terraform destroy to empty the bucket (dev only)"
  type        = bool
  default     = true
}

variable "versioning_enabled" {
  description = "Enable S3 versioning"
  type        = bool
  default     = false
}

variable "enable_lifecycle_rules" {
  description = "Enable optional lifecycle rules"
  type        = bool
  default     = true
}

variable "noncurrent_expiration_days" {
  description = "Expire noncurrent versions after N days (0 disables)"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
