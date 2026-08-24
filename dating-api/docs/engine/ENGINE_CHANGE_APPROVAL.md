# Engine change approval (template)

**Sprint 11 Story 5** — complete before any matcher/scoring deploy.

Copy this file to `docs/engine/approvals/YYYY-MM-DD-<short-title>.md` or fill in place for a dry run.

**Example (sanitized):** [examples/2026-06-10-no-op-week.md](./examples/2026-06-10-no-op-week.md)

**Related:** [Engine vs HG ownership](../ops/ENGINE_VS_HG_OWNERSHIP.md) (Sprint 53 — product SoT after PairMatchPolicy).

---

## When to use

| Trigger | Action |
|---------|--------|
| Positive rate **&lt; 50%** with adoption **≥ 15%** | Schedule engine review (see [MATCH_QUALITY_RUNBOOK.md](../analytics/MATCH_QUALITY_RUNBOOK.md)) |
| Scheduled weekly/monthly engine review | Run ritual even when KPIs are healthy |
| Any matcher/scoring deploy | **Required** — baseline + sign-off before merge/deploy |

**Rule:** No matcher/scoring deploy without documented baseline KPIs + PM + engineering sign-off. Post-deploy proof uses Story 6 compare API (§6 below).

---

## Workflow

1. **Ritual** — run [weekly match-quality ritual](../analytics/MATCH_QUALITY_RUNBOOK.md) (Postgres + adoption from logs).
2. **Dashboard** — `/admin/match-quality` for positive rate and top negatives.
3. **Drill-down** — Story 4 audit on top 3–5 negatives; note one-line hypotheses per `matchProfileId`.
4. **Export** — download baseline bundle (see below).
5. **Fill §1–2** — paste export metrics; add hypotheses from drill-down.
6. **§3–5** — proposed change, risk/rollback, sign-off.
7. **Ticket** — only after both sign-offs, open engine work for Sprint 12+.

---

## Export command

Replace `$API` and session cookie with staging/prod values.

```bash
# JSON (full structure for archival)
curl -b "dating_session=$SESSION" \
  "$API/api/v1/admin/match-quality/export?windowDays=7&format=json" \
  -o match-quality-export-7d.json

# CSV (spreadsheet-friendly)
curl -b "dating_session=$SESSION" \
  "$API/api/v1/admin/match-quality/export?windowDays=7&format=csv" \
  -o match-quality-export-7d.csv
```

**Adoption %** is not in the export (logs only). Paste from CloudWatch / local log queries in [MATCH_QUALITY_RUNBOOK.md](../analytics/MATCH_QUALITY_RUNBOOK.md) § CloudWatch.

**File naming (completed approvals):** `docs/engine/approvals/YYYY-MM-DD-<slug>.md` (e.g. `2026-06-10-lifestyle-weight-tweak.md`).

---

## 1. Baseline (before change)

| Field | Value |
|-------|--------|
| Date range | e.g. 2026-06-01 → 2026-06-07 |
| Feedback adoption % | (from logs — not in export) |
| Positive rate % | (from export `summary.positiveRate` × 100) |
| Total feedback rows | (from export `summary.feedbackCount`) |
| Data source | Export above or [MATCH_QUALITY_RUNBOOK.md](../analytics/MATCH_QUALITY_RUNBOOK.md) SQL |

---

## 2. Top negative drill-downs (sample)

| matchProfileId | Negative count | One-line hypothesis (from audit) |
|----------------|----------------|----------------------------------|
| | | |

Use `/admin/match-quality/{profileId}` or CLI audit — see runbook drill-down §.

---

## 3. Proposed change

**What:** (e.g. adjust HG weight on lifestyle conflict chip)

**Why:** (link to hypothesis above)

**Scope:** (list API paths / modules touched)

---

## 4. Risk & rollback

| Item | Plan |
|------|------|
| Rollback trigger | e.g. positive rate −10 pts with adoption ≥ 15% |
| Rollback method | revert commit / flag / redeploy prior |
| User-visible impact | (e.g. reorder only, no data loss) |

---

## 5. Sign-off (pre-deploy)

| Role | Name | Date | OK |
|------|------|------|-----|
| Product | | | ☐ |
| Engineering | | | ☐ |

---

## 6. Post-validation (after deploy — Story 6)

| Field | Before | After | Delta |
|-------|--------|-------|-------|
| Date range | | | |
| Positive rate % | | | |
| Feedback count | | | |

**Decision:** ☐ Keep ☐ Revert ☐ Iterate

**Notes:**

### Compare API (fill this table)

**Shorthand** (deploy ≈ 7 days ago):

```bash
curl -b "dating_session=$SESSION" \
  "$API/api/v1/admin/match-quality/compare?beforeDays=7&afterDays=7"
```

**ISO** (bracket deploy date):

```bash
curl -b "dating_session=$SESSION" \
  "$API/api/v1/admin/match-quality/compare?beforeStart=2026-05-20T00:00:00.000Z&beforeEnd=2026-05-27T00:00:00.000Z&afterStart=2026-05-27T00:00:00.000Z&afterEnd=2026-06-03T00:00:00.000Z"
```

**CLI:** `npm run match-quality:compare -- --before-days 7 --after-days 7`

| Table column | JSON path |
|--------------|-----------|
| Date range (before) | `before.rangeStart` → `before.rangeEnd` |
| Date range (after) | `after.rangeStart` → `after.rangeEnd` |
| Positive rate % (before) | `before.positiveRate` × 100 |
| Positive rate % (after) | `after.positiveRate` × 100 |
| Delta | `deltas.positiveRateDelta` × 100 (pp) |
| Feedback count (before / after / delta) | `before.feedbackCount`, `after.feedbackCount`, `deltas.feedbackCountDelta` |

**Rollback:** `deltas.positiveRateDelta < -0.10` with stable adoption (from logs) → **Revert**.

Adoption comparison is still manual from [MATCH_QUALITY_RUNBOOK.md](../analytics/MATCH_QUALITY_RUNBOOK.md) CloudWatch §.
