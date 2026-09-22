# Handoff: first-upload — architect — phase 5e

**Agent:** architect  
**Phase:** `5e` Load balancer (ALB)  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** designed

---

## Summary

- Product go. Target **only** `module.alb`.
- Creates: ALB `dating-dev-alb` (internet-facing, public subnets, existing ALB SG), UI + API target groups, **HTTP:80 forward** (no cert → no 443, no redirect). Listener rules for API paths stay in this module.
- Must not create ECS tasks, RDS, Redis, CloudFront, extra NAT.

---

## What must already exist

- VPC, public subnets, `aws_security_group.alb` (phase 3)
- Empty `acm_certificate_arn` / `domain_name` in tfvars
- Profile `pizza`, `eu-central-1`

---

## Working directory

`c:\dev\piza\dating\infra\terraform\dev`

---

## Terraform -target (required)

```
module.alb
```

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
Set-Location c:\dev\piza\dating\infra\terraform\dev

terraform plan -out=tfplan -target="module.alb"
terraform show -no-color tfplan
```

Abort if plan includes `aws_ecs_*`, `aws_db_instance`, ElastiCache, CloudFront, NAT, `food-`. Expect ALB + 2 target groups + HTTP listener + listener rules (several adds). **No** `aws_lb_listener.https`.

If clean, apply:

```powershell
terraform apply tfplan
terraform output alb_dns_name
```

---

## Blast radius

- **AWS:** one public ALB in Frankfurt. Idle ~$15–25/month. Security group already allows 80 from internet (phase 3).
- **Going2Eat:** none

---

## Rollback

- Wrong plan: do not apply
- Destroy later: `-target="module.alb"` (consent). Deletion protection is off.

---

## What QA should query

```powershell
aws elbv2 describe-load-balancers --names dating-dev-alb --region eu-central-1 --profile pizza --query "LoadBalancers[0].{name:LoadBalancerName,dns:DNSName,state:State.Code,scheme:Scheme}" --output json
aws ecs describe-services --region eu-north-1 --profile pizza --cluster food-cluster --services food-backend-service --query "services[0].{desired:desiredCount,running:runningCount}" --output json
```

- State `active`, scheme `internet-facing`, DNS present
- Do **not** require curl `/health` 200

Console: Frankfurt → **EC2** → Load Balancers → `dating-dev-alb` → State Active, copy DNS name.

---

## Next

```text
--upload-agent devops phase 5e
```
