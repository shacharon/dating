output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.this.arn
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.this.dns_name
}

output "alb_zone_id" {
  description = "ALB Route53 zone ID"
  value       = aws_lb.this.zone_id
}

output "ui_target_group_arn" {
  description = "UI target group ARN"
  value       = aws_lb_target_group.ui.arn
}

output "api_target_group_arn" {
  description = "API target group ARN"
  value       = aws_lb_target_group.api.arn
}

output "https_listener_arn" {
  description = "HTTPS listener ARN (null if no cert)"
  value       = try(aws_lb_listener.https[0].arn, null)
}

output "http_listener_arn" {
  description = "HTTP listener ARN"
  value = try(
    aws_lb_listener.http_redirect[0].arn,
    aws_lb_listener.http_forward[0].arn
  )
}

output "app_fqdn" {
  description = "Route53 FQDN if configured, else ALB DNS"
  value       = try(aws_route53_record.app[0].fqdn, aws_lb.this.dns_name)
}
