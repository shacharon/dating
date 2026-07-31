output "role_arn" {
  description = "IAM role ARN for GitHub Environment var AWS_ROLE_ARN"
  value       = aws_iam_role.gha_deploy.arn
}

output "role_name" {
  description = "IAM role name"
  value       = aws_iam_role.gha_deploy.name
}

output "oidc_provider_arn" {
  description = "OIDC provider ARN used in the trust policy"
  value       = local.oidc_provider_arn
}
