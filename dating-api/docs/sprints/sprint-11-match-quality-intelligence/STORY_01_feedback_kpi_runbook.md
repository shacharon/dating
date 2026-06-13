# Story 1: Feedback KPI runbook

**Sprint:** 11  
**Status:** Done (engineering gate — operator staging smoke pending)  
**Depends on:** [Sprint 10 Story 4](../sprint-10-trust-and-ops/STORY_04_match_feedback.md)

---

## Why

Sprint 10 stores feedback but product has no **defined metrics**, **queries**, or **weekly ritual**. Without that, thumbs are unused and engine debates stay subjective.

---

## What

**As a** product owner  
**I want** documented KPIs and queries for match feedback  
**So that** I can run a repeatable weekly quality review

### Acceptance criteria

- [x] **Runbook** — `docs/analytics/MATCH_QUALITY_RUNBOOK.md` with metrics, weekly ritual, escalation
- [x] **SQL pack** — 7-day queries + 30-day guidance; `scripts/sql/match-quality-kpis.sql`
- [x] **CloudWatch** — adoption % + sentiment queries (`match.feedback` vs `match.list_viewed`)
- [x] **Baseline targets** — adoption ≥ 15%, positive ≥ 60% (hypotheses; tune after week 1)
- [x] **PRODUCT_FUNNEL.md** — cross-link + Match quality §
- [x] **Sprint README** — KPI section links runbook

### Out of scope (this story)

- Admin API or UI (Stories 2–3)
- Engine code changes
- Automated weekly email reports

---

## Definition of done

- [x] PM can run week-1 review using only the runbook + DB or logs
- [x] No engineering required for read-only KPI pull

---

## Manual smoke

1. Insert 2+ feedback rows in staging.
2. Run positive-rate SQL → matches manual count.
3. Tail logs → `match.feedback` lines findable per runbook.

**Operator:** see `handoffs/STORY_01_feedback_kpi_runbook/agent-3-pm.md`.

---

## Shipped (2026-06-10)

| Area | Deliverable |
|------|-------------|
| Runbook | [MATCH_QUALITY_RUNBOOK.md](../../analytics/MATCH_QUALITY_RUNBOOK.md) — KPIs, ritual, SQL, CloudWatch, CLI audit |
| SQL | [scripts/sql/match-quality-kpis.sql](../../../scripts/sql/match-quality-kpis.sql) |
| Funnel | [PRODUCT_FUNNEL.md](../../analytics/PRODUCT_FUNNEL.md) — Match quality § |
| Sprint | README KPI table → runbook |

**Deploy:** docs only — no migration or app deploy.

---

## Product action items (owner)

| Cadence | Action |
|---------|--------|
| Weekly | Run ritual in [runbook § Weekly ritual](../../analytics/MATCH_QUALITY_RUNBOOK.md#weekly-ritual-30-minutes) |
| After deploy | Compare positive rate to prior 7 days (WoW SQL in runbook) |
| Before engine change | Complete Story 5 checklist |

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| `match.detail_viewed` analytics | Sprint 12+ (better adoption denominator) |
| Adoption % in admin API | Story 2 optional |
| Automated weekly email | Out of scope |
