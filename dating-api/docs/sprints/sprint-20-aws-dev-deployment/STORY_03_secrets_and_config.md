# Story 03 — Secrets & runtime config

**Sprint 20 · Status: PLANNED**

## Objective
Wire every environment variable the apps need into SSM Parameter Store / Secrets Manager, injected into the ECS task definitions, with prod-safe defaults. No secret ever lands in an image, repo, or plan output.

## Why
The apps fail open: they boot with half the config missing and then misbehave silently in cloud (the L1–L10 nuances). This story makes the cloud config **explicit and complete**, and guarantees the boot-blocker (`OPENAI_API_KEY`) is present.

## Scope / tasks
1. **Inventory** — take the env contract from [`DEPLOY_AWS_DEV.md` §6](../../../../DEPLOY_AWS_DEV.md) as the source of truth.
2. **Classify** — secret (Secrets Manager) vs plain config (SSM Parameter Store):
   - **Secrets:** `DATABASE_URL`, `OPENAI_API_KEY`, `SESSION_SECRET_PEPPER`, `RESEND_API_KEY`, `PHOTO_CDN_PRIVATE_KEY`, `SENTRY_DSN`, `DD_API_KEY`, `EMAIL_UNSUBSCRIBE_SECRET`.
   - **Config:** `PORT`, `NODE_ENV=production`, `REDIS_URL`, `GOOGLE_CLIENT_ID`, cookie/CORS vars, `PHOTO_*`, moderation thresholds, `STRUCTURED_LOG_FILE=0`, `ADMIN_USER_IDS`.
3. **API task def** — map each param/secret to a container env var via `secrets`/`environment`.
4. **UI build args** — `NEXT_PUBLIC_*` are **build-time**; they go into the image build (Story 04), not the task def. Document which are baked vs runtime.
5. **Cloud-correct values** (fixes L4/L5/L7/L8):
   - `COOKIE_SECURE=true`, `COOKIE_DOMAIN`/`CORS_ORIGIN` set for the chosen origin.
   - `PHOTO_STORAGE_DRIVER=s3`, `PHOTO_MODERATION_DRIVER=rekognition`.
   - `STRUCTURED_LOG_FILE=0`.
   - `NODE_ENV=production`.
   - `PHOTO_MODERATION_AUTO_APPROVE` **unset**.
6. **Least-privilege read** — ECS execution role granted read on exactly these parameters/secrets (from Story 02 IAM).

## Acceptance criteria
- [ ] API task starts with **all** required vars; deliberately removing `OPENAI_API_KEY` reproduces a fast, clear boot failure (proves the guard, then restore).
- [ ] No secret value appears in git, the image, `terraform plan`, or CloudWatch logs.
- [ ] `COOKIE_SECURE=true` and CORS/cookie domain verified against the real `dev` origin (login persists across requests).
- [ ] Photos go to S3 and moderation calls Rekognition (not mock) — confirmed via a test upload.
- [ ] Rotating a secret (e.g. `SESSION_SECRET_PEPPER`) is a task redeploy, no code change.

## Notes / gotchas
- `PHOTO_CDN_PRIVATE_KEY` must preserve `\n` escapes as a single-line secret.
- Changing a `NEXT_PUBLIC_*` value requires a **UI image rebuild**, not just a task restart — call this out in the runbook and CI.
- Keep a `dev.tfvars`/param manifest (non-secret) in the repo so the full config surface is reviewable.

## Deliverables
Parameter/secret definitions (in Terraform from Story 02 or a dedicated module), task-def env mappings, updated env manifest doc.
