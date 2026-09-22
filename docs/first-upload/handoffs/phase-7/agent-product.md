# Handoff: first-upload — product — phase 7

**Agent:** product  
**Phase:** `7` Domain + HTTPS  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** parked (no-go until domain)

---

## Summary

- Phase 6 QA passed. Tables exist. App is on the **ugly HTTP** ALB URL.
- What this phase is: buy/point a real domain, ACM cert in Frankfurt, HTTPS on the load balancer.
- Operator: **no domain.** Park. Do **not** wait. Do **not** invent a domain or touch `going2eat.food`.
- Continue on HTTP: `http://dating-dev-alb-1407086009.eu-central-1.elb.amazonaws.com`
- **Phase 8 (Google) also waits** for a real HTTPS origin (`Secure` cookies). Park it the same way when you run product 8 — do not try Google on this hostname as “done.”

---

## Locked decisions

- Account `907390934996`, profile `pizza`, `eu-central-1`
- Empty `domain_name` / `acm_certificate_arn` until unparked
- ALB stays HTTP-only

---

## Money

- $0 while parked. Cert + HTTPS later is cheap vs NAT/RDS; **not** started.

---

## Exit test (when unparked)

- `https://<domain>/` loads

**This run:** skip recorded. Do not fail the upload for missing HTTPS.

---

## Do not

- Buy a domain in this chat
- Apply ACM / HTTPS listeners
- Point Dating at the food Route53 zone
- Run architect/devops as a real apply

---

## Next

Architect **records the skip only** (no AWS):

```text
--upload-agent architect phase 7
```

Then park login the same way:

```text
--upload-agent product phase 8
```
