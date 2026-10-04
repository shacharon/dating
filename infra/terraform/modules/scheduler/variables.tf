variable "name_prefix" {
  description = "Resource name prefix (e.g. dating-dev)"
  type        = string
}

variable "aws_region" {
  type = string
}

variable "cluster_name" {
  description = "ECS cluster name"
  type        = string
}

variable "api_service_name" {
  type = string
}

variable "ui_service_name" {
  type = string
}

variable "db_instance_id" {
  description = "RDS instance identifier to start/stop"
  type        = string
}

variable "timezone" {
  description = "IANA timezone for all schedules (daylight saving handled by AWS)"
  type        = string
  default     = "Asia/Jerusalem"
}

# 6-field cron: minute hour day-of-month month day-of-week year (every day)
variable "ecs_off_cron" {
  type    = string
  default = "cron(0 23 * * ? *)"
}

variable "ecs_on_cron" {
  type    = string
  default = "cron(0 8 * * ? *)"
}

variable "rds_stop_cron" {
  type    = string
  default = "cron(15 23 * * ? *)"
}

variable "rds_start_cron" {
  type    = string
  default = "cron(45 7 * * ? *)"
}

variable "api_on_min" {
  description = "API min capacity during the day"
  type        = number
  default     = 1
}

variable "api_on_max" {
  description = "API max capacity during the day"
  type        = number
  default     = 2
}

variable "ui_on_min" {
  type    = number
  default = 1
}

variable "ui_on_max" {
  type    = number
  default = 1
}

variable "tags" {
  type    = map(string)
  default = {}
}
