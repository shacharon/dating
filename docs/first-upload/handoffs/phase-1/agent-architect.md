# Handoff: first-upload — architect — phase 1

**Agent:** architect  
**Phase:** `1` Settings file  
**Date:** 2026-09-19  
**Status:** complete  
**Verdict:** designed

---

## Summary

- Product go received. Design-only: write gitignored `terraform.tfvars`, local init, validate.
- No `terraform apply`. No AWS create. Backend stays commented (phase 2).
- Region `eu-central-1`. Domain/cert/zone empty. Profile `pizza` for any AWS SDK Terraform might touch; validate should not need a live call.

---

## What must already exist

- Repo `infra/terraform/dev/terraform.tfvars.example`
- Terraform CLI ≥ 1.5 (operator has 1.15.8)
- Phase 0 identity (`pizza` / `shachar-admin`) — not used to create resources this phase

---

## Working directory

`c:\dev\piza\dating\infra\terraform\dev`

---

## Terraform -target

None. No apply.

---

## Blast radius

- **AWS:** nothing
- **Disk:** create `terraform.tfvars` (gitignored). `terraform init -backend=false` creates local `.terraform/` (already gitignored if standard)
- **Going2Eat:** untouched

---

## Commands (PowerShell)

Set location and profile (profile unused for spend; keeps provider region consistent if Terraform probes):

```powershell
Set-Location c:\dev\piza\dating\infra\terraform\dev
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
```

Create `terraform.tfvars` with **exactly** the body below (UTF-8). Do not copy `us-east-1` from the example.

Then:

```powershell
terraform init -backend=false
terraform validate
```

Expected: `Success! The configuration is valid.`

Do **not** run `terraform plan` or `terraform apply` in this phase.

---

## File to write: `terraform.tfvars`

```hcl
aws_region  = "eu-central-1"
environment = "dev"
project     = "dating"

vpc_cidr             = "10.20.0.0/16"
az_count             = 2
single_nat_gateway   = true
enable_vpc_endpoints = true

domain_name         = ""
route53_zone_id     = ""
acm_certificate_arn = ""

enable_cloudfront = true

rds_instance_class       = "db.t4g.small"
redis_node_type          = "cache.t4g.micro"
redis_transit_encryption = false

api_image_tag = "latest"
ui_image_tag  = "latest"

api_desired_count = 1
api_min_count     = 1
api_max_count     = 2
ui_desired_count  = 1

api_secrets = []
ui_secrets  = []
```

Leave `google_client_id`, `cookie_domain`, `cors_origin` unset (module defaults / placeholders). Do not put OAuth secrets in this file.

---

## Rollback if it fails

- Delete `infra/terraform/dev/terraform.tfvars` if the file is wrong
- If `init`/`validate` leave a bad `.terraform`, remove `infra/terraform/dev\.terraform` and retry `init -backend=false`
- Validate errors: fix tfvars or report to architect; do not apply

---

## What QA should query

1. `Test-Path c:\dev\piza\dating\infra\terraform\dev\terraform.tfvars` is `True`
2. File contains `aws_region  = "eu-central-1"` (or equivalent spacing)
3. `domain_name`, `route53_zone_id`, `acm_certificate_arn` are `""`
4. `git check-ignore` or `git status` does **not** list `terraform.tfvars` as a file to commit (ignored)
5. Re-run `terraform validate` in `dev/` after `init -backend=false` → success

---

## Out of scope (phase 2)

- `infra/terraform/bootstrap/terraform.tfvars`
- Uncommenting `dev/backend.tf`

---

## Next

```text
--upload-agent devops phase 1
```
