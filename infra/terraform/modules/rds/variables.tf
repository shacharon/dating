variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID (5432 from API only)"
  type        = string
}

variable "db_name" {
  description = "Initial database name"
  type        = string
  default     = "dating"
}

variable "db_username" {
  description = "Master / app username"
  type        = string
  default     = "dating_app"
}

variable "engine_version" {
  description = "Postgres engine version"
  type        = string
  default     = "16"
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.small"
}

variable "allocated_storage" {
  description = "Allocated storage in GiB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Autoscaling max storage in GiB (0 to disable)"
  type        = number
  default     = 100
}

variable "multi_az" {
  description = "Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Automated backup retention in days"
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "Preferred backup window (UTC)"
  type        = string
  default     = "05:00-06:00"
}

variable "maintenance_window" {
  description = "Preferred maintenance window (UTC)"
  type        = string
  default     = "sun:06:00-sun:07:00"
}

variable "deletion_protection" {
  description = "Enable deletion protection (OFF for dev)"
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot on destroy (OK for dev)"
  type        = bool
  default     = true
}

variable "secret_recovery_window_days" {
  description = "Secrets Manager recovery window (0 = immediate delete for destroy)"
  type        = number
  default     = 0
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
