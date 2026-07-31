output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.this.id
}

output "vpc_cidr" {
  description = "VPC CIDR"
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "Public subnet IDs (ALB)"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs (Fargate / RDS / Redis)"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ids" {
  description = "NAT gateway IDs"
  value       = aws_nat_gateway.this[*].id
}

output "private_route_table_ids" {
  description = "Private route table IDs (for VPC endpoints)"
  value       = aws_route_table.private[*].id
}

output "availability_zones" {
  description = "AZs used"
  value       = local.azs
}
