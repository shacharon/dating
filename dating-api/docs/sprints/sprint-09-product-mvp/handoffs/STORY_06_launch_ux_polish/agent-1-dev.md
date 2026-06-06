# Handoff: Agent 1 — Senior dev — Story 6

**Agent:** 1 senior-dev  
**Story:** [STORY_06_launch_ux_polish.md](../../STORY_06_launch_ux_polish.md)  
**Sprint:** sprint-09-product-mvp  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Analysis waiting UX** — `/dating/analysis` shows `AnalysisProgressPanel` for in-flight / first-result waits; interval poll (5s→10s backoff) replaces 45s/90s one-shots during wait sessions; auto-redirect to `/dating/me-matches` when `ANALYZED` (guarded — no redirect when browsing completed results).
- **Empty match list** — `MatchListEmptyState` with cohort copy, prefs/profile links, copy-invite button; optional city from `fetchMyProfile()`.
- **Settings profile routes** — server `redirect()` to `/dating/profile`, `/onboarding/basic?edit=1`, `/onboarding/texts?edit=1`.
- **Match detail layout** — takeaway → chips → de-emphasized score (`Match score · N`); removed hero 2xl score box.
- **Prod internal routes** — `internal-routes-gate.ts` + middleware 404 for `/profiles`, `/evaluate`, `/auto-matches`, `/dev/*` in production.
- **Nav** — Match preferences menu item links to `/settings/preferences` (was TODO).
- **Ops doc** — `LAUNCH_COHORT_RUNBOOK.md`.

---

## Artifacts shipped

| Area | Path |
|------|------|
| Poll helpers | `dating-ui/src/app/dating/analysis/analysis-progress-poll.ts` + spec |
| Progress panel | `dating-ui/src/components/analysis-progress-panel.tsx` + spec |
| Analysis page | `dating-ui/src/app/dating/analysis/page.tsx` + rewritten `page.spec.tsx` |
| Empty state | `dating-ui/src/components/match-list-empty-state.tsx` + spec |
| Matches list | `dating-ui/src/app/dating/me-matches/page.tsx` + empty-state spec |
| Match detail | `dating-ui/src/app/dating/me-matches/[id]/page.tsx` + layout spec |
| Settings redirects | `settings/profile/page.tsx`, `basic/page.tsx`, `story/page.tsx` |
| Middleware gate | `dating-ui/src/middleware.ts`, `internal-routes-gate.ts` + specs |
| i18n | `analysisProgress`, `launch.emptyMatches`, `launch.matchDetail` (en + es) |
| Nav | `dating-ui/src/components/nav-auth.tsx` |
| Runbook | `dating-api/docs/sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md` |

---

## Implementation notes

### Poll redirect guard

`autoRedirectRef` stores redirect intent so the first poll tick does not read stale `autoRedirectOnComplete` state from a pre-update closure (regression that would skip redirect).

### Analysis page modes

| Mode | UI |
|------|-----|
| Waiting (`shouldShowWaitingPanel`) | `AnalysisProgressPanel` + poll when `computeAutoRedirectOnComplete` |
| Results (`ANALYZED` + `evaluationId`, no active wait) | Existing insight cards + re-run button |

Re-run sets `startPoll(true)` on submit success (same redirect path as first submit).

---

## Tests / verification

- [x] `cd dating-ui && npm test` → **264/264** pass (+17 net vs prior sprint baseline from new specs)
- [ ] `cd dating-ui && npm run build` → **fails pre-existing** — legacy `/dating/matches/children-unsure-badge.tsx` imports missing exports from `_lib/children-unsure.ts` (unrelated to Story 6; `/matches` not prod-gated in v1)
- [ ] Manual smoke — operator (story steps 1–4)

---

## Deviations from architect

| Item | Note |
|------|------|
| Build green | Blocked by pre-existing legacy `/dating/matches` compile error; Story 6 routes compile in isolation via tests |

---

## Open questions / blockers

- None blocking agent 2 CR.
- Optional follow-up: gate `/matches` in prod middleware (architect noted as non-blocking).

---

## Next agent

```text
--agent 2 sprint 9 story 6
```

**Notes for CR:**

1. Confirm auto-redirect does not fire when opening analysis with existing `ANALYZED` + `evaluationId` (`page.spec.tsx` regression test).
2. Confirm prod middleware 404 runs before auth (authenticated `/evaluate` still 404).
3. Match detail: takeaway DOM order before score; no `text-2xl` score box.
4. Settings redirects are server components (no client TODO shell).
