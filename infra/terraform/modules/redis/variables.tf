variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID (6379 from API only)"
  type        = string
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "transit_encryption_enabled" {
  description = "Enable in-transit encryption (use rediss:// if true)"
  type        = bool
  default     = false
}

variable "at_rest_encryption_enabled" {
  description = "Enable at-rest encryption"
  type        = bool
  default     = true
}

variable "snapshot_retention_limit" {
  description = "Days to retain automatic snapshots (0 = disabled)"
  type        = number
  default     = 1
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
