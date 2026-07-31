# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [STORY_04_cicd_pipeline.md](../../STORY_04_cicd_pipeline.md)  
**Sprint:** sprint-20-aws-dev-deployment  
**Date:** 2026-07-31  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

Verified CI/CD against architect lock. Pipeline order, OIDC, NEXT_PUBLIC build-args, migrate-before-deploy, health gate, and rollback docs match. **Gap closed:** smoke job was soft-skip if script missing — hardened to **fail closed** (script exists; require `DEV_BASE_URL`). No live deploy attempted.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| `ci.yml` + reusable Node CI + `ci-ok` | Pass |
| `deploy-dev.yml` on `main` + dispatch | Pass |
| OIDC only (no static AWS keys in `.github`) | Pass |
| Order: build → migrate → API → UI → health → smoke | Pass |
| Migrate uses `docker-migrate.sh` / fail closed | Pass |
| UI NEXT_PUBLIC_* + API_PROXY_TARGET build-args | Pass |
| Health gate script | Pass |
| Rollback in `CI_CD.md` | Pass |
| `github_oidc` module present | Pass |
| Smoke fail-closed | **Fixed this agent** |

---

## Changes made this agent

1. `.github/workflows/deploy-dev.yml` — smoke job requires `DEV_BASE_URL` + script presence; exit 1 if missing; run script with fail on non-zero.

---

## Residual / human

1. Wire GitHub Environment `dev` vars + apply `github_oidc` Terraform.
2. First live push to `main` after infra/secrets (PENDING_LIVE_DEPLOY).

---

## Agent 2 note

Confirm smoke harden matches Story 05 snippet intent; confirm no AWS_ACCESS_KEY in workflows.
