# Handoff: first-upload — devops — phase 5e

**Agent:** devops  
**Phase:** `5e` Load balancer (ALB)  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** applied

---

## Summary

- First apply created ALB + TGs + HTTP listener; **failed** on one listener rule (AWS max **5** path values; we had 6).
- Split rules in `infra/terraform/modules/alb/main.tf` (`api_paths` + `api_socket`). Second apply: 2 rules added.
- Ugly URL exists. `/health` 200 **not** expected (no ECS yet).

---

## Commands run

```powershell
terraform plan -out=tfplan -target="module.alb"
terraform apply tfplan
# after rule split, plan+apply again
terraform output alb_dns_name
```

---

## AWS ids (no secrets)

| Thing | Value |
|-------|--------|
| ALB | `dating-dev-alb` |
| DNS | `dating-dev-alb-1407086009.eu-central-1.elb.amazonaws.com` |
| App URL | `http://dating-dev-alb-1407086009.eu-central-1.elb.amazonaws.com` |
| Region | `eu-central-1` |

---

## Errors

- Fixed: `A rule can only have '5' condition values`.

---

## Console

Frankfurt → **EC2** → Load Balancers → **`dating-dev-alb`** → State **Active**. DNS name as above.

Browser may show 503 — no servers yet.

---

## Next

```text
--upload-agent qa phase 5e
```
