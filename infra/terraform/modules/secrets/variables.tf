variable "name_prefix" {
  description = "Prefix for resource names (e.g. dating-dev)"
  type        = string
}

variable "environment" {
  description = "Environment slug used in SSM/Secrets paths (e.g. dev)"
  type        = string
  default     = "dev"
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}

# ---------------------------------------------------------------------------
# Story 02 hand-offs (optional — wire when RDS / Redis / S3 modules exist)
# ---------------------------------------------------------------------------

variable "database_url_secret_arn" {
  description = <<-EOT
    ARN of the Story 02 RDS Secrets Manager secret that contains JSON key
    `database_url`. When set, ECS injects DATABASE_URL from that key.
    Leave null only for bootstrap/docs; production wiring must set this.
  EOT
  type        = string
  default     = null
  nullable    = true
}

variable "redis_url" {
  description = "REDIS_URL value (from Story 02 redis module output redis_url)"
  type        = string
  default     = "redis://REPLACE_WITH_ELASTICACHE:6379"
}

variable "photo_s3_bucket" {
  description = "PHOTO_S3_BUCKET (from Story 02 s3_photos module)"
  type        = string
  default     = "REPLACE_WITH_PHOTO_BUCKET"
}

variable "photo_s3_region" {
  description = "PHOTO_S3_REGION"
  type        = string
  default     = "us-east-1"
}

variable "photo_s3_prefix" {
  description = "PHOTO_S3_PREFIX"
  type        = string
  default     = "profile-photos"
}

# ---------------------------------------------------------------------------
# Non-secret API config (SSM String) — cloud-correct defaults
# ---------------------------------------------------------------------------

variable "port" {
  type    = string
  default = "3001"
}

variable "node_env" {
  type    = string
  default = "production"
}

variable "google_client_id" {
  description = "Google OAuth Web client ID (public; also baked into UI as NEXT_PUBLIC_GOOGLE_CLIENT_ID)"
  type        = string
  default     = "REPLACE_WITH_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
}

variable "session_cookie_name" {
  type    = string
  default = "dating_session"
}

variable "session_ttl_days" {
  type    = string
  default = "14"
}

variable "cookie_secure" {
  description = "Must be true behind HTTPS in cloud (L4)"
  type        = string
  default     = "true"
}

variable "cookie_domain" {
  description = "Shared parent domain for UI+API cookies, e.g. .example.com — leave empty for host-only"
  type        = string
  default     = ""
}

variable "cors_origin" {
  description = "Exact browser origin allowed for credentialed CORS, e.g. https://dev.example.com"
  type        = string
  default     = "https://dev.REPLACE_WITH_DOMAIN.tld"
}

variable "cors_credentials" {
  type    = string
  default = "true"
}

variable "photo_storage_driver" {
  type    = string
  default = "s3"
}

variable "photo_moderation_driver" {
  type    = string
  default = "rekognition"
}

variable "photo_face_detection_enabled" {
  type    = string
  default = "1"
}

variable "nsfw_flag_threshold" {
  type    = string
  default = "50"
}

variable "nsfw_auto_reject_threshold" {
  type    = string
  default = "80"
}

variable "structured_log_file" {
  description = "0 = stdout only (L7). Never enable file sink on ECS."
  type        = string
  default     = "0"
}

variable "admin_user_ids" {
  description = "Comma-separated User.id values for /admin (empty until seeded)"
  type        = string
  default     = ""
}

variable "photo_cdn_enabled" {
  type    = string
  default = "0"
}

variable "photo_cdn_domain" {
  type    = string
  default = ""
}

variable "photo_cdn_key_pair_id" {
  type    = string
  default = ""
}

variable "photo_cdn_url_ttl_seconds" {
  type    = string
  default = "3600"
}

variable "email_provider" {
  description = "disabled | resend — leave disabled until domain verified"
  type        = string
  default     = "disabled"
}

variable "email_from" {
  type    = string
  default = "Piza <notifications@REPLACE_WITH_DOMAIN.tld>"
}

