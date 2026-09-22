# Handoff: first-upload — product — phase 3

**Agent:** product  
**Phase:** `3` Network + image shelves (ECR)  
**Date:** 2026-09-19  
**Status:** complete  
**Verdict:** go

---

## Summary

- Phase 2 QA passed. Allowed to **design** phase 3.
- What: Dating’s own private network in Frankfurt (VPC, subnets, one NAT, security groups) and two empty image shelves (ECR `dating-api`, `dating-ui`). VPC endpoints may come with this if already on in tfvars — architect must say yes/no in the plan.
- Why: later Docker images need ECR; later servers need a VPC. Do this before starting ECS.
- Not yet: build/push images, database, Redis, load balancer, website, login.
- Console after apply: Frankfurt → **VPC** (name like `dating-dev`) and **ECR** (two repos). Still no URL.

---

## Locked decisions

- Account `907390934996`, profile `pizza`
- Region `eu-central-1`
- Names `dating-*` only
- `single_nat_gateway = true` (one NAT, cheaper)
- Empty domain
- Never touch `food-*` / Going2Eat (Stockholm)

---

## Money

- **First real daily cost.** NAT Gateway is the main bill (~on the order of $1/day, not pennies).
- ECR empty repos are cheap. VPC itself is cheap. Endpoints add a smaller extra if included.
- **Hard stop:** DevOps must show `terraform plan` and **wait for the operator to say yes** before `apply`. Product go is not apply consent.

---

## Exit test

- VPC exists in `eu-central-1`, named for dating (`dating-dev` / `dating-*`), CIDR `10.20.0.0/16`
- ECR repositories `dating-api` and `dating-ui` exist in `eu-central-1`
- No `food-*` creates/updates/destroys in the plan or in AWS from this apply
- Going2Eat cluster in Stockholm unchanged (spot-check `food-backend-service` if cheap to describe)

---

## Do not

- Apply RDS, Redis, ALB, ECS, S3 photos, CloudFront this phase
- Push Docker images (phase 4)
- Use root
- Scale or change Going2Eat

---

## Next

```text
--upload-agent architect phase 3
```

After architect: `--upload-agent devops phase 3` — apply only after operator yes on the plan.
