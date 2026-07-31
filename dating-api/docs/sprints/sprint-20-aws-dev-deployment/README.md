# Sprint 20 — Deploy to AWS `dev` (ECS Fargate)

> **Status:** 🟡 **IN PROGRESS.** Stories 01–04 may still be landing. Story 05 verification **tooling** is ready (`smoke-cloud-dev.sh`, checklist, CI snippet, `VERIFIED_DEV.md`); live sign-off is **PENDING_INFRA** until a `dev` URL exists.
>
> **Depends on:** Sprint 19 (performance + real photo moderation) merged, since this sprint deploys that work.
>
> **Companion runbook:** [`DEPLOY_AWS_DEV.md`](../../../../DEPLOY_AWS_DEV.md) at the repo root is the operational reference. This sprint turns that runbook into reproducible, reviewed artifacts (containers, IaC, CI/CD) instead of manual click-ops.

---

## Goal

Ship the `dating` monorepo (NestJS API + Next.js UI) to a shared **AWS `dev`** environment on **ECS Fargate**, in a way that is **reproducible, reviewable, and prod-track** — closing every local-vs-cloud "nuance" that bit the prior `going2eat.food` deploy (see the L1–L10 table in the runbook).

**Definition of done:** a fresh `git push` to the deploy branch results in a working `dev` environment — DB migrated, API + UI healthy behind HTTPS, photos on S3, moderation via Rekognition, chat over WebSocket, and smoke + load tests green — with **zero manual steps** after infra exists.

---

## Target topology (locked decision)

**ECS Fargate**, single public origin (UI proxies `/api/*` + `/socket.io` to API).

```
Route53 → ACM/HTTPS → ALB ──┬── target group: dating-ui  (Fargate, :3000)
                            └── target group: dating-api (Fargate, :3001, sticky)
                                     │
        RDS Postgres 16 · ElastiCache Redis · S3 (photos) · Rekognition · CloudFront (photo CDN)
                            secrets via SSM Parameter Store / Secrets Manager
```

- **API service:** 1–2 Fargate tasks, ALB **stickiness on** (WebSockets), task role for S3/Rekognition. Workers + SLA cron run in-process.
- **UI service:** 1 Fargate task, same-origin proxy to API via internal DNS.
- **Migrations:** one-shot Fargate task (`prisma migrate deploy`) run **before** rolling the API — never per-instance (fixes L6).

---

## Stories

| # | Story | Outcome | Status |
|---|-------|---------|--------|
| 01 | [Containerize the apps](./STORY_01_containerize.md) | Production Dockerfiles for API + UI; compose extended with Redis; local parity proven. | ✅ **Done** |
| 02 | [Provision AWS infra as code](./STORY_02_infra_as_code.md) | Terraform for RDS, ElastiCache, S3, IAM, CloudFront, ALB, ECS cluster/services. | Code landed — 4-agent pipeline pending |
| 03 | [Secrets & runtime config](./STORY_03_secrets_and_config.md) | Every env var from the runbook wired via SSM/Secrets Manager; prod-safe defaults. | Code landed — 4-agent pipeline pending |
| 04 | [CI/CD pipeline](./STORY_04_cicd_pipeline.md) | build → test → image push → migrate (one-shot) → rolling deploy → `/health` gate. | Code landed — 4-agent pipeline pending |
| 05 | [Cloud verification](./STORY_05_verification.md) | Smoke + checklist + CI gate tooling ready; live e2e/k6 sign-off pending infra ([`VERIFIED_DEV.md`](./VERIFIED_DEV.md)). | Tooling ready — 4-agent / live gate pending |
Recommended execution order is 01 → 02 → 03 → 04 → 05. Stories 01 and 02 can run in parallel.

---

## Non-goals (explicitly out of scope)

- Production environment (this is `dev` only; the artifacts are designed to extend to prod later).
- Blue/green or canary deploys (rolling update is sufficient for `dev`).
- Autoscaling policies beyond a fixed 1–2 task count.
- Multi-region / DR.
- Separating workers into their own service (they stay in-process; noted as future work).
- CDN/WAF hardening beyond the basics in the runbook.

---

## Pre-sprint prerequisites (gather before kickoff)

- [ ] AWS account + region (`us-east-1` assumed) with permissions for ECS, RDS, ElastiCache, S3, IAM, CloudFront, ACM, Route53, SSM.
- [ ] A `dev` hostname + ACM certificate (or ability to create one).
- [ ] `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `SESSION_SECRET_PEPPER` available to store as secrets.
- [ ] Google OAuth client updated with the `dev` origin.
- [ ] Terraform state backend decided (S3 + DynamoDB lock, or Terraform Cloud).
- [ ] Sprint 19 merged to the deploy branch.

---

## Risks & watch-items

| Risk | Mitigation |
|------|------------|
| Workers run in API process → 0 tasks = stalled jobs | Keep API min task count ≥ 1; alarm on 0 healthy tasks. |
| SLA `setInterval` fires on every API task | Idempotent today; gate to a leader task if noisy (future). |
| `NEXT_PUBLIC_*` baked at build | CI rebuilds UI image on config change; documented in STORY_01/04. |
| Migration/deploy race on scale-up | One-shot migrate task before service update (STORY_04). |
| Cookie/CORS misconfig → login loop | Same-origin topology + STORY_03 acceptance checks. |
| Rekognition/OpenAI cost or throttling in `dev` | Low sampling; budget alarm; `dev` traffic is small. |

---

## Estimated effort

~1–2 weeks for one engineer, or ~1 week split across two (containers+CI vs infra+secrets). Verification (Story 05) is the gate — don't call it done until smoke + load + e2e are green against the live `dev` URL.
