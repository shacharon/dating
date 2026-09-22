# Handoff: first-upload — product — phase 4

**Agent:** product  
**Phase:** `4` Build and push images  
**Date:** 2026-09-19  
**Status:** complete  
**Verdict:** go

---

## Summary

- Phase 3 QA passed. ECR shelves exist and are empty.
- What: build **two** Docker images on the operator PC (`dating-api`, `dating-ui`) and push them to Frankfurt ECR with a real tag (not only an untagged digest).
- Why: ECS must not start until images exist, or services stay red for a fake reason.
- Not yet: start ECS, RDS, Redis, ALB, website URL, Google login.
- Frontend hosting: **no change** — Next.js UI stays Fargate (not Amplify/EC2/S3). This phase only fills ECR.

---

## Locked decisions

- Account `907390934996`, profile `pizza`, region `eu-central-1`
- Repos: `dating-api`, `dating-ui` (already created)
- Dockerfiles: `dating-api/Dockerfile`, `dating-ui/Dockerfile`
- Do not touch Going2Eat ECR/`food-backend`

---

## Money

- No new hourly NAT. NAT already running from phase 3.
- This phase: local CPU + small ECR storage/transfer. Not a new “yes apply” like NAT, but DevOps should still not push to `food-*`.

---

## Exit test

- `aws ecr describe-images` (or list-images) for **both** `dating-api` and `dating-ui` in `eu-central-1` shows at least one tagged image
- Same tag name on both (architect picks, e.g. git sha or `dev-YYYYMMDD`) plus optional `latest`
- Images are in account `907390934996`, region Frankfurt — not Stockholm food repo

---

## Do not

- `terraform apply` for RDS/ALB/ECS
- `docker push` to Going2Eat
- Expect containers to “run” on AWS until phase 5g

---

## Next

```text
--upload-agent architect phase 4
```
