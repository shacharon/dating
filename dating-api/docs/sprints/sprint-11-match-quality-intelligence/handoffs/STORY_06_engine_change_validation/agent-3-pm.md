# Handoff: Agent 3 — PM — Story 6

**Agent:** 3 pm  
**Story:** [STORY_06_engine_change_validation.md](../../STORY_06_engine_change_validation.md)  
**Sprint:** sprint-11-match-quality-intelligence  
**Date:** 2026-06-10  
**Status:** complete  

---

## Summary

- **Story 6 closed as Done (engineering gate)** — compare API (shorthand + ISO), CLI, post-deploy runbook, approval §6 mapping.
- Full pipeline: architect → dev → code review → pm.
- **Sprint 11 complete: 7/7 engineering gate.**
- **Full product loop shipped:** collect (Sprint 10) → analyze → approve → verify.

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| PM can validate with compare API + runbook | Done | API + runbook post-deploy § |
| analyze → approve → ship → verify loop | Done | Stories 5 + 6 |
| Manual smoke (story §) | Pending operator | ISO compare on staged feedback |

---

## Acceptance criteria

**5 / 5** engineering AC met.

| AC | Status |
|----|--------|
| Compare API | Done |
| CLI `match-quality:compare` | Done |
| Runbook post-deploy | Done |
| Approval §6 instructions | Done |
| Tests | Done |

---

## Sprint 11 progress (final)

| # | Story | Status |
|---|--------|--------|
| 0 | Admin security hardening | **Done** (operator smoke pending) |
| 1 | Feedback KPI runbook | **Done** (operator staging smoke pending) |
| 2 | Admin feedback aggregates API | **Done** (operator staging smoke pending) |
| 3 | Admin match quality dashboard | **Done** (operator staging smoke pending) |
| 4 | Feedback → audit drill-down | **Done** (operator staging smoke pending) |
| 5 | Engine review & approval workflow | **Done** (operator curl smoke pending) |
| 6 | Engine change validation | **Done** (operator compare smoke pending) |

---

## Artifacts updated

| Path | Change |
|------|--------|
| `STORY_06_engine_change_validation.md` | Status Done, shipped table, product actions |
| `STORY_05_engine_review_approval_workflow.md` | Deferred compare → Addressed |
| `README.md` (sprint-11) | 7/7 complete; sprint outcome shipped |
| `handoffs/STORY_06_engine_change_validation/agent-3-pm.md` | this file |

---

## Decisions (do not reverse without discussion)

- Story closes on **engineering gate**; operator compare smoke waived to ops.
- **Rollback rule:** `positiveRateDelta < -0.10` with stable adoption (≥15% proxy from logs).
- **Wait rule:** ≥7 days post-deploy **or** ≥30 feedback rows in after window (whichever later).
- **No auto-rollback** — human decision via approval §6.

---

## Post-deploy ritual (new)

After any matcher deploy (Story 5 sign-off required first):

1. Wait per runbook (7d or 30 rows).
2. Compare:
   ```bash
   curl -b "dating_session=$SESSION" \
     "$API/api/v1/admin/match-quality/compare?beforeDays=7&afterDays=7"
   ```
   Or: `npm run match-quality:compare -- --before-days 7 --after-days 7`
3. Paste `before`/`after`/`deltas` into [ENGINE_CHANGE_APPROVAL.md](../../../engine/ENGINE_CHANGE_APPROVAL.md) §6.
4. Check adoption from logs — stable before applying rollback rule.
5. **Keep** / **Revert** / **Iterate** + archive under `docs/engine/approvals/`.

---

## Operator manual smoke (Story 6)

Prerequisites: Staged feedback in two disjoint date ranges (or use ISO bounds matching seed data).

1. `GET .../compare?beforeStart=...&beforeEnd=...&afterStart=...&afterEnd=...`
2. Verify `deltas.positiveRateDelta` matches hand calculation.
3. Fill §6 on a copy of the approval template.

---

## Sprint 11 operator backlog (all stories)

| Smoke | Owner action |
|-------|----------------|
| Story 0 | Prod admin 404 until `ADMIN_ENABLED=1` + network gate |
| Stories 1–4 | Weekly ritual on gated staging with real feedback rows |
| Story 5 | Export CSV curl smoke |
| Story 6 | Compare API smoke |

---

## Next work (Sprint 12+)

Not in Sprint 11 scope — ticket when ready:

- Feedback-weighted ranking (requires validated baseline from this sprint)
- Dashboard export/compare buttons
- `match.detail_viewed` for true adoption denominator
- Shadow scoring / A/B framework

---

## Open questions / blockers

- None blocking story or sprint closeout.
