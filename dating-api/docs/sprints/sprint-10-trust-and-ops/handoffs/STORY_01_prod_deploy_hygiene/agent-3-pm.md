# Handoff: Agent 3 — PM — Story 1

**Agent:** 3 pm  
**Story:** [STORY_01_prod_deploy_hygiene.md](../../STORY_01_prod_deploy_hygiene.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Story 1 closed as Done (engineering gate)** — legacy `/dating/matches` detail UI removed; redirect to `/dating/me-matches`; prod middleware blocks `/matches` and `/dating/matches`; runbook §5 updated; **`npm run build` green**.
- Full pipeline: architect → dev → code review (middleware test hardening) → pm.
- **Resolves Sprint 9 pre-deploy blocker** documented in [SPRINT_9_CLOSEOUT.md](../../sprint-09-product-mvp/SPRINT_9_CLOSEOUT.md).
- **Sprint 10 progress: 1/6** engineering stories done.

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Green `npm run build` | Done | `npm run build` exit 0 |
| Legacy compare UI resolved | Done | Orphan components deleted; `[id]` redirect |
| Prod `/matches` → 404 | Done | `internal-routes-gate.ts` + middleware matcher |
| Prod `/dating/matches` → 404 | Done | Prefix + middleware specs |
| Escape hatch preserved | Done | `NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES=1` tested |
| Runbook updated | Done | `LAUNCH_COHORT_RUNBOOK.md` §5 |
| UI tests pass | Done | **275/275** |
| Manual prod-start smoke | Pending operator | Story manual smoke § |

---

## Acceptance criteria

**6 / 6** engineering AC met.

**Legacy path:** Chosen approach was delete + redirect (architect locked) — not import patch.

**Adjacent fix:** `MePartnerGenderChoice` type narrowed for build TS — no product behavior change.

---

## Sprint 10 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Prod deploy hygiene | **Done** (manual smoke pending operator) |
| 2 | Photo moderation pipeline | Planned |
| 3 | Admin report queue | Planned |
| 4 | Match feedback | Planned |
| 5 | Candidate photo filter | Planned |
| 6 | Invite referral tracking | Planned |

**Sprint status:** In progress (1/6).

---

## Artifacts updated

| Path | Change |
|------|--------|
| `STORY_01_prod_deploy_hygiene.md` | Status Done, AC/DoD checked, shipped table |
| `README.md` (sprint-10) | Story 1 row; build blocker note resolved |
| `SPRINT_9_CLOSEOUT.md` | Pre-deploy blocker marked resolved (Story 10-1) |
| `handoffs/STORY_01_prod_deploy_hygiene/agent-3-pm.md` | this file |

---

## Decisions (do not reverse without discussion)

- Story closes on **engineering gate**; prod `npm run start` browser smoke is operator waiver (same pattern as Sprint 9).
- `/matches` compare POC **source kept** in dev; prod-gated only (not deleted).
- `/dating/matches` returns **404 in prod** even though dev would redirect — product uses `/dating/me-matches` only.

---

## Tests / verification

- [x] Full UI suite — **275/275** pass
- [x] `npm run build` — **pass**
- [ ] Manual prod-start smoke — pending operator

---

## Operator manual smoke (Story 1)

1. `cd dating-ui && npm test && npm run build`
2. `NODE_ENV=production npm run start` → `/matches` and `/evaluate` → **404**
3. With session cookie → `/dating/me-matches` loads (not 404)
4. `NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES=1` → `/matches` reachable (ops debug only)

---

## Open questions / blockers

- None blocking Story 2 start.

Follow-up (not blocking):

- Optional prune `MatchDetailApiResponse` from `dating/_lib/types.ts`
- CI job enforcing `npm run build` on every PR (DevOps)

---

## Next work

```text
--agent 0 sprint 10 story 2
```

Recommended: Story 2 (photo moderation) — Story 3 admin routes can follow Story 1 gate pattern.
