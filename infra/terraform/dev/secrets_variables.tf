# Variables consumed by secrets.tf (Story 03).
# `environment` and `cors_origin` are declared in variables.tf (Story 02 root).

variable "google_client_id" {
  description = "Google OAuth Web client ID (public)"
  type        = string
  default     = "REPLACE_WITH_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
}

variable "cookie_domain" {
  description = "Shared cookie domain (e.g. .example.com); empty = host-only"
  type        = string
  default     = ""
}

variable "app_public_url" {
  description = "Public app URL (email links, etc.)"
  type        = string
  default     = ""
}

variable "admin_user_ids" {
  description = "Comma-separated admin User.id values"
  type        = string
  default     = ""
}

variable "ui_next_public_admin_enabled" {
  description = "Bake NEXT_PUBLIC_ADMIN_ENABLED into UI image (0|1)"
  type        = string
  default     = "0"
}

variable "ui_api_proxy_target" {
  description = "Next.js server-side API proxy target; empty = dating-api.dating.internal or ALB"
  type        = string
  default     = ""
}

variable "ui_internal_api_url" {
  description = "SSR internal API base URL; empty = same as proxy target"
  type        = string
  default     = ""
}

variable "enable_service_discovery_for_secrets" {
  description = "Use dating-api.dating.internal for UI proxy SSM build params (matches ECS module default)"
  type        = bool
  default     = true
}
