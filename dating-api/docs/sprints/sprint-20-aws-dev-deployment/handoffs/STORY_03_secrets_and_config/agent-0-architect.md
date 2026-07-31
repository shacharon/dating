# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_secrets_and_config.md](../../STORY_03_secrets_and_config.md)  
**Sprint:** sprint-20-aws-dev-deployment  
**Date:** 2026-07-31  
**Status:** complete  

**Mode:** Retro lock — secrets module + manifest already landed (`9bdff05` + Story 02 wiring). Agent 1 verifies parity / closes gaps only. **No real secret values in git.** Live boot/login/photo tests are human / Story 05. Skip Agent 4.

---

## Summary

- Canonical inventory: [`infra/env/DEV_CONFIG_MANIFEST.md`](../../../../../infra/env/DEV_CONFIG_MANIFEST.md) (+ `DEPLOY_AWS_DEV.md` §6).
- Terraform: `infra/terraform/modules/secrets/` wired from `infra/terraform/dev/secrets.tf`.
- ECS injects **Secrets Manager** via `module.secrets.ecs_secrets_from_secretsmanager_only` (avoid duplicating keys already in ECS plain `environment`).
- Execution role gets least-privilege read via `execution_role_secrets_policy_arn` attachment.
- `NEXT_PUBLIC_*` = **UI build-time only** (Story 04) — stored optionally under SSM `/dating/dev/ui/build/*` for CI, **not** API task secrets.

---

## Artifacts (locked)

| Path | Role |
|------|------|
| `infra/env/DEV_CONFIG_MANIFEST.md` | Full classification + cloud defaults |
| `infra/env/dev.tfvars.example` | Non-secret placeholders |
| `infra/terraform/modules/secrets/*` | SSM + Secrets Manager + IAM + ECS mapping outputs |
| `infra/terraform/dev/secrets.tf` | Root wiring to RDS/Redis/S3/CF + IAM attach |
| `infra/terraform/dev/secrets_*.tf` | Vars/outputs |
| `infra/terraform/dev/secrets_ecs_wiring.snippet.hcl` | Reference if wiring drifts |
| `dev/main.tf` `module.ecs` | Must keep `api_secrets` → SM-only mapping |

---

## Decisions (do not reverse without discussion)

### 1. Classification

**Secrets Manager (never plain env in task def):**

- `DATABASE_URL` (prefer RDS secret JSON `database_url` / `…:database_url::`)
- `OPENAI_API_KEY` (**boot blocker** — must be set before first healthy API)
- `SESSION_SECRET_PEPPER` (≥32; TF `random_password` OK)
- `RESEND_API_KEY`, `PHOTO_CDN_PRIVATE_KEY`, `SENTRY_DSN`, `DD_API_KEY`, `EMAIL_UNSUBSCRIBE_SECRET`
- Optional: `PRODUCT_ANALYTICS_HASH_SALT`

**SSM String and/or ECS plain environment (non-secret config):**

- `PORT`, `NODE_ENV=production`, `REDIS_URL`, `GOOGLE_CLIENT_ID`, cookie/CORS, `PHOTO_*` (s3/rekognition), thresholds, `STRUCTURED_LOG_FILE=0`, `ADMIN_USER_IDS`, email/observability non-secrets

**Prefer for ECS:** SM-only in `secrets[]` + plain cloud defaults in ECS module `environment` (current `main.tf` pattern) — **do not** inject the same key twice.

### 2. Cloud-correct defaults (L4/L5/L7/L8)

| Var | Locked cloud value |
|-----|-------------------|
| `COOKIE_SECURE` | `true` |
| `PHOTO_STORAGE_DRIVER` | `s3` |
| `PHOTO_MODERATION_DRIVER` | `rekognition` |
| `STRUCTURED_LOG_FILE` | `0` |
| `NODE_ENV` | `production` |
| `CORS_CREDENTIALS` | `true` |
| `CORS_ORIGIN` / `COOKIE_DOMAIN` | From domain/tfvars — empty domain until human sets |

### 3. Intentionally unset

- `PHOTO_MODERATION_AUTO_APPROVE` — **must not** exist in SSM/task def
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — task role only
- `PHOTO_UPLOAD_DIR` — local driver only

### 4. PHOTO_CDN_PRIVATE_KEY

- Single-line secret preserving `\n` escapes (PEM).
- When CloudFront off, CDN secret may be empty/unused — do not invent fake PEMs in git.

### 5. UI build-time vs runtime

| Kind | Examples | Change requires |
|------|----------|-----------------|
| Build-time | All `NEXT_PUBLIC_*`, `API_PROXY_TARGET` (rewrite bake) | **UI image rebuild** (Story 04) |
| Runtime (UI container) | Prefer minimal; same-origin recommended → leave `NEXT_PUBLIC_API_URL` unset | Task restart only if truly runtime |

Document in CI: changing `NEXT_PUBLIC_*` without rebuild = stale client.

### 6. Rotation

- Rotate SM secret / SSM value → **ECS force new deployment** (no code change).
- `SESSION_SECRET_PEPPER` rotation invalidates existing sessions (acceptable for `dev`; call out).

### 7. Operator bootstrap

- `OPENAI_API_KEY`: `aws secretsmanager put-secret-value` or `TF_VAR_*` — **before** first task start.
- Never put real keys in `terraform.tfvars` committed to git.

### 8. Agent 4

- **Skip.** Live login/S3/Rekognition proof = Story 05 / human after apply.

---

## Acceptance mapping

| Criterion | Owner | Bar |
|-----------|--------|-----|
| Inventory + classification in repo | Agent 1 | Manifest matches lock |
| TF module + ECS wiring + IAM attach | Agent 1/2 | Present; no secret values in git |
| No duplicate env/secret keys | Agent 2 | CR |
| Live boot without/with OPENAI | Human | PENDING_APPLY |
| Login cookie / S3 photo / Rekognition e2e | Human / Story 05 | PENDING_APPLY |

---

## Agent 1 instructions

1. Diff manifest + `modules/secrets` + `dev/secrets.tf` + ECS `api_secrets` vs this lock.
2. Fix only lock violations (missing unset list, wrong drivers, duplicate keys).
3. Grep repo for accidental committed secrets (sk- / re_ / PEM blocks in tfvars).
4. Do not apply AWS; do not invent secret values.
5. Write `handoffs/STORY_03_secrets_and_config/agent-1-dev.md`.
6. Commit only if files change.

---

## Agent 2 instructions

- [ ] Secrets vs config classification matches story + manifest
- [ ] Cloud defaults: s3, rekognition, COOKIE_SECURE, STRUCTURED_LOG_FILE=0
- [ ] AUTO_APPROVE unset
- [ ] SM-only ECS secrets + execution role policy attached
- [ ] NEXT_PUBLIC_* documented as rebuild-required
- [ ] No secrets in git / plan-friendly (sensitive where needed)
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS → **Done (PENDING_LIVE_VERIFY)**.
- Update story + README.
- Write `agent-3-pm.md`.

---

## Open risks

1. Empty `OPENAI_API_KEY` → crash loop (good) — operators must set it.
2. Wrong `CORS_ORIGIN` → login 401 (L4/L8) — domain must match ALB/Route53.
3. Duplicate keys if someone switches to full `ecs_api_secrets` while ECS module also sets plain PHOTO_* — stick to SM-only mapping.
