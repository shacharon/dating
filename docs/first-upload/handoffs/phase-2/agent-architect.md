# Handoff: first-upload — architect — phase 2

**Agent:** architect  
**Phase:** `2` Terraform notebook (remote state)  
**Date:** 2026-09-19  
**Status:** complete  
**Verdict:** designed

---

## Summary

- Product go received. Create Dating tfstate S3 + DynamoDB lock in `eu-central-1`, then wire `dev/backend.tf`.
- Apply **only** `infra/terraform/bootstrap`. Do **not** apply `infra/terraform/dev`.
- Show `terraform plan` to the operator, then apply that plan if it is only the state bucket + lock table.

---

## What must already exist

- Phase 1: `infra/terraform/dev/terraform.tfvars` with `eu-central-1`
- AWS profile `pizza`, account `907390934996`
- Terraform ≥ 1.5

---

## Names (locked for this phase)

| Thing | Value |
|-------|--------|
| Region | `eu-central-1` |
| State bucket | `dating-tfstate-907390934996-euc1` |
| Lock table | `dating-terraform-locks` |
| State key | `dating/dev/terraform.tfstate` |
| Profile | `pizza` |

S3 names are global; account + `euc1` avoids collisions. If apply fails with `BucketAlreadyExists` / `BucketAlreadyOwnedByYou`, stop and report to architect — do not pick a food/Going2Eat bucket.

---

## Terraform -target

None. Bootstrap is a tiny root module (whole apply is the phase).

Forbidden: any apply under `infra/terraform/dev`.

---

## Blast radius

- **Create:** 1 S3 bucket (versioned, encrypted, public access blocked) + 1 DynamoDB table (`PAY_PER_REQUEST`, key `LockID`) in Frankfurt
- **AWS cost:** pennies
- **Going2Eat:** untouched (different names, Dating tags)
- **dev stack:** no VPC/RDS/ECS

---

## Working directories

1. `c:\dev\piza\dating\infra\terraform\bootstrap`
2. Then `c:\dev\piza\dating\infra\terraform\dev`

---

## Commands (PowerShell)

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
Set-Location c:\dev\piza\dating\infra\terraform\bootstrap
```

Write gitignored `terraform.tfvars` in **bootstrap** (not the same file as `dev/`):

```hcl
aws_region        = "eu-central-1"
state_bucket_name = "dating-tfstate-907390934996-euc1"
lock_table_name   = "dating-terraform-locks"
```

```powershell
terraform init
terraform plan -out=tfplan
terraform show tfplan
```

Plan must show create of `aws_s3_bucket.state` (and versioning/encryption/public-access-block) and `aws_dynamodb_table.locks` only. If the plan includes VPC, ECS, RDS, or `food-*`, **abort**.

Product already consented to this cheap bootstrap. Then:

```powershell
terraform apply tfplan
terraform output
```

Replace `c:\dev\piza\dating\infra\terraform\dev\backend.tf` so the **active** (uncommented) content is:

```hcl
terraform {
  backend "s3" {
    bucket         = "dating-tfstate-907390934996-euc1"
    key            = "dating/dev/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "dating-terraform-locks"
    encrypt        = true
  }
}
```

Keep a short comment that bootstrap created this backend. Do not leave `us-east-1` in the live block.

```powershell
Set-Location c:\dev\piza\dating\infra\terraform\dev
terraform init -migrate-state -force-copy -input=false
```

Confirm init output mentions the S3 backend / bucket name. **Stop.** No `terraform plan` or `apply` in `dev/` this phase.

---

## Rollback if it fails

- Plan wrong: do not apply; hand back to architect
- Apply failed mid-way: `terraform apply` again in bootstrap, or `terraform destroy` **only** in bootstrap after operator consent
- `dev` init fails: do not apply `dev`; paste the error
- Do not delete Going2Eat S3/DynamoDB

---

## What QA should query

Frankfurt, profile `pizza`:

```powershell
aws s3api head-bucket --bucket dating-tfstate-907390934996-euc1 --region eu-central-1 --profile pizza
aws dynamodb describe-table --table-name dating-terraform-locks --region eu-central-1 --profile pizza --query "Table.TableStatus"
aws s3api get-bucket-location --bucket dating-tfstate-907390934996-euc1 --profile pizza
```

- `dev/backend.tf` has the S3 backend **uncommented**, region `eu-central-1`, those names
- `terraform init` in `dev` reports S3 backend (not “backend disabled”)
- Console: region **Europe (Frankfurt)** → S3 bucket + DynamoDB table above. No Dating VPC required.

---

## Next

```text
--upload-agent devops phase 2
```
