output "bucket_id" {
  description = "Photo bucket name"
  value       = aws_s3_bucket.photos.id
}

output "bucket_arn" {
  description = "Photo bucket ARN"
  value       = aws_s3_bucket.photos.arn
}

output "bucket_regional_domain_name" {
  description = "Regional domain name (CloudFront origin)"
  value       = aws_s3_bucket.photos.bucket_regional_domain_name
}
