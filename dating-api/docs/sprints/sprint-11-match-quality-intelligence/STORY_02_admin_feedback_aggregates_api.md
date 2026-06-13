# Story 2: Admin feedback aggregates API

**Sprint:** 11  
**Status:** **Done** (engineering gate; operator staging smoke pending)  
**Depends on:** [Story 1](./STORY_01_feedback_kpi_runbook.md)

**Operator:** see `handoffs/STORY_02_admin_feedback_aggregates_api/agent-3-pm.md`.

---

## Why

Weekly SQL is enough for one PM; a **stable admin API** enables the dashboard (Story 3), exports, and future automation without copy-pasting queries.

---

## What

**As an** operator  
**I want** admin APIs for feedback aggregates  
**So that** I can see match quality health without database access

### Acceptance criteria

- [x] **Auth** — `ADMIN_USER_IDS` session guard (same as `/admin/reports`)
- [x] **`GET /api/v1/admin/match-quality/summary`**
  - Query: `windowDays` (default 7, max 90)
  - Response: `{ windowDays, feedbackCount, positiveCount, negativeCount, positiveRate, distinctReporters, distinctCandidates }`
- [x] **`GET /api/v1/admin/match-quality/negative-candidates`**
  - Paginated list: `matchProfileId`, `negativeCount`, `distinctViewers`, `lastNegativeAt`
  - Sort: `negativeCount desc`
- [x] **PII** — no email, name, or profile text in responses (ids only)
- [x] **Tests** — admin 200; non-admin 403; empty window returns zeros
- [x] **Observability** — structured log on summary fetch (admin user id, window)

### Out of scope (this story)

- Per-viewer feedback history (privacy-sensitive; defer)
- Joining to `matchScore` in list endpoint (Story 4 drill-down)
- CSV download (Story 5 export)

---

## Technical notes (guidance, not prescriptive)

- New module: `AdminMatchQualityModule` or extend `AdminModule`.
- Queries against `MatchFeedback` only; adoption denominator may come from analytics later — v1 can omit adoption % in API or accept `listViews` as optional manual input.
- Index `MatchFeedback(matchProfileId)` already exists.

---

## Definition of done

- [x] Summary + negative-candidates endpoints documented in admin section of API README or sprint handoff
- [x] Integration tests with seeded feedback rows

---

## Manual smoke

1. Seed 5 positive + 3 negative rows across 2 candidates.
2. `GET summary?windowDays=7` → `positiveRate` ≈ 0.625.
3. `GET negative-candidates` → candidate with 3 negatives ranks first.

---

## Shipped (2026-06-10)

| Area | Deliverable |
|------|-------------|
| API | `GET /api/v1/admin/match-quality/summary` |
| API | `GET /api/v1/admin/match-quality/negative-candidates` |
| Module | `dating-api/src/admin/admin-match-quality/` |
| Docs | [MATCH_QUALITY_RUNBOOK.md](../../analytics/MATCH_QUALITY_RUNBOOK.md) — Admin API § |
| Ops | [ADMIN_ACCESS.md](../../ops/ADMIN_ACCESS.md) — API smoke note |

**Deploy:** API only — no migration. Requires `ADMIN_USER_IDS` on gated staging.

---

## Product action items (owner)

| Cadence | Action |
|---------|--------|
| Before Story 3 | Operator curl smoke on staging (see manual smoke §) |
| Weekly (until Story 3 UI) | Use API or SQL pack from runbook for positive rate + negatives |
| Story 3 | Dashboard consumes these two GETs — no duplicate SQL in UI |

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Adoption % in summary API | Deferred — logs only (Story 3 UI may show manual/log-sourced adoption) |
| `matchScore` on list rows | Story 4 drill-down |
| CSV export | Story 5 |
