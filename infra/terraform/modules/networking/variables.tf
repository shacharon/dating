variable "name_prefix" {
  description = "Prefix for resource names (e.g. dating-dev)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "az_count" {
  description = "Number of AZs / subnet pairs"
  type        = number
  default     = 2
}

variable "enable_nat_gateway" {
  description = "Create NAT gateway(s) for private subnet egress"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway for all AZs (cheaper for dev)"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
