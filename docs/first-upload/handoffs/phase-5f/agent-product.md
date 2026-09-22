# Handoff: first-upload — product — phase 5f

**Agent:** product  
**Phase:** `5f` IAM + secret placeholders  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** go

---

## Summary

- Phase 5e QA passed. ALB is active.
- What: IAM roles so ECS can pull images, write logs, read the RDS secret, use the photos bucket. Extra Secrets Manager / SSM slots for Google etc. may stay **placeholder**.
- Why: 5g cannot start tasks without execution/task roles.
- Not yet: start ECS (5g), HTTPS, Google login, CloudFront (5b parked).
- **Hard:** applying `module.secrets` must **not** create CloudFront. `enable_cloudfront = true` in tfvars would pull CDN via secrets. Architect must target IAM-only (and secrets only if CDN is not in the plan).
- Operator started 5f — cheap; DevOps shows plan; apply if no ECS/CloudFront/food.

---

## Locked decisions

- Account `907390934996`, profile `pizza`, `eu-central-1`
- Do not fill real Google client secret
- Do not print secret values
- 5b still skipped

---

## Money

- IAM is free. Extra secrets: cents. Not a NAT-level stop.

---

## Exit test

- ECS **task** role and **execution** role exist (names `dating-dev-*`)
- Execution role can be attached to secrets policy if secrets module applied without CDN
- No Dating ECS services running yet (5g)
- Plan/apply did not create CloudFront or food resources

---

## Do not

- `terraform apply` `module.ecs` this phase
- `-target module.cloudfront`
- Start Fargate tasks

---

## Next

```text
--upload-agent architect phase 5f
```
