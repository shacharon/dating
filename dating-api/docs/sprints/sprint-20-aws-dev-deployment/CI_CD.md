# Sprint 20 Story 4 — CI/CD (GitHub Actions → AWS `dev`)

Zero-manual-step pipeline: **CI → ECR push → one-shot migrate → API roll → UI roll → health gate → smoke**.

Deploy branch: **`main`** (also `workflow_dispatch`). Protect `main` and require the **CI green** check from [`.github/workflows/ci.yml`](../../../../../.github/workflows/ci.yml).

AWS auth: **OIDC only** — no `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in workflows or secrets.

---

## Workflows

| File | When | What |
|------|------|------|
| [`.github/workflows/ci.yml`](../../../../../.github/workflows/ci.yml) | PR + push to `main` / `deploy/**` | `dating-api` + `dating-ui`: `npm ci` → typecheck/lint (if scripts) → build → test |
| [`.github/workflows/reusable-node-ci.yml`](../../../../../.github/workflows/reusable-node-ci.yml) | `workflow_call` | Shared Node 22 package CI (npm cache) |
| [`.github/workflows/deploy-dev.yml`](../../../../../.github/workflows/deploy-dev.yml) | Push to `main` + manual | Full `dev` deploy (OIDC → ECR → migrate → ECS → health → smoke) |

Helper scripts (deploy jobs):

- [`.github/scripts/ecs-register-image.sh`](../../../../../.github/scripts/ecs-register-image.sh) — new task-def revision with SHA image
- [`.github/scripts/ecs-run-migrate.sh`](../../../../../.github/scripts/ecs-run-migrate.sh) — ECS `run-task` + `./scripts/docker-migrate.sh` (Story 01)
- [`.github/scripts/ecs-update-service.sh`](../../../../../.github/scripts/ecs-update-service.sh) — rolling update + `services-stable`
- [`.github/scripts/health-gate.sh`](../../../../../.github/scripts/health-gate.sh) — poll `/health` + `/health/realtime`

---

## Deploy order (do not reorder)

1. **CI** (both packages must be green)
2. **Build & push** API + UI images to ECR (tag = first 12 of `GITHUB_SHA`, plus `latest` for `dev`)
3. **Migrate** — register API task def with new image → one-shot Fargate task running `scripts/docker-migrate.sh` → **fail closed** (no API/UI roll on non-zero exit)
4. **API** rolling deploy → wait steady
5. **UI** rolling deploy → wait steady
6. **Health gate** — `GET {DEV_BASE_URL}/health` (200) and `GET …/health/realtime` with `messaging.redisAdapter === true`
7. **Smoke** — if `dating-api/scripts/smoke-cloud-dev.sh` exists (Story 05), run it and fail the deploy on error; otherwise log a notice (hook documented below)

---

## Required GitHub Environment: `dev`

Create Environment **`dev`** (recommended: required reviewers + restrict to `main`). Set **Variables** (not secrets) unless noted.

### AWS / ECS / ECR

| Variable | Example / Story 02 output | Notes |
|----------|---------------------------|--------|
| `AWS_ROLE_ARN` | `arn:aws:iam::123:role/dating-dev-gha-deploy-…` | From [`infra/terraform/modules/github_oidc`](../../../../../infra/terraform/modules/github_oidc) |
| `AWS_REGION` | `us-east-1` | |
| `ECR_API_REPOSITORY` | `123.dkr.ecr.us-east-1.amazonaws.com/dating-api` | ECR module `dating_api_repository_url` |
| `ECR_UI_REPOSITORY` | `…/dating-ui` | ECR module `dating_ui_repository_url` |
| `ECS_CLUSTER` | `dating-dev-cluster` | ECS module `cluster_name` |
| `ECS_API_SERVICE` | `dating-dev-api` | `api_service_name` |
| `ECS_UI_SERVICE` | `dating-dev-ui` | `ui_service_name` |
| `ECS_API_TASK_FAMILY` | `dating-dev-api` | Task family (not full ARN) |
| `ECS_UI_TASK_FAMILY` | `dating-dev-ui` | |
| `ECS_SUBNET_IDS` | `subnet-aaa,subnet-bbb` | Private subnets for migrate `run-task` |
| `ECS_SECURITY_GROUP_IDS` | `sg-api…` | API task SG (RDS + Redis reachable) |
| `ECS_ASSIGN_PUBLIC_IP` | `DISABLED` | Optional; default DISABLED |
| `DEV_BASE_URL` | `https://dev.example.tld` | Public origin (ALB / Route53) — health + smoke |
| `HEALTH_TIMEOUT_SECONDS` | `300` | Optional |
| `REQUIRE_REDIS_ADAPTER` | `1` | Optional; cloud must stay `1` |

**No static AWS keys.** Do not add `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.

### Optional secrets

| Secret | Purpose |
|--------|---------|
| `SMOKE_SESSION_COOKIE` | Optional Cookie header for Story 05 auth probe (`dating_session=…`) |

### UI build-time vars (`NEXT_PUBLIC_*` + proxy)

Baked into the UI image at **build** time (Story 01 Dockerfile `ARG`s). Changing any of these requires a new deploy (rebuild), not a task restart.

| Variable | Typical `dev` value |
|----------|---------------------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same string as API `GOOGLE_CLIENT_ID` |
| `NEXT_PUBLIC_API_URL` | **Leave empty** for same-origin (recommended) |
| `NEXT_PUBLIC_REALTIME` | `ws` |
| `NEXT_PUBLIC_ADMIN_ENABLED` | `1` only if admin UI needed on this host |
| `NEXT_PUBLIC_SESSION_COOKIE_NAME` | optional |
| `NEXT_PUBLIC_API_PORT` | optional (split-origin local pattern) |
| `NEXT_PUBLIC_AUTH_TEST` | unset in cloud |
| `NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES` | unset |
| `NEXT_PUBLIC_MATCH_QUALITY_RUNBOOK_URL` | optional |
| `NEXT_PUBLIC_SENTRY_DSN` | optional |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `dev` |
| `API_PROXY_TARGET` | Internal API URL for Next rewrites, e.g. `http://dating-api.dating.internal:3001` (service discovery) |

Runtime API secrets (`DATABASE_URL`, `OPENAI_API_KEY`, …) come from SSM/Secrets Manager via the ECS task definition (Story 03) — **not** from GitHub.

---

## OIDC role (Story 02 / 04)

Story 02 IAM currently covers ECS **task** + **execution** roles only. Story 04 adds:

[`infra/terraform/modules/github_oidc`](../../../../../infra/terraform/modules/github_oidc)

Wire from `infra/terraform/dev` (when the root module lands):

```hcl
module "github_oidc" {
  source = "../modules/github_oidc"

  name_prefix = "dating-dev"
  allowed_sub_patterns = [
    "repo:YOUR_ORG/dating:environment:dev",
  ]
  ecr_repository_arns = [
    module.ecr.repository_arns["dating-api"],
    module.ecr.repository_arns["dating-ui"],
  ]
  pass_role_arns = [
    module.iam.execution_role_arn,
    module.iam.task_role_arn,
  ]
}

# output "github_actions_role_arn" { value = module.github_oidc.role_arn }
```

Trust is `AssumeRoleWithWebIdentity` against `token.actions.githubusercontent.com` — **no long-lived keys**.

---

## Rollback

1. **App rollback (preferred):** redeploy the previous known-good **image tag** (git SHA).
   - Register API/UI task definitions with `…/dating-api:<prev-sha>` and `…/dating-ui:<prev-sha>`.
   - `aws ecs update-service --task-definition …` for API then UI (or re-run this workflow on the previous commit / `workflow_dispatch` after checkout of that SHA).
2. **Health gate failure:** pipeline stops red; services may already be on the new task def. Roll back images as above. Check CloudWatch log groups `/ecs/dating-dev/dating-api` and `…/dating-ui`.
3. **DB:** Prisma migrations are **forward-only**. Do **not** auto-rollback schema. A bad migration needs a hand-written down migration + maintenance window.
4. **UI `NEXT_PUBLIC_*` mistake:** rebuild UI with corrected Environment vars (runtime env alone will not fix client bundle).
5. **Realtime emergency:** rebuild UI with `NEXT_PUBLIC_REALTIME=poll` (Sprint 5 rollback pattern).

---

## Post-deploy smoke (Story 05 hook)

Deploy job `smoke`:

- **If present:** `dating-api/scripts/smoke-cloud-dev.sh` with `BASE_URL=$DEV_BASE_URL` — non-zero exit fails the deploy.
- **If missing:** job succeeds with a notice; Story 05 should add the script and keep this job as the gate.

Optional later: replace the step with `workflow_call` into a dedicated Story 05 workflow.

---

## Branch protection (recommended)

On `main`:

- Require status check **CI green**
- Restrict who can push / require PR
- Environment `dev`: deployment branch = `main` only

---

## Dependencies / blockers (Stories 1–3)

| Dependency | Status expected | Pipeline impact if missing |
|------------|-----------------|----------------------------|
| Story 01 `dating-api/Dockerfile`, `dating-ui/Dockerfile` | Present (WIP) | `build-push` fails |
| Story 01 `dating-api/scripts/docker-migrate.sh` | Present | migrate override fails |
| Story 02 ECR repos + ECS cluster/services/task families | Module WIP; names assumed `dating-dev-*` | deploy vars / AWS API fail |
| Story 02/04 OIDC role applied + `AWS_ROLE_ARN` set | Module added here; must be applied | OIDC assume-role fails |
| Story 03 SSM/secrets on API task def (`DATABASE_URL`, …) | Planned | migrate/API boot fail even if CI green |
| Story 03 docs for `NEXT_PUBLIC_*` | Planned | Set GitHub vars from runbook / Story 03 |
| Story 05 `smoke-cloud-dev.sh` | Optional at Story 04 merge | smoke step no-ops with notice |

Terraform ECS note: services use `ignore_changes` on `task_definition` so CI owns image rolls after first apply.

---

## Local dry-run (no AWS required)

Workflows are YAML-valid without live AWS. To sanity-check scripts:

```bash
# Health gate against local API
DEV_BASE_URL=http://127.0.0.1:3001 REQUIRE_REDIS_ADAPTER=0 .github/scripts/health-gate.sh
```

Do not run migrate/deploy scripts without a real cluster and Environment vars.
