# Handoff: Agent 2 — Code Review — Sprint 43 Story 4

**Agent:** 2 code-review  
**Story:** [STORY_04_beta_launch_prep.md](../../STORY_04_beta_launch_prep.md)  
**Sprint:** sprint-43-smart-triage-launch  
**Date:** 2026-08-05  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)

**Verdict:** **approved** — Architect locks met; checklist PASS; NITs fixed. No must-fix blockers.

---

## Summary

- Docs pack under `docs/beta/` (kill criteria, invite, schedule, smoke, cookbook, user-list template — no PII).
- Admin Postgres metrics API/UI (cards only); opener rates via `buildOpenerWeeklyReport`; D7 advisory when n&lt;20.
- Public `/support` mailto (no SupportTicket / Nest POST).
- CR: fixed mailto address over-encoding; clarified env docs + helper JSDoc.

---

## Checklist vs Architect / Story CR

| Check | Result |
|-------|--------|
| `docs/beta/*` pack complete | **Pass** — 7 files |
| Metrics: active 7d, sign-ups, D7, opener usage/response, HIGH share, HP emails | **Pass** |
| D7 small-n advisory (&lt;20) | **Pass** |
| Priority share observed (85/70), not fake 20/40/40 targets | **Pass** |
| Reuse opener report math | **Pass** — `buildOpenerWeeklyReport` |
| Admin guards (`AuthGuard` + `AdminGuard`) + UI under `/admin` | **Pass** |
| Metric cards only — no chart libs | **Pass** |
| Browse→message omitted from admin; CW in cookbook | **Pass** |
| `/support` mailto; no SupportTicket migration | **Pass** |
| `NEXT_PUBLIC_SUPPORT_EMAIL` wired; footer + account links | **Pass** |
| Invite / kill / schedule / smoke docs | **Pass** |
| No PII user list in git | **Pass** |
| Kill criteria realistic + Week 4 + qualitative required | **Pass** |
| Agent 4 / ranking | **Skip / unchanged** |

---

## Issues

### Critical
- None

### Major
- None

### Fixed in CR (NIT → done)
1. **`mailto:` over-encoded address** (`user%40host`) — breaks many clients; leave address raw, encode subject/body only + spec assert.
2. Misleading JSDoc on `parseBetaStartParam` (“invalid → null”).
3. Docs index: call out aligning `NEXT_PUBLIC_SUPPORT_EMAIL` with ops inbox.

### Accepted / non-blocking
1. Admin UI does not expose `betaStart` picker — API supports `?betaStart=`; default 30d is fine for Monday ritual.
2. No Nest fallback from `REPORT_OPS_EMAIL` into the browser — architect allows public env as the client source of truth.
3. Loading full 7d opener cache rows is fine at ~100-user beta scale.

---

## Fixes / tests added

| Path | Change |
|------|--------|
| `dating-ui/src/lib/support-mailto.ts` (+ spec) | Raw mailto address |
| `dating-api/.../beta-metrics.helpers.ts` | JSDoc fix |
| `dating-ui/.../support-page-client.tsx` | `import type { FormEvent }` |
| `dating-api/docs/beta/README.md` | Env alignment note |

---

## Tests / verification

```bash
cd dating-api
npx jest src/admin/admin-beta-metrics --no-coverage --forceExit

cd ../dating-ui
npx vitest run "src/lib/admin-beta-metrics-api.spec.ts" "src/lib/support-mailto.spec.ts" "src/app/admin/beta-metrics/page.spec.tsx" "src/app/(public)/support/page.spec.tsx" "src/app/(authenticated)/settings/account/page.spec.tsx" "src/lib/i18n/index.spec.ts"
```

- [x] **9 passed** Jest (helpers + service)
- [x] **12 passed** Vitest (Story 4 UI + i18n)
- [ ] Manual: set `NEXT_PUBLIC_SUPPORT_EMAIL` + admin allowlist — Agent 3
- [ ] Agent 4 — **N/A** skip

---

## Remaining for Agent 3

- Configure `NEXT_PUBLIC_SUPPORT_EMAIL` (and admin env) where hosts run.
- Smoke `/admin/beta-metrics` + `/support` mailto in a browser.
- External beta user sheet from template; execute smoke + launch schedule as ops allow.
- Confirm kill criteria feel realistic for founders.

---

## Next agent

```text
--agent 3 sprint 43 story 4
```
