variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "api_port" {
  description = "dating-api container port"
  type        = number
  default     = 3001
}

variable "ui_port" {
  description = "dating-ui container port"
  type        = number
  default     = 3000
}

variable "allow_http_redirect" {
  description = "Allow inbound HTTP:80 on ALB for HTTPS redirect"
  type        = bool
  default     = true
}

variable "allow_ui_to_api" {
  description = "Allow UI tasks to reach API port directly (SSR / internal proxy)"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
