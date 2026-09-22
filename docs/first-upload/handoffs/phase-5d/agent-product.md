# Handoff: first-upload — product — phase 5d

**Agent:** product  
**Phase:** `5d` Redis  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** go

---

## Summary

- Phase 5c QA passed. Postgres is available.
- What: one ElastiCache Redis node in the same private VPC (`dating-dev-redis`, `cache.t4g.micro`, not Multi-AZ). Sessions/cache for the API.
- Why: the app expects Redis; without it ECS will fail later.
- Not yet: ALB, ECS, website, Google, CloudFront, Prisma tables.
- Operator started 5d after 5c — treat as intent to create Redis. DevOps still **shows plan**; apply only if `module.redis` only.

---

## Locked decisions

- Account `907390934996`, profile `pizza`, `eu-central-1`
- Node `cache.t4g.micro` (tfvars). Transit encryption off (dev tfvars).
- Private only. Do not touch food Redis/ElastiCache in Stockholm.

---

## Money

- Roughly **$10–15/month** idle (`cache.t4g.micro`), on top of NAT + RDS.
- Create wait ~5–15 minutes. Smaller jump than RDS.

---

## Exit test

- Replication group / cluster `dating-dev-redis` (or similar `dating-dev-*redis*`) in `eu-central-1`
- Status **available**
- Going2Eat ECS unchanged (spot-check)

---

## Do not

- Apply ALB, ECS, CloudFront, RDS again
- Print Redis AUTH tokens if any
- Start the website

---

## Next

```text
--upload-agent architect phase 5d
```
