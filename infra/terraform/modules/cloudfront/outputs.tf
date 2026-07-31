output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.photos.id
}

output "distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.photos.arn
}

output "domain_name" {
  description = "CloudFront domain (PHOTO_CDN_DOMAIN)"
  value       = aws_cloudfront_distribution.photos.domain_name
}

output "key_pair_id" {
  description = "CloudFront public key ID (PHOTO_CDN_KEY_PAIR_ID), null if signing disabled"
  value       = try(aws_cloudfront_public_key.photos[0].id, null)
}

output "signing_private_key_pem" {
  description = "RSA private key PEM for signed URLs — store in Secrets Manager (Story 03)"
  value       = try(tls_private_key.cdn_signing[0].private_key_pem, null)
  sensitive   = true
}
