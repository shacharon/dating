# Story 1: Prod deploy hygiene

**Sprint:** 10  
**Status:** Done (engineering gate — manual smoke pending operator)  
**Depends on:** —

---

## Why

Sprint 9 shipped prod route gating for `/evaluate`, `/profiles`, `/auto-matches`, and `/dev/*`, but **`npm run build` still fails** on legacy `/dating/matches/children-unsure-badge.tsx` (missing exports from `_lib/children-unsure.ts`). Production deploy is blocked until this is resolved. The runbook also notes `/matches` as dev-only but not gated.

---

## What

**As an** operator  
**I want** a green UI production build and legacy internal routes hidden in prod  
**So that** we can deploy the cohort launch safely

### Acceptance criteria

- [x] **`npm run build`** succeeds in `dating-ui` (CI and local)
- [x] **Legacy compare UI** — one of:
  - Fix `children-unsure-badge.tsx` imports (restore or remove analytics exports), **or**
  - Remove `/dating/matches` routes if unused, **or**
  - Move compare UI behind dev-only gate with no production bundle dependency
- [x] **Prod middleware** — add `/matches` and `/dating/matches` (and subpaths) to internal route block list (same pattern as Story 6)
- [x] **Escape hatch** — `NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES=1` still works for ops debugging
- [x] **Docs** — update [LAUNCH_COHORT_RUNBOOK.md](../sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md) §5 blocked routes table
- [x] **Tests** — middleware spec covers `/matches` 404 in production; build step documented in sprint README smoke

### Out of scope (this story)

- Deleting all legacy evaluate/compare code from repo (only what blocks build)
- CDN / hosting pipeline changes
- API deploy changes

---

## Technical notes (guidance, not prescriptive)

- Root cause: `children-unsure-badge.tsx` imports `CHILDREN_UNSURE_ANALYTICS_EVENT_*` and `childrenUnsureAnalyticsEventsUrl` from `children-unsure.ts`, but that module only exports scoring helpers.
- Minimal fix path: remove badge analytics calls or stub exports; prefer **prod gate + delete unused page** if compare UI is obsolete.
- Extend `internal-routes-gate.ts` prefixes: `/matches`, `/dating/matches`.
- Verify Story 6 tests still pass after matcher update.

---

## Definition of done

- [x] Green `npm run build`
- [x] Prod `/matches` → 404
- [x] Runbook updated
- [x] UI tests pass

---

## Manual smoke

1. `cd dating-ui && npm test && npm run build`
2. `NODE_ENV=production npm run start` → visit `/matches` and `/evaluate` → **404**
3. `NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES=1` → routes reachable (dev debug only)

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Build fix | Deleted legacy `/dating/matches` detail UI; `[id]` redirect → `/dating/me-matches/[id]` |
| Prod gate | `/matches`, `/dating/matches` in `internal-routes-gate.ts` + middleware matcher |
| Runbook | `LAUNCH_COHORT_RUNBOOK.md` §5 updated |
| Type hygiene | `MePartnerGenderChoice` — green build TS fix |
| Tests | **275/275** UI; middleware + gate specs |

Handoffs: `handoffs/STORY_01_prod_deploy_hygiene/agent-*.md`

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Remove dead compare UI source entirely (`/matches` POC) | Tech-debt cleanup |
| Prune unused `MatchDetailApiResponse` types | Optional polish |
| CI job enforcing build on every PR | DevOps |
| Operator prod-start browser smoke | Manual smoke § |
