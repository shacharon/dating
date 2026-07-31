output "repository_urls" {
  description = "Map of repository name → URL"
  value       = { for k, r in aws_ecr_repository.this : k => r.repository_url }
}

output "repository_arns" {
  description = "Map of repository name → ARN"
  value       = { for k, r in aws_ecr_repository.this : k => r.arn }
}

output "dating_api_repository_url" {
  description = "dating-api ECR URI"
  value       = try(aws_ecr_repository.this["dating-api"].repository_url, null)
}

output "dating_ui_repository_url" {
  description = "dating-ui ECR URI"
  value       = try(aws_ecr_repository.this["dating-ui"].repository_url, null)
}
