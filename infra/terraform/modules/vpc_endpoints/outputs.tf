output "s3_endpoint_id" {
  value = aws_vpc_endpoint.s3.id
}

output "interface_endpoint_ids" {
  value = { for k, ep in aws_vpc_endpoint.interface : k => ep.id }
}

output "vpce_security_group_id" {
  value = aws_security_group.vpce.id
}
