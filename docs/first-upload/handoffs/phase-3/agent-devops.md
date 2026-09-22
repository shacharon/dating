# Handoff: first-upload — devops — phase 3

**Agent:** devops  
**Phase:** `3` Network + ECR  
**Date:** 2026-09-19  
**Status:** complete  
**Verdict:** applied

---

## Summary

- Operator consented: `yes apply phase 3`.
- Applied saved `tfplan`. `Apply complete! Resources: 37 added, 0 changed, 0 destroyed.`
- NAT is **now billing**. No RDS/Redis/ALB/ECS/food in this apply.

---

## Commands run

```powershell
$env:AWS_PROFILE = "pizza"
$env:AWS_DEFAULT_REGION = "eu-central-1"
Set-Location c:\dev\piza\dating\infra\terraform\dev
terraform apply tfplan
```

---

## AWS ids (no secrets)

| Thing | Value |
|-------|--------|
| VPC | `vpc-0c6e32b971b76b4eb` (Name `dating-dev-vpc`) |
| NAT | `nat-03249cf7e7b786b31` |
| ECR | `dating-api`, `dating-ui` |
| Region | `eu-central-1` |
| Profile | `pizza` |

---

## Errors

- None on apply.

---

## Console (operator)

Frankfurt → **VPC** → Your VPCs → `dating-dev-vpc`  
Frankfurt → **Elastic Container Registry** → `dating-api`, `dating-ui` (empty)

---

## Next

```text
--upload-agent qa phase 3
```
