# Handoff: first-upload — product — phase 2

**Agent:** product  
**Phase:** `2` Terraform notebook (remote state)  
**Date:** 2026-09-19  
**Status:** complete  
**Verdict:** go

---

## Summary

- Phase 1 QA passed. Allowed to start phase 2.
- What: create Terraform’s memory in AWS — one S3 bucket + one DynamoDB lock table — then point `infra/terraform/dev` at that backend.
- Why: so later applies do not fight or duplicate Dating resources.
- Not yet: VPC, NAT, database, load balancer, website. Operator will still not see an app URL.
- This is the first time Dating creates anything in AWS. It will show in the console in **Frankfurt** (`eu-central-1`): S3 + DynamoDB only, names `dating-*`.

---

## Locked decisions

- Account `907390934996`, profile `pizza`, user `shachar-admin`
- Region `eu-central-1`
- No domain
- Do not touch Going2Eat / `food-*`
- Do not use root

---

## Money

- Pennies (S3 + small DynamoDB). Not the ~$1/day NAT (that is phase 3).
- DevOps must still show the bootstrap **plan** before apply. Operator already moved the pipeline here; treat that as consent for this cheap bootstrap only — not for VPC/RDS.

---

## Exit test

- State bucket exists in `eu-central-1`
- Lock table exists in `eu-central-1`
- `terraform init` in `infra/terraform/dev` uses the S3 backend (not local-only)
- Bucket name is unique and `dating-*` (or clearly dating tfstate). Not a food/Going2Eat bucket.

---

## Do not

- Apply `dev/` stack (networking, RDS, ECS)
- Change region back to Virginia/Stockholm
- Create domain or Google login
- Delete or modify `food-*` resources

---

## Next

```text
--upload-agent architect phase 2
```
