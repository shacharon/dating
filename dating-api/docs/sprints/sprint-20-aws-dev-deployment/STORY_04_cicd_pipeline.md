# Story 04 — CI/CD pipeline

**Sprint 20 · Status: ✅ Done (PENDING_LIVE_DEPLOY)** — workflows + OIDC + 4-agent CR complete; first green deploy needs AWS + GitHub `dev` env

**Handoffs:** [architect](./handoffs/STORY_04_cicd_pipeline/agent-0-architect.md) · [dev](./handoffs/STORY_04_cicd_pipeline/agent-1-dev.md) · [CR](./handoffs/STORY_04_cicd_pipeline/agent-2-cr.md) · [PM](./handoffs/STORY_04_cicd_pipeline/agent-3-pm.md)

## Objective
A pipeline that turns a push to the deploy branch into a live `dev` deploy with **zero manual steps**: build → test → image push → migrate (one-shot) → rolling deploy → health gate.

## Why
There is no `.github/workflows` today. Manual deploys are how the food-project nuances (migration races L6, stale `NEXT_PUBLIC_*` builds, forgotten env) creep in. Automation makes deploys boring and repeatable.

## Scope / tasks (GitHub Actions assumed; adapt if using CodePipeline)
1. **CI stage (on PR + push):**
   - `dating-api`: `npm ci && npm run build && npm test`.
   - `dating-ui`: `npm ci && npm run build && npm test`.
   - Lint/typecheck as configured.
2. **Build & push images (on deploy branch):**
   - Build API image, tag with git SHA, push to ECR.
   - Build UI image **with `NEXT_PUBLIC_*` build args** pulled from config (rebuild whenever those change), tag + push.
   - Auth to AWS via OIDC role (no long-lived keys).
3. **Migrate (one-shot, before service update — fixes L6):**
   - Run a single ECS `run-task` (or CodeBuild step) executing `npx prisma migrate deploy` against RDS.
   - Fail the pipeline if migration fails; do **not** proceed to deploy.
4. **Deploy (rolling):**
   - Update ECS API service to the new task def/image; wait for steady state.
   - Update ECS UI service; wait for steady state.
5. **Health gate:**
   - Poll `GET /health` (200) and `GET /health/realtime` (adapter ok) on the live ALB URL.
   - Fail (and optionally roll back to previous task def) if unhealthy within timeout.
6. **Post-deploy smoke** — trigger Story 05's scripted smoke test; mark deploy red on failure.

## Acceptance criteria
- [x] Workflows + scripts + OIDC module + rollback docs in repo *(CR PASS)*
- [ ] A push to the deploy branch deploys to `dev` end-to-end with no manual step (after infra exists). *(PENDING_LIVE_DEPLOY)*
- [x] Migrations run exactly **once** per deploy, before the API rolls, and block on failure. *(in workflow)*
- [x] UI image rebuilds with `NEXT_PUBLIC_*` build args from Environment vars. *(in workflow)*
- [x] Failed health gate / smoke stops the rollout (job failure). *(in workflow)*
- [x] No AWS static keys in CI — OIDC role only. *(CR)*
- [x] Rollback path documented (`CI_CD.md`).

## Notes / gotchas
- Order matters: **migrate before deploy**, API before UI.
- Cache `npm ci` and Docker layers for speed.
- Keep the migrate task idempotent (`migrate deploy` is) and single-run per pipeline.
- Gate deploy to protected branch; require CI green.

## Deliverables
`.github/workflows/deploy-dev.yml` (+ any reusable workflow), OIDC role (in Story 02 IAM), documented rollback procedure.
