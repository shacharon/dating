variable "name_prefix" {
  description = "Prefix for role name (e.g. dating-dev)"
  type        = string
}

variable "allowed_sub_patterns" {
  description = <<-EOT
    OIDC subject patterns allowed to assume the role.
    Examples:
      - repo:my-org/dating:environment:dev
      - repo:my-org/dating:ref:refs/heads/main
      - repo:my-org/dating:*
  EOT
  type        = list(string)
}

variable "ecr_repository_arns" {
  description = "ECR repository ARNs the role may push to (empty = dating-api + dating-ui defaults)"
  type        = list(string)
  default     = []
}

variable "pass_role_arns" {
  description = "ECS execution/task role ARNs for iam:PassRole (empty = * with PassedToService condition)"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags"
  type        = map(string)
  default     = {}
}

variable "create_oidc_provider" {
  description = "Create aws_iam_openid_connect_provider (false if account already has GitHub OIDC)"
  type        = bool
  default     = true
}

variable "existing_oidc_provider_arn" {
  description = "When create_oidc_provider=false, ARN of existing token.actions.githubusercontent.com provider"
  type        = string
  default     = null
  nullable    = true
}
