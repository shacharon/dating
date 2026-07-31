resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name_prefix}-redis"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis-subnet-group"
  })
}

resource "aws_elasticache_parameter_group" "this" {
  name   = "${var.name_prefix}-redis7"
  family = "redis7"

  tags = var.tags
}

# Single-node replication group (supports at-rest / in-transit encryption).
# aws_elasticache_cluster does not accept encryption arguments.
resource "aws_elasticache_replication_group" "this" {
  replication_group_id = "${var.name_prefix}-redis"
  description          = "${var.name_prefix} Redis (dev single-node)"

  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  num_cache_clusters   = 1
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.this.name
  subnet_group_name    = aws_elasticache_subnet_group.this.name
  security_group_ids   = [var.security_group_id]

  transit_encryption_enabled = var.transit_encryption_enabled
  at_rest_encryption_enabled = var.at_rest_encryption_enabled

  automatic_failover_enabled = false
  multi_az_enabled           = false

  apply_immediately          = true
  auto_minor_version_upgrade = true
  snapshot_retention_limit   = var.snapshot_retention_limit

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis"
  })
}
