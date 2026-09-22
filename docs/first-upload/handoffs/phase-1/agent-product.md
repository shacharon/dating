# Handoff: first-upload — product — phase 1

**Agent:** product  
**Phase:** `1` Settings file  
**Date:** 2026-09-19  
**Status:** complete  
**Verdict:** go

---

## Summary

- Phase 0 is done: same AWS account `907390934996`, profile `pizza`, user `shachar-admin`, not a new account.
- Phase 1 is answers on disk only. No AWS create. No `terraform apply`.
- Copy `infra/terraform/dev/terraform.tfvars.example` → gitignored `infra/terraform/dev/terraform.tfvars`.
- Change region to `eu-central-1`. Leave `domain_name`, `route53_zone_id`, `acm_certificate_arn` empty.
- Keep example sizing (`single_nat_gateway = true`, small RDS/Redis, desired count 1). Do not fill Google secrets.

---

## Exit test

- `infra/terraform/dev/terraform.tfvars` exists (not committed; listed in `infra/terraform/.gitignore`).
- File has `aws_region = "eu-central-1"` and empty domain/cert/zone.
- `terraform init -backend=false` then `terraform validate` in `infra/terraform/dev` succeeds.

---

## Money

- $0. No AWS resources.

---

## Do not

- Apply Terraform.
- Touch Going2Eat / `food-*`.
- Buy or set a domain.
- Use root.

---

## Next

```text
--upload-agent architect phase 1
```
