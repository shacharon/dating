# Story 6: Engine change validation

**Sprint:** 11  
**Status:** **Done** (engineering gate — operator compare smoke pending)  
**Depends on:** [Story 5](./STORY_05_engine_review_approval_workflow.md)

---

## Why

Approval (Story 5) is the gate **before** change. Validation is the proof **after** change — did positive rate hold or improve? Without comparison, engine tweaks are blind.

---

## What

**As a** product owner  
**I want** to compare feedback KPIs before and after an engine change  
**So that** I can approve keeping, reverting, or iterating on the matcher

### Acceptance criteria

- [x] **API** — `GET /api/v1/admin/match-quality/compare`
  - Query: `beforeStart`, `beforeEnd`, `afterStart`, `afterEnd` (ISO dates) OR `beforeDays` + `afterDays` shorthand
  - Response: two summary blocks + deltas (`positiveRateDelta`, `feedbackCountDelta`)
- [x] **CLI or script** — `npm run match-quality:compare` (or documented `ts-node` script) using same service logic as API for local/staging
- [x] **Runbook** — post-deploy section in `MATCH_QUALITY_RUNBOOK.md`:
  - Wait ≥ 7 days after change OR minimum N feedback rows (configurable note, e.g. N=30)
  - Compare windows; rollback if positive rate drops &gt; 10 pts with stable adoption
- [x] **Approval doc appendix** — `ENGINE_CHANGE_APPROVAL.md` includes “Post-validation results” section
- [x] **Tests** — compare endpoint with disjoint date windows; delta math correct

### Out of scope (this story)

- Automatic rollback on metric drop
- Using feedback as a live ranking input (Sprint 12+)
- A/B per-user assignment

---

## Definition of done

- [x] PM can validate a staging engine tweak with compare API + runbook
- [x] Story 5 approval + Story 6 validation = full **analyze → approve → ship → verify** loop

---

## Manual smoke

1. Seed feedback in two date ranges with different positive rates.
2. `GET compare` → `positiveRateDelta` matches manual calculation.
3. Complete post-validation section on a dry-run approval doc.

---

## Shipped (2026-06-10)

| Area | Deliverable |
|------|-------------|
| API | `GET /api/v1/admin/match-quality/compare` (shorthand + ISO) |
| CLI | `npm run match-quality:compare` |
| Service | `aggregatePeriodSummary` refactor (shared with summary) |
| Docs | Runbook post-deploy §; `ENGINE_CHANGE_APPROVAL.md` §6 mapping |

**Deploy:** API only — no migration.

---

## Product action items (owner)

| When | Action |
|------|--------|
| ≥7d after engine deploy (or ≥30 feedback rows in after window) | Run compare → fill approval §6 |
| `positiveRateDelta < -0.10` + stable adoption | Revert + document **Revert** in §6 |
| Otherwise | **Keep** or **Iterate**; archive JSON under `docs/engine/approvals/` |

---

## Deferred to Sprint 12+

| Item | Notes |
|------|--------|
| Feedback-weighted ranking | Requires validated baseline from this sprint |
| Shadow scoring | Run new engine offline, compare audit outputs |
| `match.feedback` → feature store | For ML / tuning |