variable "app_public_url" {
  type    = string
  default = "https://dev.REPLACE_WITH_DOMAIN.tld"
}

variable "sentry_environment" {
  type    = string
  default = "dev"
}

variable "sentry_traces_sample_rate" {
  type    = string
  default = "0.1"
}

variable "dd_trace_enabled" {
  type    = string
  default = "0"
}

variable "dd_env" {
  type    = string
  default = "dev"
}

variable "dd_service" {
  type    = string
  default = "dating-api"
}

variable "product_analytics_enabled" {
  type    = string
  default = "true"
}

variable "report_ops_email" {
  type    = string
  default = ""
}

variable "email_message_debounce_minutes" {
  type    = string
  default = "15"
}

# ---------------------------------------------------------------------------
# Optional: create Secrets Manager versions for operator-supplied values.
# Leave empty (default) so Terraform creates the secret shell only; set via
# AWS CLI / Console. Never commit real values.
# ---------------------------------------------------------------------------

variable "openai_api_key" {
  description = "If non-empty, writes Secrets Manager version (sensitive — use TF_VAR_ / CI secret store)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "resend_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "photo_cdn_private_key" {
  description = "PEM with literal \\n escapes as a single line (preserve escapes)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "sentry_dsn" {
  type      = string
  default   = ""
  sensitive = true
}

variable "dd_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "generate_session_pepper" {
  description = "Generate SESSION_SECRET_PEPPER with random_password (stored in Secrets Manager; not in git)"
  type        = bool
  default     = true
}

variable "generate_email_unsubscribe_secret" {
  description = "Generate EMAIL_UNSUBSCRIBE_SECRET with random_password"
  type        = bool
  default     = true
}

variable "secret_recovery_window_days" {
  description = "Secrets Manager recovery window (0 = force-delete OK for destroyable dev)"
  type        = number
  default     = 0
}

# ---------------------------------------------------------------------------
# UI build-time (Story 04) — stored as SSM for CI to read; NOT ECS task env
# ---------------------------------------------------------------------------

variable "ui_next_public_google_client_id" {
  description = "Bake into UI image; should match google_client_id"
  type        = string
  default     = ""
}

variable "ui_next_public_api_url" {
  description = "Leave empty for same-origin + rewrites (recommended)"
  type        = string
  default     = ""
}

variable "ui_next_public_realtime" {
  type    = string
  default = "ws"
}

variable "ui_next_public_admin_enabled" {
  type    = string
  default = "0"
}

variable "ui_next_public_session_cookie_name" {
  type    = string
  default = "dating_session"
}

variable "ui_next_public_sentry_dsn" {
  type    = string
  default = ""
}

variable "ui_next_public_sentry_environment" {
  type    = string
  default = "dev"
}

variable "ui_api_proxy_target" {
  description = "Server-side rewrite target (runtime OR build depending on Next config); document for Story 04"
  type        = string
  default     = "http://dating-api.internal:3001"
}

variable "ui_internal_api_url" {
  type    = string
  default = "http://dating-api.internal:3001"
}

variable "create_ui_build_params" {
  description = "Also publish UI build-arg SSM params for Story 04 CI"
  type        = bool
  default     = true
}

# Optional secret injection flags — keep false until the secret has a version,
# otherwise ECS fails pulling empty Secrets Manager shells at task start.
variable "inject_resend_api_key" {
  type    = bool
  default = false
}

variable "inject_photo_cdn_private_key" {
  type    = bool
  default = false
}

variable "inject_sentry_dsn" {
  type    = bool
  default = false
}

variable "inject_dd_api_key" {
  type    = bool
  default = false
}

variable "inject_email_unsubscribe_secret" {
  description = "Force-inject EMAIL_UNSUBSCRIBE_SECRET even if not auto-generated"
  type        = bool
  default     = false
}

variable "inject_product_analytics_hash_salt" {
  type    = bool
  default = false
}
