# Handoff: first-upload — product — phase 5c

**Agent:** product  
**Phase:** `5c` Database (RDS Postgres)  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** go

---

## Summary

- Prior: 5a QA pass (photos bucket later renamed to `dating-dev-photos`). 5b skipped.
- What: create **one** Postgres 16 instance in the private subnets of `dating-dev-vpc`. Class `db.t4g.small`, ~20 GB, not Multi-AZ.
- Why: the app needs a real database. Empty RDS is not tables yet (phase 6).
- Not yet: Redis, ALB, ECS, website URL, Google, CloudFront.
- Operator **yes** to the RDS idle cost (~$30–40/month on top of NAT). That is spend consent for **RDS-only**. DevOps still **shows the plan**; apply only if the plan is `module.rds` (no ALB/ECS/Redis/food/CloudFront).

---

## Locked decisions

- Account `907390934996`, profile `pizza`, region `eu-central-1`
- VPC `dating-dev-vpc` / `vpc-0c6e32b971b76b4eb`
- Instance `db.t4g.small` (from tfvars)
- DB stays **private** (no public IP). NAT stays as-is (parked discussion).
- Password in Secrets Manager only — never in chat

---

## Money

- RDS ~$30–40/month idle + existing NAT ~$32–40/month.
- Create wait 15–20+ minutes.
- Consent: operator `yes` for this phase’s RDS apply if plan is clean.

---

## Exit test

- RDS instance in `eu-central-1`, status **`available`**
- Named/tagged dating (`dating-dev` / `dating-*`)
- Not publicly accessible
- Going2Eat / `food-*` unchanged

---

## Do not

- Apply Redis, ALB, ECS, CloudFront, VPC endpoints
- Print the master password
- Run Prisma migrate (phase 6)
- Touch food RDS if any

---

## Next

```text
--upload-agent architect phase 5c
```
