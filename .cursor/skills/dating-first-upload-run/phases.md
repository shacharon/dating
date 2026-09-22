# Per-phase playbook (first upload)

Load the section for the current `phase` id only. Full product wording: [docs/DATING_FIRST_UPLOAD_PLAN.md](../../../docs/DATING_FIRST_UPLOAD_PLAN.md).

Shared: profile `pizza`, region `eu-central-1`, names `dating-*`, no `food-*`.

## Phase 0 — Account

**Status:** done.  
**Product:** Confirm same account, not a new signup.  
**Architect/DevOps:** No AWS creates.  
**QA:** `aws sts get-caller-identity --profile pizza` → `907390934996` + `shachar-admin`.

## Phase 1 — Settings file

**Product:** Answers on disk. $0.  
**Architect:** Map example `terraform.tfvars.example` → gitignored `terraform.tfvars`: `aws_region = "eu-central-1"`, empty domain/cert/zone. Keep cheap sizing defaults.  
**DevOps:** Create/edit file; `terraform init -backend=false`; `terraform validate` in `infra/terraform/dev`.  
**QA:** File exists; region/domain values; validate OK. Not in git if gitignored.

## Phase 2 — Remote state

**Product:** Terraform memory. Pennies.  
**Architect:** `infra/terraform/bootstrap` unique bucket name; then `dev/backend.tf`; `terraform init -migrate-state`.  
**DevOps:** Apply bootstrap (show plan first); wire backend.  
**QA:** Bucket + DynamoDB lock in Frankfurt; `dev` init succeeds with remote backend.

## Phase 3 — Network + ECR

**Product:** First daily cost (NAT). Consent.  
**Architect:** `-target` `module.networking` `module.security_groups` `module.ecr` (and VPC endpoints only if required for this apply).  
**DevOps:** Apply targets only after consent.  
**QA:** VPC + ECR repos exist. Food cluster unchanged.

## Phase 4 — Images

**Product:** Put code on shelves.  
**Architect:** Login ECR Frankfurt; docker build contexts from repo Dockerfiles; tag + push `dating-api` and `dating-ui`.  
**DevOps:** Follow `deploy-aws-app` skill; do not deploy ECS yet.  
**QA:** Both tags in ECR.

## Phase 5a — S3 photos

**Architect:** `-target module.s3_photos`  
**QA:** Bucket exists, public access blocked.

## Phase 5b — CloudFront

**Product:** Optional skip.  
**Architect:** `-target module.cloudfront` or write skip in handoff.  
**QA:** Distribution exists or skip recorded.

## Phase 5c — RDS

**Product:** Expensive. Consent. Long wait.  
**Architect:** `-target module.rds`  
**QA:** `available`. No password in handoff.

## Phase 5d — Redis

**Architect:** `-target module.redis`  
**QA:** `available`.

## Phase 5e — ALB

**Architect:** `-target module.alb`; HTTP-only (empty cert).  
**QA:** DNS name exists. Health 200 is **not** this phase.

## Phase 5f — IAM + secrets

**Architect:** `-target module.iam` + secrets module as wired in `dev`.  
**QA:** Roles + secret ARNs exist. Google may be placeholder.

## Phase 5g — ECS

**Product:** First upload. Consent.  
**Architect:** `-target module.ecs`; images from phase 4; desired count 1.  
**DevOps:** Wait for stable; do not scale food.  
**QA:** `curl http://<alb-dns>/health` → 200.

## Phase 6 — Migrations

**Architect:** One-off ECS task or documented private-network migrate.  
**QA:** Migrations applied / API using schema.

## Phase 7 — Domain + HTTPS

**Blocked until operator has a domain.**  
**Architect:** ACM in `eu-central-1`, Route53, tfvars domain fields, ALB HTTPS listener.  
**QA:** `https://<domain>/` loads.

## Phase 8 — Google

**Architect:** Console origins + secrets + cookie/CORS.  
**QA:** Login + photo in real browser.
