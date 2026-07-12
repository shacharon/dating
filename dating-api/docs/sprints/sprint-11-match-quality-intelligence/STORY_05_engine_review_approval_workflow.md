# Story 5: Engine review & approval workflow

**Sprint:** 11  
**Status:** **Done** (engineering gate — operator curl smoke pending)  
**Depends on:** [Stories 1–4](./STORY_01_feedback_kpi_runbook.md)

---

## Why

Feedback and dashboards are useless if engineering ships ranking changes without a **documented approval gate**. Product needs a repeatable “analyze → decide → sign off” process.

---

## What

**As a** product owner  
**I want** a formal engine review checklist and sign-off template  
**So that** matcher changes are data-informed and reversible

### Acceptance criteria

- [x] **Template** — `docs/engine/ENGINE_CHANGE_APPROVAL.md`:
  - Baseline KPIs (adoption, positive rate, date range)
  - Top 5 negative drill-down summaries (from Story 4)
  - Proposed change (one paragraph)
  - Risk / rollback plan
  - Sign-off: PM + engineering (names + date)
- [x] **Admin export** — `GET /api/v1/admin/match-quality/export?windowDays=7` → JSON or CSV:
  - Summary metrics
  - Top 20 negative candidates with counts
  - (No PII)
- [x] **Runbook update** — `MATCH_QUALITY_RUNBOOK.md` links approval doc; “no deploy without sign-off” rule
- [x] **Sprint 10 deferred item closed** — “Weekly aggregate report for product” marked addressed
- [x] **README** — engine change policy in sprint-11 README

### Out of scope (this story)

- Automated blocking in CI (policy doc only for v1)
- Legal/compliance review of algorithm changes
- Live feature flags for ranking (Story 6)

---

## Definition of done

- [x] One completed example approval doc (no-op week or staging dry run) checked into `docs/engine/examples/` (sanitized ids)
- [x] Export endpoint tested

---

## Manual smoke

1. Export 7-day window → file opens in spreadsheet.
2. Fill approval template using export + one drill-down.
3. Engineering acknowledges sign-off section in dry-run review.

---

## Shipped (2026-06-10)

| Area | Deliverable |
|------|-------------|
| API | `GET /api/v1/admin/match-quality/export?windowDays=&format=json\|csv` |
| Docs | [ENGINE_CHANGE_APPROVAL.md](../../engine/ENGINE_CHANGE_APPROVAL.md) — workflow + sign-off |
| Example | [docs/engine/examples/2026-06-10-no-op-week.md](../../engine/examples/2026-06-10-no-op-week.md) |
| Runbook | Export § + approval gate in [MATCH_QUALITY_RUNBOOK.md](../../analytics/MATCH_QUALITY_RUNBOOK.md) |
| Sprint 10 | “Weekly aggregate report” deferred item → **Addressed** |

**Deploy:** API only — no migration. Export via curl (no dashboard button in v1).

---

## Product action items (owner)

| Cadence | Action |
|---------|--------|
| Weekly ritual step 5 | Export CSV/JSON → fill approval §1–2; adoption % from logs |
| Before any engine deploy | Complete §3–5 sign-off; copy to `docs/engine/approvals/YYYY-MM-DD-<slug>.md` |
| After engine deploy | Story 6 compare API fills approval §6 |

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Export button on dashboard | Story 6 or ops polish |
| CI blocker for engine deploys | v2 — policy doc only today |
| Compare API (before/after windows) | **Addressed** — [Story 6](./STORY_06_engine_change_validation.md) |
