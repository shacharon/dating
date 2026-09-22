# First upload — parked issues

Revisit after first upload (see [DATING_FIRST_UPLOAD_CONCLUSION.md](../DATING_FIRST_UPLOAD_CONCLUSION.md)).

## P1 — `dating-api` image ~200 MB

- **Opened:** 2026-09-20 (phase 4 QA)
- Frankfurt ECR `dating-api` ~**200 MB**. Operator: too big.
- **Not now:** no Dockerfile rewrite unless operator unparks.

## P2 — Phase 5b CloudFront (photo CDN) skipped

- **Opened:** 2026-09-20. Still skipped.
- `enable_cloudfront = false` in gitignored tfvars. Do not apply `module.cloudfront` until unparked.
- Revisit after photos exist or before real users.

## P3 — Domain + HTTPS — **done** (unparked)

- Operator bought **findyouraidate.com**. Route53 + ACM + ALB HTTPS live. Google login on phone works.
- Home Cellcom DNS may still show GoDaddy; not an AWS fail.

## Also parked

- NAT vs Going2Eat public-IP pattern — not started.
