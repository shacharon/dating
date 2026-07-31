output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.this.name
}

output "cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.this.arn
}

output "api_service_name" {
  description = "API ECS service name"
  value       = aws_ecs_service.api.name
}

output "ui_service_name" {
  description = "UI ECS service name"
  value       = aws_ecs_service.ui.name
}

output "api_task_definition_arn" {
  description = "API task definition ARN"
  value       = aws_ecs_task_definition.api.arn
}

output "ui_task_definition_arn" {
  description = "UI task definition ARN"
  value       = aws_ecs_task_definition.ui.arn
}

output "api_log_group_name" {
  description = "API CloudWatch log group"
  value       = aws_cloudwatch_log_group.api.name
}

output "ui_log_group_name" {
  description = "UI CloudWatch log group"
  value       = aws_cloudwatch_log_group.ui.name
}

output "service_discovery_namespace" {
  description = "Cloud Map private DNS namespace (null if disabled)"
  value       = try(aws_service_discovery_private_dns_namespace.this[0].name, null)
}

output "api_service_discovery_hostname" {
  description = "Internal hostname for API (UI proxy target)"
  value = var.enable_service_discovery ? (
    "dating-api.${var.service_discovery_namespace}"
  ) : null
}
