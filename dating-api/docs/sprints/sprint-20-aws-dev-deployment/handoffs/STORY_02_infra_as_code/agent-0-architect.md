# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_infra_as_code.md](../../STORY_02_infra_as_code.md)  
**Sprint:** sprint-20-aws-dev-deployment  
**Date:** 2026-07-31  
**Status:** complete  

**Mode:** Retro lock — Terraform already on `main` (commit `d8997f0` + Story 03 secrets wiring). Agent 1 verifies parity / closes gaps only. **Do not require `terraform apply`** without AWS credentials. Skip Agent 4 (live apply/SG probe is human).

---

## Summary

- Full AWS **`dev`** stack as Terraform under `infra/terraform/` — VPC, SGs, RDS 16, Redis, S3 photos, IAM, ECR, ALB (sticky API TG, health `/health`), ECS Fargate API+UI, optional CloudFront + VPC endpoints, bootstrap remote state.
- Prod-extensible via `modules/` + copy `dev/` → `prod/` (or workspaces) with tfvars sizing.
- Story 03 **secrets module** is already wired from `dev/main.tf` — Agent 1 must **not** rip it out; treat as integration boundary.
- `github_oidc` module exists for Story 04 — **out of scope** for Story 2 code changes unless missing from docs only.

---

## Artifacts (locked layout)

```
infra/terraform/
├── bootstrap/           # S3 + DynamoDB state (optional first step)
├── modules/
│   ├── networking/
│   ├── security_groups/
│   ├── vpc_endpoints/   # toggle enable_vpc_endpoints
│   ├── rds/
│   ├── redis/
│   ├── s3_photos/
│   ├── cloudfront/      # toggle enable_cloudfront
│   ├── iam/
│   ├── ecr/
│   ├── alb/
│   ├── ecs/
│   ├── secrets/         # Story 03 — keep wired
│   └── github_oidc/     # Story 04 — do not redesign here
└── dev/                 # Root stack + README + outputs
```

Canonical human docs: `infra/terraform/dev/README.md`.

---

## Decisions (do not reverse without discussion)

### 1. Region / naming

- Default region: **`us-east-1`**.
- Name prefix: `${project}-${environment}` (e.g. `dating-dev`).
- Tags: `Project`, `Environment`, `ManagedBy=terraform`, `Sprint=20`.

### 2. Networking

- New VPC (not “reuse existing” for `dev` default).
- Public subnets → ALB; private → Fargate / RDS / Redis.
- Single NAT OK for `dev` (`single_nat_gateway` default true) to cut cost.
- VPC endpoints **on by default** (`enable_vpc_endpoints=true`) for ECR/SSM/S3/etc. to cut NAT — may disable for cheaper experiments.

### 3. Security groups (locked)

| SG | Ingress |
|----|---------|
| ALB | 443 (and 80 for redirect/bootstrap) from internet |
| API | app port **3001** from ALB SG (+ UI→API if present) |
| UI | **3000** from ALB SG |
| RDS | **5432** from API SG **only** |
| Redis | **6379** from API SG **only** |

- RDS/Redis **not** publicly accessible.

### 4. RDS

- Engine: **Postgres 16**.
- Class default: **`db.t4g.small`**.
- DB name: **`dating`**.
- `deletion_protection = false`, `skip_final_snapshot = true` for `dev` destroy hygiene.
- Credentials / `DATABASE_URL` via Secrets Manager (module output) — Story 03 consumes.
- App connection must use `sslmode=require` (documented in URL construction).

### 5. Redis

- Single-node ElastiCache in private subnets.
- Transit encryption optional via `redis_transit_encryption` → `redis://` vs `rediss://`.
- Output `redis_url` consumed by ECS env / secrets.

### 6. S3 photos

- Private bucket, **Block Public Access ON**.
- `force_destroy = true` for `dev` only.
- Task role: scoped `s3:Put/Get/Delete` on bucket; Rekognition `DetectModerationLabels` + `DetectFaces`.

### 7. CloudFront (optional but default on)

- `enable_cloudfront` default **true** — OAC + signing key for photo CDN.
- Signing private key is a **sensitive output** — store in Secrets Manager (Story 03); never commit.

### 8. ALB

