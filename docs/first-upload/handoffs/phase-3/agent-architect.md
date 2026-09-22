# Handoff: first-upload — architect — phase 3

**Agent:** architect  
**Phase:** `3` Network + ECR  
**Date:** 2026-09-19  
**Status:** complete  
**Verdict:** designed

---

## Summary

- Product go for **design** only. Apply needs a separate **yes** from the operator after they see the plan.
- Create `dating-dev` VPC (CIDR `10.20.0.0/16`, 2 AZs, **one** NAT), security groups, ECR `dating-api` + `dating-ui`.
- **Skip VPC endpoints this phase.** `enable_vpc_endpoints = true` in tfvars, but interface endpoints (ECR, logs, Secrets, SSM, Rekognition, × 2 AZs) add roughly **another $100+/month**. Product sold phase 3 as NAT (~$1/day). Endpoints wait until we need private AWS API access without NAT data. Gateway S3 is in that same module — do not `-target module.vpc_endpoints`.
- Do **not** apply the whole `dev` root. Untargeted apply would also create RDS, Redis, ALB, ECS, photos, CloudFront, **and** those endpoints.

---

## What must already exist

- Phase 1 tfvars (`eu-central-1`, empty domain, `single_nat_gateway = true`)
- Phase 2 S3 backend working (`dating-tfstate-907390934996-euc1`)
- Profile `pizza`

---

## Working directory

`c:\dev\piza\dating\infra\terraform\dev`

---

## Terraform -target (required)

```
module.networking
module.security_groups
module.ecr
```

**Do not target:** `module.vpc_endpoints`, `module.rds`, `module.redis`, `module.s3_photos`, `module.cloudfront`, `module.iam`, `module.alb`, `module.ecs`, `module.secrets`

Expected creates (names use prefix `dating-dev`):

- VPC `dating-dev-vpc`, IGW, 2 public + 2 private subnets, 1 EIP, 1 NAT, route tables
- SGs for alb/api/ui/rds/redis (empty groups; no RDS/Redis **instances**)
- ECR repos `dating-api`, `dating-ui` + lifecycle policies

Abort if plan includes: `aws_db_instance`, ElastiCache, `aws_lb`, `aws_ecs_*`, `food-`, CloudFront, Rekognition endpoint, or more than one NAT.

---

## Blast radius

- **AWS:** new VPC in Frankfurt + NAT (hourly) + two empty ECR repos
- **Going2Eat:** must be 0 resources in the plan
- **Cost clock:** NAT starts when apply succeeds, 24/7 until destroy

---

## Commands (PowerShell)

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
Set-Location c:\dev\piza\dating\infra\terraform\dev

terraform plan -out=tfplan `
  -target=module.networking `
  -target=module.security_groups `
  -target=module.ecr

terraform show -no-color tfplan
```

Print the `Plan:` line and a resource list. **STOP. Do not apply** until the operator replies yes (e.g. `yes apply phase 3`).

Then, and only then:

```powershell
terraform apply tfplan
```

Do not run untargeted `terraform apply`.

---

## Rollback

- Operator says no: delete `tfplan`, do nothing in AWS
- Apply fails: retry **same targets** only; do not widen
- Tear down later: `terraform destroy` with the **same three targets** (needs consent). Do not destroy bootstrap state bucket.

---

## What QA should query

Frankfurt, `pizza`:

```powershell
aws ec2 describe-vpcs --region eu-central-1 --profile pizza --filters "Name=tag:Name,Values=dating-dev-vpc" --query "Vpcs[].{id:VpcId,cidr:CidrBlock,name:Tags[?Key=='Name'].Value|[0]}" --output json
aws ecr describe-repositories --region eu-central-1 --profile pizza --repository-names dating-api dating-ui --query "repositories[].repositoryName" --output json
aws ecs describe-services --region eu-north-1 --profile pizza --cluster food-cluster --services food-backend-service --query "services[0].{desired:desiredCount,running:runningCount}" --output json
```

- Plan/apply had no `food-*`
- Still no Dating ALB DNS (phase 5e)

---

## Next

```text
--upload-agent devops phase 3
```

DevOps: plan + show, then **wait**. Apply only after explicit operator yes.
