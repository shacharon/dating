resource "aws_cloudfront_origin_access_control" "photos" {
  name                              = "${var.name_prefix}-photos-oac"
  description                       = "OAC for private photo bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "tls_private_key" "cdn_signing" {
  count = var.create_signing_key ? 1 : 0

  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "aws_cloudfront_public_key" "photos" {
  count = var.create_signing_key ? 1 : 0

  name        = "${var.name_prefix}-photos-pk"
  encoded_key = tls_private_key.cdn_signing[0].public_key_pem
  comment     = "Signed URL public key for photo CDN"
}

resource "aws_cloudfront_key_group" "photos" {
  count = var.create_signing_key ? 1 : 0

  name  = "${var.name_prefix}-photos-kg"
  items = [aws_cloudfront_public_key.photos[0].id]
}

resource "aws_cloudfront_distribution" "photos" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.name_prefix} photo CDN"
  price_class         = var.price_class
  wait_for_deployment = false

  origin {
    domain_name              = var.bucket_regional_domain_name
    origin_id                = "s3-photos"
    origin_access_control_id = aws_cloudfront_origin_access_control.photos.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-photos"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    # Trusted key group enables signed URLs when create_signing_key = true
    trusted_key_groups = var.create_signing_key ? [aws_cloudfront_key_group.photos[0].id] : []

    min_ttl     = 0
    default_ttl = var.default_ttl
    max_ttl     = var.max_ttl
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-photos-cdn"
  })
}

data "aws_iam_policy_document" "photos_oac" {
  statement {
    sid    = "AllowCloudFrontOAC"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    actions   = ["s3:GetObject"]
    resources = ["${var.bucket_arn}/*"]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.photos.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "photos_oac" {
  bucket = var.bucket_id
  policy = data.aws_iam_policy_document.photos_oac.json
}
