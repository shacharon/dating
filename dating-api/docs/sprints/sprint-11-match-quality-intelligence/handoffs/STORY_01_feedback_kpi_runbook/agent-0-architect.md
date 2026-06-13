# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_feedback_kpi_runbook.md](../../STORY_01_feedback_kpi_runbook.md)  
**Sprint:** sprint-11-match-quality-intelligence  
**Date:** 2026-06-10  
**Status:** complete  

---

## Summary

- **Docs-only story** — no Prisma, API, or UI code. Complete and harden `MATCH_QUALITY_RUNBOOK.md` so PM can run week-1 review from SQL + logs alone.
- **Scaffold exists** (~70% from sprint planning) — agent 1 fills gaps: locked metric formulas, 30-day SQL pack, adoption % from logs, baseline targets table, audit CLI steps, sprint README link.
- **No `match.detail_viewed` event** today — adoption v1 uses **user-level proxy** (feedback reporters ÷ `match.list_viewed` users from analytics logs). Document limitation; Story 2 API may omit adoption % until log pipeline or future event.
- **Story 2 contract input** — summary metrics in this runbook become the **source of truth** for `GET /admin/match-quality/summary` field definitions.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/docs/analytics/MATCH_QUALITY_RUNBOOK.md` | **update** — complete per § Deliverables below |
| `dating-api/docs/analytics/PRODUCT_FUNNEL.md` | **verify** cross-link exists (already present); add § “Match quality KPIs” pointer if missing |
| `dating-api/docs/sprints/sprint-11-match-quality-intelligence/README.md` | **update** KPI table → link to runbook § Baseline targets |
| `dating-api/docs/sprints/sprint-11-match-quality-intelligence/STORY_01_feedback_kpi_runbook.md` | agent 3 marks Done |
| **No code** | — |

Optional (agent 1 discretion — prefer inline in runbook):

| Path | Change |
|------|--------|
| `dating-api/scripts/sql/match-quality-kpis.sql` | **optional** — copy of runbook queries for psql `-f` |

---

## Decisions (do not reverse without discussion)

### 1. KPI definitions (locked for Story 1 + Story 2)

| Metric | Formula (window = 7 or 30 days) | Source |
|--------|----------------------------------|--------|
| **Feedback count** | `COUNT(*)` from `MatchFeedback` where `createdAt` in window | Postgres |
| **Positive rate** | `COUNT(POSITIVE) / NULLIF(COUNT(*), 0)` — excludes users who never feedback | Postgres |
| **Distinct reporters** | `COUNT(DISTINCT userId)` on `MatchFeedback` | Postgres |
| **Distinct negative candidates** | `COUNT(DISTINCT matchProfileId)` where `sentiment = NEGATIVE` | Postgres |
| **Adoption % (v1)** | `distinct_reporters / distinct_list_viewers` × 100 | Logs: `match.feedback` + `match.list_viewed` envelope `userId` |
| **Actionable negative** | `matchProfileId` with ≥ **3** distinct `userId` negatives in window | Postgres |

**Adoption denominator:** use **distinct `userId`** on `match.list_viewed` events (not event count — one user may open list many times).

**Known limitation (document in runbook):** Opening match **detail** does not emit analytics. Adoption is a **proxy** (reporters vs list viewers), not “% of detail views that got thumbs.” Defer `match.detail_viewed` event to Sprint 12+.

**Story 2 API:** implement `positiveRate`, `feedbackCount`, `distinctReporters` from DB; **adoption % optional in v1** or computed only when log aggregate supplied — runbook remains canonical.

### 2. Baseline targets (hypotheses — tune after week 1)

| Metric | Week-1 hypothesis | Action if missed |
|--------|-------------------|------------------|
| Adoption % | ≥ **15%** | &lt; 10% for 2+ weeks → UX review (match detail copy/placement) |
| Positive rate | ≥ **60%** | &lt; 50% with adoption ≥ 15% → Story 5 engine review |
| Actionable negatives | review top 10 weekly | ≥ 3 distinct reporters on same `matchProfileId` → drill-down (Story 4) |

### 3. Weekly ritual (locked steps)

1. Set window (default 7d; monthly review 30d).
2. Run SQL pack → positive rate + top negatives.
3. Run CloudWatch / local log queries → adoption %.
4. Sample 5 top-negative `matchProfileId`s — CLI audit (below) until Story 4 admin UI.
5. Record 1–2 hypotheses in [ENGINE_CHANGE_APPROVAL.md](../../engine/ENGINE_CHANGE_APPROVAL.md) appendix (Story 5).
6. **No ranking deploy** without Story 5 sign-off.

### 4. Drill-down until Story 4 (CLI)

```powershell
cd dating-api
npx ts-node --project tsconfig.json scripts/match-quality-audit.ts `
  --viewer-user-id <userId-from-negative-row> `
  --candidate-profile-id <matchProfileId>
