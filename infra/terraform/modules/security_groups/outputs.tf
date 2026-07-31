output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = aws_security_group.alb.id
}

output "api_security_group_id" {
  description = "API Fargate security group ID"
  value       = aws_security_group.api.id
}

output "ui_security_group_id" {
  description = "UI Fargate security group ID"
  value       = aws_security_group.ui.id
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "Redis security group ID"
  value       = aws_security_group.redis.id
}
