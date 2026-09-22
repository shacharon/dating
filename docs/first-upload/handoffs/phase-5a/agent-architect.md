# Handoff: first-upload — architect — phase 5a

**Agent:** architect  
**Phase:** `5a` Photo bucket (S3)  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** designed

---

## Summary

- Product go. Create **only** `module.s3_photos` in Frankfurt.
- Bucket name is prefix `dating-dev-photos-` plus AWS suffix. Tag Name `dating-dev-photos`.
- Public access block, AES256, versioning, lifecycle (multipart abort). `force_destroy = true` (dev).
- Do **not** target `module.cloudfront` (5b). Targeting S3 alone must not create RDS/ALB/ECS/NAT/food.

---

## What must already exist

- Phase 2 S3 backend, phase 1 tfvars, profile `pizza`
- Existing tfstate bucket `dating-tfstate-907390934996-euc1` — do not modify it

---

## Working directory

`c:\dev\piza\dating\infra\terraform\dev`

---

## Terraform -target (required)

```
module.s3_photos
```

PowerShell: quote the target (`.` breaks otherwise):

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
Set-Location c:\dev\piza\dating\infra\terraform\dev

terraform plan -out=tfplan -target="module.s3_photos"
terraform show -no-color tfplan
```

Abort if plan includes NAT, RDS, Redis, ALB, ECS, CloudFront, VPC, ECR, `food-`, or the tfstate bucket.

Expected: `aws_s3_bucket.photos` + public_access_block + ownership + encryption + versioning + lifecycle. Roughly **6 to add**.

If the plan is photos-only, apply (cheap; product does not require a second “yes apply”):

```powershell
terraform apply tfplan
```

---

## Blast radius

- **AWS:** one private photos bucket in `eu-central-1`
- **Cost:** cents empty
- **Going2Eat:** none

---

## Rollback

- Wrong plan: do not apply
- Applied by mistake extra modules: stop, architect
- Destroy later: `-target="module.s3_photos"` only (consent)

---

## What QA should query

```powershell
aws s3api list-buckets --profile pizza --query "Buckets[?starts_with(Name, 'dating-dev-photos-')].Name" --output json
aws s3api get-bucket-location --bucket <photos-bucket> --profile pizza
aws s3api get-public-access-block --bucket <photos-bucket> --profile pizza
```

- Location `eu-central-1` (or empty constraint vs EU — confirm not us-east-1/Stockholm)
- All four public access block flags `true`
- Distinct from `dating-tfstate-907390934996-euc1`

Console: Frankfurt → **S3** → `dating-dev-photos-…` → Permissions → Block public access **On**.

---

## Next

```text
--upload-agent devops phase 5a
```
