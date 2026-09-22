# Handoff: first-upload — product — phase 5a

**Agent:** product  
**Phase:** `5a` Photo bucket (S3)  
**Date:** 2026-09-20  
**Status:** complete  
**Verdict:** go

---

## Summary

- Phase 4 QA passed. Images are in ECR.
- What: create the **private** S3 bucket for user photos (`dating-dev-photos-*` prefix). Not the Terraform state bucket.
- Why: later uploads need a place that is not public.
- Not yet: CloudFront (5b, optional), RDS, Redis, ALB, ECS, website, Google.
- Parked (do not fix now): `dating-api` image ~200 MB; NAT vs food public-IP.

---

## Locked decisions

- Account `907390934996`, profile `pizza`, region `eu-central-1`
- Names `dating-*` only
- Public access **blocked** (no public photo URLs from this bucket)
- Do not touch `dating-tfstate-*` or Going2Eat buckets

---

## Money

- Cheap (empty S3). Not a NAT-level stop. DevOps still **shows plan** then apply if the plan is S3 photos only.

---

## Exit test

- Photos bucket exists in `eu-central-1` (name starts `dating-dev-photos-`, Name tag `dating-dev-photos`)
- Public access block on (all four blocks true)
- Not the tfstate bucket `dating-tfstate-907390934996-euc1`

---

## Do not

- Apply RDS, Redis, ALB, ECS, CloudFront, VPC endpoints
- Make the bucket public
- Upload real user photos in this phase

---

## Next

```text
--upload-agent architect phase 5a
```
