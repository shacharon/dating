# Handoff: Agent 2 — Code review — Story 6

**Agent:** 2 code-review  
**Story:** [STORY_06_launch_ux_polish.md](../../STORY_06_launch_ux_polish.md)  
**Sprint:** sprint-09-product-mvp  
**Date:** 2026-06-06  
**Status:** complete  
**Verdict:** approved (one bug fix + test hardening applied)

---

## Summary

- Reviewed Agent 1 implementation against `agent-0-architect.md` — **aligned** on analysis waiting panel + poll/redirect, empty match state, settings redirects, match detail reorder, prod middleware gate, runbook, nav prefs link, i18n.
- **Fixed:** `FAILED` status with existing `evaluationId` previously rendered a blank analysis page (waiting panel gated on `!evaluationId`); now shows failed panel + retry per architect §1.
- **Test hardening:** FAILED re-run panel spec, poll helper regression, middleware `/dev` prod 404 with session cookie.
- Full UI suite: **267/267** pass.

---

## Review notes

| Area | Finding | Severity |
|------|---------|----------|
| Analysis waiting UX | `AnalysisProgressPanel` + poll backoff; redirect guarded via `autoRedirectRef` | OK |
| Redirect regression | No redirect when `ANALYZED` + `evaluationId` on mount | OK (+ spec) |
| Poll constants | 5s initial, 1.5× backoff, 10s cap, 10min max | OK |
| FAILED terminal state | Was blank when `evaluationId` present | **Fixed** |
| Re-run flow | Poll starts on click before submit returns (optimistic) | Nit — acceptable |
| Dead state | `autoRedirectOnComplete` React state never read (ref used) | Nit — cleanup optional |
| Empty match list | Cohort copy, prefs/profile links, copy invite | OK |
| Place interpolation | `locationLabel` \|\| `city` from profile fetch | OK |
| Settings redirects | Server `redirect()` — no TODO shells | OK |
| Match detail layout | Takeaway → chips → `Match score · N` (`text-sm`) | OK (+ DOM order spec) |
| Prod middleware | 404 before auth; escape hatch env | OK |
| Matcher coverage | `/profiles`, `/evaluate`, `/auto-matches`, `/dev` | OK |
| Runbook | All 7 sections + CloudWatch snippets | OK |
| Nav prefs | `/settings/preferences` wired | OK |
| i18n | `analysisProgress`, `launch.emptyMatches`, `launch.matchDetail` en/es | OK |
| Optional AC | No mailto invite; no edit-basics link on waiting panel | OK — architect optional |
| Build | Fails on legacy `/dating/matches/children-unsure-badge.tsx` imports | Known pre-existing — not Story 6 |
| Manual smoke | Operator-owned | Deferred |

---

## Fixes applied

| Path | Change |
|------|--------|
| `dating-ui/src/app/dating/analysis/analysis-progress-poll.ts` | Show waiting panel for all `FAILED` (not only `!evaluationId`) |
| `dating-ui/src/app/dating/analysis/analysis-progress-poll.spec.ts` | Assert `FAILED` + prior `evaluationId` shows waiting |
| `dating-ui/src/app/dating/analysis/page.spec.tsx` | Assert failed panel + retry when status `FAILED` with prior eval |
| `dating-ui/src/middleware.spec.ts` | Assert `/dev/tools` → 404 in production with session |

---

## Tests / verification

- [x] `cd dating-ui && npm test` → **267/267** pass
- [ ] `cd dating-ui && npm run build` → still blocked by legacy `/dating/matches` compile error (documented in runbook §5 as dev-only `/matches`)
- [ ] Manual smoke — pending operator (story steps 1–4)

### Runtime verification

| Check | Result |
|-------|--------|
| Waiting panel on `ANALYZING` | Page spec |
| Auto-redirect on poll `ANALYZED` (wait session) | Page spec |
| No redirect browsing completed results | Page spec |
| FAILED + retry | Page spec (+ poll helper) |
| Empty state actions | Component + page specs |
| Match detail takeaway before score | Page spec |
| Prod 404 `/evaluate`, `/profiles`, `/dev` (auth cookie ignored) | Middleware specs |
| Escape hatch | `internal-routes-gate.spec.ts` |

---

## Acceptance criteria (engineering gate)

| AC | Status |
|----|--------|
| Analysis waiting page — progress, wait copy, profile/photo links | Done + tested |
| Auto-redirect to matches when analyzed (wait session only) | Done + tested |
| Empty match list — cohort copy + actions | Done + tested |
| Settings profile pages — redirects, no TODO | Done |
| Match detail human-first layout | Done + tested |
| Launch runbook committed | Done |
| Prod internal routes gated | Done + tested |
| UI tests | Done |

---

## Open questions / blockers

- None blocking agent 3 PM closeout.

Follow-up (not blocking):

- Remove unused `autoRedirectOnComplete` state (keep ref only).
- Fix legacy `/dating/matches` build break or prod-gate `/matches` (runbook already notes dev-only).
- Optional: mailto invite secondary action; edit-basics link on waiting panel.

---

## Next agent

```text
--agent 3 sprint 9 story 6
```

**Notes for PM closeout:**

1. Mark story AC checkboxes + sprint README **6/6** (final story).
2. Manual smoke still pending for Stories 1–6 (operator).
3. Document build blocker separately if prod deploy requires green `npm run build` — unrelated legacy route.
