# Handoff: first-upload — product — phase 5g

**Agent:** product  
**Phase:** `5g` Start servers (ECS Fargate)  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** go (after operator yes on spend)

---

## Summary

- Phase 5f QA passed. Roles `dating-dev-task` / `dating-dev-exec` exist.
- What: turn on **two small Fargate services** (API + UI), one task each, behind the existing ugly ALB. Images already in ECR (`2ea2c3f` / `latest`).
- Why: this is the **first upload**. Exit is `/health` 200 on the ALB hostname.
- Not yet: Prisma tables (6), HTTPS/domain (7), Google login (8). Login will fail. App pages that need DB may fail until 6. CloudFront still parked (5b).
- Operator started 5g. **DevOps must show the plan and wait for an explicit yes** before apply (Fargate is a new hourly bill on top of NAT + RDS + Redis + ALB).
- **Hard:** `module.ecs` in Terraform currently reads `module.secrets` and, while `enable_cloudfront = true`, `module.cloudfront`. Applying ECS **must not** create CloudFront or touch `food-*`. Architect designs a safe `-target` / graph (or requires `enable_cloudfront = false` **only if operator agrees**). Do not sneak CDN in.

---

## Locked decisions

- Account `907390934996`, profile `pizza`, `eu-central-1`
- Next.js stays on ECS, not Amplify
- HTTP only; ugly URL `dating-dev-alb-1407086009.eu-central-1.elb.amazonaws.com`
- Desired count **1** API + **1** UI
- Do not scale or change Going2Eat `food-cluster`

---

## Money

- New: Fargate (two `256`/`512`-class tasks typically **tens of dollars/month**, not $0).
- Already paying: NAT, RDS `db.t4g.small`, Redis, ALB.
- Apply only after operator **yes**.

---

## Exit test

- `curl http://dating-dev-alb-1407086009.eu-central-1.elb.amazonaws.com/health` → **200**
- Dating ECS services exist in Frankfurt; tasks running (not stuck 0/1)
- No Dating CloudFront created
- food-backend still desired 1 / running 1
- Google login **not** required

---

## Do not

- Apply CloudFront
- Touch `food-*`
- Require HTTPS or Google
- Fail QA only because DB tables are empty (that is phase 6) **unless** `/health` itself is not 200

---

## Next

```text
--upload-agent architect phase 5g
```
