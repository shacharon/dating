resource "aws_s3_bucket" "photos" {
  bucket_prefix = var.bucket_prefix

  force_destroy = var.force_destroy

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-photos"
  })
}

resource "aws_s3_bucket_public_access_block" "photos" {
  bucket = aws_s3_bucket.photos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "photos" {
  bucket = aws_s3_bucket.photos.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "photos" {
  bucket = aws_s3_bucket.photos.id

  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "photos" {
  count  = var.enable_lifecycle_rules ? 1 : 0
  bucket = aws_s3_bucket.photos.id

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  rule {
    id     = "expire-noncurrent"
    status = var.noncurrent_expiration_days > 0 ? "Enabled" : "Disabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_expiration_days
    }
  }
}

# Allow CloudFront OAC to GetObject when CDN is enabled (policy attached from cloudfront module via bucket policy)
# This module only owns the bucket; CloudFront module can receive bucket_arn / bucket_id.
