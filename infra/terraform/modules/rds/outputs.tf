output "db_instance_id" {
  description = "RDS instance identifier"
  value       = aws_db_instance.this.id
}

output "db_endpoint" {
  description = "RDS endpoint hostname:port"
  value       = aws_db_instance.this.endpoint
}

output "db_address" {
  description = "RDS hostname"
  value       = aws_db_instance.this.address
}

output "db_port" {
  description = "RDS port"
  value       = aws_db_instance.this.port
}

output "db_name" {
  description = "Database name"
  value       = aws_db_instance.this.db_name
}

output "db_username" {
  description = "Master username"
  value       = var.db_username
}

output "secrets_manager_secret_arn" {
  description = "Secrets Manager ARN holding credentials + DATABASE_URL"
  value       = aws_secretsmanager_secret.db.arn
}

output "secrets_manager_secret_name" {
  description = "Secrets Manager secret name"
  value       = aws_secretsmanager_secret.db.name
}
