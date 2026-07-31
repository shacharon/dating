output "cluster_id" {
  description = "ElastiCache replication group ID"
  value       = aws_elasticache_replication_group.this.id
}

output "primary_endpoint_address" {
  description = "Redis primary endpoint hostname"
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.this.port
}

output "redis_url" {
  description = "REDIS_URL value (redis:// or rediss://)"
  value = format(
    "%s://%s:%s",
    var.transit_encryption_enabled ? "rediss" : "redis",
    aws_elasticache_replication_group.this.primary_endpoint_address,
    tostring(aws_elasticache_replication_group.this.port)
  )
}
