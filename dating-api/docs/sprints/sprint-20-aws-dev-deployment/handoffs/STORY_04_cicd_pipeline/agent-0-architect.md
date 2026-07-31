# Handoff: Agent 0 — Architect — Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_cicd_pipeline.md](../../STORY_04_cicd_pipeline.md)  
**Sprint:** sprint-20-aws-dev-deployment  
**Date:** 2026-07-31  
**Status:** complete  

**Mode:** Retro lock — workflows + scripts + OIDC module + `CI_CD.md` already on `main`. Agent 1 verifies parity / closes gaps only. Live end-to-end deploy is human after Story 02 apply + GitHub `dev` env vars. Skip Agent 4 (live deploy ≠ Agent 4 e2e harness).

---

## Summary

- **CI:** `.github/workflows/ci.yml` + `reusable-node-ci.yml` — API + UI on PR/push; aggregate **CI green** check for branch protection.
- **Deploy:** `.github/workflows/deploy-dev.yml` on **`main`** (+ `workflow_dispatch`) — OIDC → ECR → **one-shot migrate** → API → UI → health → smoke.
- **Auth:** OIDC only via `infra/terraform/modules/github_oidc` — **forbidden:** static AWS keys in Actions.
- **Docs:** `CI_CD.md` — env vars, order, rollback (forward-only DB).

---

## Artifacts (locked)

| Path | Role |
|------|------|
| `.github/workflows/ci.yml` | PR/push CI + `ci-ok` gate |
| `.github/workflows/reusable-node-ci.yml` | Shared npm ci/build/test (Node 22, npm cache) |
| `.github/workflows/deploy-dev.yml` | Full deploy pipeline |
| `.github/scripts/ecs-*.sh` + `health-gate.sh` | Register image, migrate run-task, rolling update, health |
| `infra/terraform/modules/github_oidc/` | IAM OIDC role for GHA |
| `dating-api/docs/sprints/sprint-20-aws-dev-deployment/CI_CD.md` | Human runbook |
| Story 01 `scripts/docker-migrate.sh` | Migrate entrypoint (do not inline migrate in API CMD) |

---

## Decisions (do not reverse without discussion)

### 1. Deploy branch

- **`main`** is the deploy branch (+ manual `workflow_dispatch`).
- Protect `main`; require **CI green** before merge when possible.
- Deploy workflow also re-runs package CI jobs before build (belt-and-suspenders).

### 2. Order (hard lock — L6)

```text
CI green → build/push ECR (SHA tag) → migrate (one-shot, fail closed)
  → API rolling deploy → UI rolling deploy → health gate → smoke
```

- **Forbidden:** migrate inside every API task start; deploy before migrate; UI before API.

### 3. Images

- Tag: first **12** chars of `GITHUB_SHA` (+ `latest` OK for `dev`).
- API Dockerfile from Story 01; UI build **must** pass all Dockerfile `NEXT_PUBLIC_*` + `API_PROXY_TARGET` as build-args from GitHub Environment `dev` vars.
- Changing any `NEXT_PUBLIC_*` ⇒ new pipeline run (rebuild), not task restart alone.

### 4. OIDC

- `permissions: id-token: write` on deploy workflow.
- `aws-actions/configure-aws-credentials` with `role-to-assume: vars.AWS_ROLE_ARN`.
- **No** `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in workflows or repo secrets for deploy.

### 5. Health gate

- Poll `{DEV_BASE_URL}/health` → 200.
- Poll `/health/realtime` → Redis adapter connected (`messaging.redisAdapter === true` or equivalent).
- Failure fails the workflow (surfaces in Actions logs). Automated rollback to previous task def is **nice-to-have**; documented manual rollback is required.

### 6. Smoke

- Call Story 05 `smoke-cloud-dev.sh` when present; fail deploy on smoke failure (harden soft hooks if Agent 1 finds soft-fail).
- Missing script: log notice, do not pretend live e2e passed.

### 7. Rollback (documented in CI_CD.md)

- Redeploy previous image tag / prior task-def revision.
- DB migrations: **forward-only**; down-migration = maintenance window (manual).

### 8. Caching

- npm cache in reusable CI; Docker layer cache via buildx/gha where present — keep if already there; do not remove for “simplicity.”

### 9. Agent 4

- **Skip.** First green deploy against live ALB is human + Story 05 sign-off.

---

## Acceptance mapping

| Criterion | Owner | Bar |
|-----------|--------|-----|
| Workflows + scripts + CI_CD.md + OIDC module exist | Agent 1 | Pass |
| Order migrate→API→UI; OIDC only; NEXT_PUBLIC build-args | Agent 2 | CR |
| Live push deploys end-to-end | Human | PENDING_LIVE_DEPLOY |
| Rollback docs | Agent 2 | Present in CI_CD.md |

---

## Agent 1 instructions

1. Diff workflows/scripts/OIDC/CI_CD.md vs this lock.
2. Fix only lock violations (e.g. soft smoke that ignores failure; missing build-arg; static key usage).
3. Do not require a live AWS deploy.
4. Write `handoffs/STORY_04_cicd_pipeline/agent-1-dev.md`.
5. Commit only if files change.

---

## Agent 2 instructions

- [ ] CI on PR + deploy on main
- [ ] OIDC only; no static AWS keys
- [ ] Migrate once before API; fail closed
- [ ] UI NEXT_PUBLIC_* build-args from env
- [ ] Health gate + smoke hook
- [ ] Rollback documented
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS → **Done (PENDING_LIVE_DEPLOY)**.
- Update story + README.
- Write `agent-3-pm.md`.

---

## Open risks

1. GitHub Environment `dev` vars unset → deploy fails at meta/OIDC step (expected).
2. ECS images missing / secrets empty → health gate fails (expected until Stories 02–03 applied).
3. Concurrent deploys: `concurrency: deploy-dev` / `cancel-in-progress: false` — keep (no cancel mid-migrate).
