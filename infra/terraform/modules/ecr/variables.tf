variable "repository_names" {
  description = "ECR repository names"
  type        = list(string)
  default     = ["dating-api", "dating-ui"]
}

variable "image_tag_mutability" {
  description = "MUTABLE or IMMUTABLE"
  type        = string
  default     = "MUTABLE"
}

variable "scan_on_push" {
  description = "Enable image scan on push"
  type        = bool
  default     = true
}

variable "force_delete" {
  description = "Allow destroy even if images exist (dev)"
  type        = bool
  default     = true
}

variable "enable_lifecycle_policy" {
  description = "Expire old images"
  type        = bool
  default     = true
}

variable "lifecycle_keep_count" {
  description = "Number of images to retain"
  type        = number
  default     = 20
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
