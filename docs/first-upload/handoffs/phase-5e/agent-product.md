# Handoff: first-upload — product — phase 5e

**Agent:** product  
**Phase:** `5e` Load balancer (ALB)  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** go

---

## Summary

- Phase 5d QA passed. Redis is available.
- What: public Application Load Balancer `dating-dev-alb` in Frankfurt, **HTTP only** (empty cert). Target groups for UI + API. This creates the **ugly hostname**.
- Why: later ECS tasks register here. Users will hit this URL after 5g.
- Not yet: ECS (5f/5g), HTTPS/domain (7), Google (8), `/health` 200 (5g). Opening the URL now may error — hostname existing is enough.
- Operator started 5e — intent to create ALB. DevOps shows plan; apply only if `module.alb`.

---

## Locked decisions

- Account `907390934996`, profile `pizza`, `eu-central-1`
- `acm_certificate_arn` / `domain_name` empty → HTTP forward, no HTTPS listener
- Do not touch food ALB in Stockholm

---

## Money

- ALB idle roughly **$15–25/month** plus a little traffic later. On top of NAT + RDS + Redis.
- Create is usually a few minutes.

---

## Exit test

- ALB exists in `eu-central-1`, name `dating-dev-alb` (or `dating-*-alb`)
- DNS name exists (`*.eu-central-1.elb.amazonaws.com`)
- State `active`
- `/health` 200 **not** required
- food ECS unchanged (spot-check)

---

## Do not

- Apply ECS, CloudFront, RDS/Redis again
- Set a domain or cert
- Fail QA because the website is not up

---

## Next

```text
--upload-agent architect phase 5e
```
