# Dating AWS go-live readiness

**Date:** 2026-09-19  
**Verdict:** Code/IaC/CI are ready. **Nothing is live on AWS yet.** Sprint 20 `LIVE_APPLY` is still **ON HOLD**.

---

## Verdict (one line)

Prep is done in the repo; go-live = lift hold → pick account/domain → `terraform apply` → secrets → CI deploy → fill `VERIFIED_DEV.md`.

---

## What we HAVE

| Area | Status | Where |
|------|--------|--------|
| Runbook (L1–L10 from Going2Eat) | Done | `DEPLOY_AWS_DEV.md` |
| API + UI Dockerfiles | Done | `dating-api/Dockerfile`, `dating-ui/Dockerfile` |
| Terraform `dev` (full stack) | Done, **not applied** | `infra/terraform/dev` |
| Secrets wiring in IaC | Done on paper | Sprint 20 Story 03 |
| CI deploy (OIDC → ECR → migrate → API/UI → health) | Done on paper | `.github/workflows/deploy-dev.yml` |
| Smoke / verify tooling | Done, empty results | `VERIFIED_DEV.md` = PENDING_INFRA |
| Target architecture locked | Documented | ALB → UI+API; RDS 16; Redis; S3; Rekognition; CF photos |

Sprint stories **01–05**: code complete. **06–07** (admin gate): parked until after VERIFIED.

---

## What we DO NOT HAVE (live)

| Missing | Notes |
|---------|--------|
| Dating VPC / ECS / ALB / RDS / Redis / S3 | Only Going2Eat `food-cluster` found on pizza/`eu-north-1` |
| Applied Terraform state | PENDING_APPLY |
| Live hostname + ACM | `DEV_BASE_URL` TBD |
| Secrets seeded in AWS | OPENAI, Google OAuth, session pepper, DB URL |
| GitHub Environment `dev` vars | `AWS_ROLE_ARN`, ECR URIs, region — required for CI OIDC |
| First successful deploy | PENDING_LIVE_DEPLOY |
| VERIFIED_DEV sign-off | All checks TBD |
| Dating Cursor deploy JSON/skill | Deferred until infra exists |

---

## Dating needs vs Going2Eat

Going2Eat = API + Redis + LLM/Maps (**no app DB**).  
Dating needs **more**:

| Component | Required |
|-----------|----------|
| RDS Postgres 16 | Yes |
| ElastiCache Redis | Yes (sessions, Bull, socket.io) |
| S3 photos | Yes |
| Rekognition | Yes |
| CloudFront photo CDN | Recommended |
| ALB + sticky sessions | Yes (WebSockets) |
| ECS API + UI + migrate one-shot | Yes |
| Secrets Manager / SSM | Yes (OPENAI is boot-blocker) |
| ACM + domain | Yes for real HTTPS |
| Google OAuth redirect URIs | Yes |

Terraform default region: **`us-east-1`** (not food’s `eu-north-1`). **Account must be chosen** (pizza `907390934996` vs other profiles).

---

## Permissions (do we have them?)

**Unknown until account is chosen and probed.**

Local profiles:

| Profile | Account | Role today |
|---------|---------|------------|
| `pizza` | `907390934996` | Going2Eat live |
| `default` | `342892371072` | Different account |
| `scorable` / `food` / `mikhail-ecs` | other | Check which is dating’s home |

**Needed for apply + CI role:**

- [ ] VPC / NAT / SG  
- [ ] ECS + ECR + task IAM + CloudWatch Logs  
- [ ] RDS + Secrets Manager  
- [ ] ElastiCache  
- [ ] S3 + CloudFront  
- [ ] ALB + ACM + Route53 (or external DNS)  
- [ ] Rekognition on task role  
- [ ] SSM / Secrets read for tasks  
- [ ] GitHub OIDC provider + deploy role  
- [ ] Terraform state backend (S3 + lock)

CI uses **OIDC only** (no static keys). Missing GitHub `dev` env vars = deploy fails even after Terraform.

**Action:** after locking account, run a permission probe (try describe/create dry-run or IAM simulate) before `terraform apply`.

---

## Likely missed items

1. Explicitly **lift Sprint 20 LIVE_APPLY hold**  
2. Lock **account + region + domain** (don’t mix with food VPC)  
3. **ACM + DNS** before calling it “live”  
4. **Google OAuth** redirects for that URL  
5. Seed **OPENAI** (API crash-loops without it)  
6. Migrate as **one-shot**, not on every task boot  
7. Cookie/CORS for HTTPS (`Secure`, `SameSite`, `COOKIE_DOMAIN`)  
8. `PHOTO_STORAGE_DRIVER=s3`  
9. ALB **stickiness** for `/socket.io`  
10. API **min tasks ≥ 1** (workers in-process)  
11. GitHub Environment **approval + OIDC**  
12. Admin Stories **06–07** after first VERIFIED  
13. **Cost** (NAT + RDS + Redis + ALB + 2 services — unlike food scaled to 0)  
14. Wire Cursor `deploy-aws-app` for dating **after** first apply  

---

## Ordered go-live (when you proceed — new chat)

1. Choose AWS account + region + hostname  
2. Permission / OIDC / TF-backend probe  
3. Lift Sprint 20 hold  
4. `terraform apply` (`infra/terraform/dev`)  
5. Seed secrets  
6. Configure GitHub Environment `dev`  
7. First deploy (migrate → API → UI → `/health`)  
8. Fill `VERIFIED_DEV.md`  
9. Stories 06–07 admin gate  
10. Optional: dating `.cursor/aws-deploy.json` + project skill  

---

## This chat vs next

| Now (this prep) | Next chat |
|-----------------|-----------|
| Inventory + gaps | Actually apply / create skeleton |
| No AWS changes | Account choice + terraform + secrets |