```

Reference: [match-quality-audit-manual-review.md](../../match-quality-audit-manual-review.md).

### 5. Out of scope (unchanged)

- Admin API/UI (Stories 2–3)
- New analytics events
- Automated email reports

---

## Deliverables for agent 1 (runbook sections to add/complete)

### A. Metric definitions §

Expand “What you are measuring” with locked formulas table (§1 above) + adoption limitation note.

### B. SQL pack — 7-day AND 30-day

Duplicate each query with `INTERVAL '7 days'` and `INTERVAL '30 days'` subsections.

Add:

```sql
-- Week-over-week positive rate (compare last 7d vs prior 7d)
SELECT
  COUNT(*) FILTER (WHERE sentiment = 'POSITIVE' AND "createdAt" >= NOW() - INTERVAL '7 days')::float
  / NULLIF(COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days'), 0) AS positive_rate_current,
  COUNT(*) FILTER (WHERE sentiment = 'POSITIVE' AND "createdAt" >= NOW() - INTERVAL '14 days' AND "createdAt" < NOW() - INTERVAL '7 days')::float
  / NULLIF(COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '14 days' AND "createdAt" < NOW() - INTERVAL '7 days'), 0) AS positive_rate_prior;
```

```sql
-- Actionable negatives (≥ 3 distinct reporters)
SELECT "matchProfileId", COUNT(DISTINCT "userId") AS distinct_negative_reporters
FROM "MatchFeedback"
WHERE sentiment = 'NEGATIVE' AND "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY "matchProfileId"
HAVING COUNT(DISTINCT "userId") >= 3
ORDER BY distinct_negative_reporters DESC;
```

### C. CloudWatch — adoption %

```sql
fields @timestamp, event, userId
| filter logKind = "product_analytics" and event in ["match.list_viewed", "match.feedback"]
| stats count_distinct(userId) as users by event
```

Document manual calc: `users(match.feedback) / users(match.list_viewed) * 100` (same window filter on `@timestamp`).

Add time-bounded variant:

```sql
fields @timestamp, event, userId
| filter logKind = "product_analytics"
| filter event in ["match.list_viewed", "match.feedback"]
| filter @timestamp > ago(7d)
| stats count_distinct(userId) as users by event
```

### D. Local dev — structured log grep

```powershell
# Feedback events (last session)
Select-String -Path dating-api/logs/dating-api.log -Pattern '"event":"match\.feedback"'

# List views for adoption denominator
Select-String -Path dating-api/logs/dating-api.log -Pattern '"event":"match\.list_viewed"'
```

### E. Baseline targets §

Dedicated table (§2 above) with “tune after week 1” callout.

### F. Escalation table

Already present — verify thresholds match §2; add row for “adoption unmeasurable (no list_viewed logs)” → fix logging / `PRODUCT_ANALYTICS_ENABLED`.

### G. Sprint README

In **Product KPIs** section, change metric definitions to link:

```markdown
See [MATCH_QUALITY_RUNBOOK.md](../../analytics/MATCH_QUALITY_RUNBOOK.md) for formulas and queries.
```

### H. PRODUCT_FUNNEL.md

Ensure `match.feedback` row links runbook (done). Add short **Match quality** subsection after Events table:

```markdown
## Match quality (Sprint 11)

Weekly PM review: [MATCH_QUALITY_RUNBOOK.md](./MATCH_QUALITY_RUNBOOK.md). Primary events: `match.list_viewed` (denominator proxy), `match.feedback` (numerator).
```

---

## API contract

**N/A** — no new endpoints.

**Story 2 forward reference** (for PM only):

```typescript
// GET /api/v1/admin/match-quality/summary — fields must align with runbook §1
interface AdminMatchQualitySummary {
  windowDays: number;
  feedbackCount: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number | null; // null when feedbackCount === 0
  distinctReporters: number;
  distinctCandidates: number; // distinct matchProfileId with any feedback
  // adoptionRate?: number — defer or manual until log pipeline
}
```

---

## Prisma / migrations

**N/A** — read `MatchFeedback` only.

```prisma
model MatchFeedback {
  userId         String
  matchProfileId String
  sentiment      MatchFeedbackSentiment // POSITIVE | NEGATIVE
  createdAt      DateTime
  @@unique([userId, matchProfileId])
  @@index([matchProfileId])
  @@index([userId, createdAt])
}
```

---

## Runtime topology

**N/A** — read-only docs + SQL against Postgres and log files. No browser/socket verification.

---

## Tests / verification

- [ ] Manual smoke (story §): seed 2+ `MatchFeedback` rows → positive-rate SQL matches
- [ ] `Select-String` / CloudWatch examples runnable copy-paste
- [ ] No `npm test` required for docs-only story (agent 2: spot-check links + SQL syntax)

---

## Open questions / blockers

- None.

**Deferred:** `match.detail_viewed` analytics event; adoption % in Story 2 API without log join.

---

## Next agent

```text
--agent 1 sprint 11 story 1
```

**Notes for dev:**

- Do not add application code unless optional `scripts/sql/match-quality-kpis.sql` helps ops.
- Treat existing `MATCH_QUALITY_RUNBOOK.md` as draft — merge architect § Deliverables; avoid duplicating conflicting formulas.
- After edits, PM should complete week-1 review with **only** runbook + DB + log file.
