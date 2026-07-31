variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "photo_bucket_arn" {
  description = "ARN of the private photo S3 bucket"
  type        = string
}

variable "secrets_arns" {
  description = "Explicit Secrets Manager / SSM ARNs the execution role may read (empty = prefix wildcards)"
  type        = list(string)
  default     = []
}

variable "ssm_parameter_path_prefix" {
  description = "SSM path prefix used when secrets_arns is empty (e.g. dating/dev)"
  type        = string
  default     = "dating/dev"
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