- Path routing: default → UI TG; `/api/*`, `/socket.io`, `/socket.io/*`, and **`/health`** → API TG as implemented (health must reach API tasks).
- API target group: **stickiness ON** (WebSockets / L2).
- API TG health check path: **`/health`** (NOT under `/api`) — locked.
- ACM empty → HTTP-only ALB allowed for bootstrap; HTTPS when `acm_certificate_arn` set.
- Route53 alias optional when `domain_name` + `route53_zone_id` set.
- `enable_deletion_protection = false` for `dev`.

### 9. ECS

- Fargate; API desired/min/max via vars (dev: typically 1–2 API, 1 UI).
- Images from ECR `dating-api` / `dating-ui` + tag vars (CI overrides).
- Execution role: ECR pull + secrets/SSM read.
- Task role: S3 + Rekognition (above).
- Plain cloud env on API task (e.g. `PHOTO_STORAGE_DRIVER=s3`, `STRUCTURED_LOG_FILE=0`) lives in ECS module; **secrets** via Story 03 `api_secrets` / `ecs_secrets_from_secretsmanager_only` — **avoid duplicate env keys**.

### 10. State backend

- Bootstrap module creates S3 + DynamoDB lock.
- `dev/backend.tf` may stay **commented** until human bootstraps — local state OK for first bring-up.
- Agent 1 must not force remote backend without docs.

### 11. Apply / destroy

- `terraform apply` is **human-gated** (AWS account, ACM, images, secrets).
- Acceptance “plan clean + validate” is Agent 1 bar; “apply from zero” is human Story 05 / ops.
- Destroy must be possible for `dev` (no deletion protection on ALB/RDS as configured).

### 12. Agent 4

- **Skip.** No live AWS probe required for story close.

---

## Boundary with other stories

| Story | Boundary |
|-------|----------|
| 01 | Images must exist before ECS healthy — not Story 2’s job to build them |
| 03 | Secrets module + operator `put-secret-value`; do not invent secret values in TF |
| 04 | OIDC role / GitHub Actions consume outputs (ECR, cluster, services) |
| 05 | Live verify after apply |

---

## Acceptance mapping

| Criterion | Owner | Bar |
|-----------|--------|-----|
| Modules + README + outputs exist | Agent 1 | Pass if present |
| `terraform fmt` + `validate` | Agent 1 | Pass if CLI available |
| SG / stickiness / `/health` in code | Agent 2 | CR |
| `terraform apply` from zero | **Human** | Not Agent 1 blocker |
| RDS/Redis not public | Agent 2 | Code review of SG + `publicly_accessible` |
| CI outputs exported | Agent 2 | `outputs.tf` |

---

## Agent 1 instructions

1. Diff tree vs this lock (layout, SG rules, ALB health/stickiness, RDS class, outputs).
2. Fix **only** lock violations or broken validate.
3. Run `terraform fmt -recursive` + `terraform validate` in `infra/terraform/dev` if Terraform CLI present.
4. Do **not** delete Story 03 secrets wiring; do **not** require apply.
5. Write `handoffs/STORY_02_infra_as_code/agent-1-dev.md`.
6. Commit only if files change.

---

## Agent 2 instructions

CR checklist:

- [ ] VPC public/private + NAT; SG matrix matches lock
- [ ] RDS 16 / private / destroy-friendly for dev
- [ ] Redis private; URL output
- [ ] S3 private + BPA; IAM S3+Rekognition on task role
- [ ] ALB API TG stickiness; health path `/health`
- [ ] ECS Fargate API+UI; ECR repos
- [ ] Outputs for ALB, RDS, Redis, bucket, CF, ECR, ECS names
- [ ] No secrets committed; sensitive outputs marked
- [ ] Secrets module integration does not duplicate conflicting env keys carelessly

Write `agent-2-cr.md`.

---

## Agent 3 instructions

- Accept if Agent 2 PASS (code-complete; apply pending human).
- Mark `STORY_02` Done with note **PENDING_APPLY**.
- Update sprint README row.
- Write `agent-3-pm.md`.

---

## Open risks

1. First apply without images → unhealthy ECS (expected).
2. Without ACM, HTTP-only — cookies/`COOKIE_SECURE` Story 03 must match.
3. CloudFront signing key sensitive output must never land in git/logs.
4. NAT + RDS cost in idle `dev` — destroy when unused.
