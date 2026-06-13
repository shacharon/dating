# Match quality runbook (operator + PM)

**Sprint 11 Story 1** — weekly ritual for match suggestion quality and engine approval input.

**Prerequisite:** [Sprint 10 Story 4](../sprints/sprint-10-trust-and-ops/STORY_04_match_feedback.md) shipped (`MatchFeedback` table, `match.feedback` analytics).

**Optional SQL file:** [scripts/sql/match-quality-kpis.sql](../../scripts/sql/match-quality-kpis.sql) (same queries as below for `psql -f`).

---

## Metric definitions (locked)

| Metric | Formula (window = 7 or 30 days) | Source |
|--------|----------------------------------|--------|
| **Feedback count** | `COUNT(*)` from `MatchFeedback` where `createdAt` in window | Postgres |
| **Positive rate** | `COUNT(POSITIVE) / NULLIF(COUNT(*), 0)` | Postgres |
| **Distinct reporters** | `COUNT(DISTINCT userId)` on `MatchFeedback` | Postgres |
| **Distinct candidates** | `COUNT(DISTINCT matchProfileId)` where any sentiment in window | Postgres |
| **Adoption % (v1)** | `distinct_reporters / distinct_list_viewers` × 100 | Analytics logs |
| **Actionable negative** | `matchProfileId` with ≥ **3** distinct `userId` negatives in window | Postgres |

**Adoption denominator:** distinct `userId` on `match.list_viewed` events (not raw event count).

**Known limitation:** Match **detail** opens do not emit analytics today. Adoption is a **proxy** (users who gave feedback ÷ users who viewed the match list), not “% of detail views that got thumbs.” Defer `match.detail_viewed` to Sprint 12+.

**Not the same as likes.** Like/pass = behavior. Thumbs = relevance of the **suggestion**.

---

## Baseline targets (hypotheses — tune after week 1)

| Metric | Week-1 hypothesis | Action if missed |
|--------|-------------------|------------------|
| Adoption % | ≥ **15%** | &lt; 10% for 2+ weeks → UX review (match detail copy/placement) |
| Positive rate | ≥ **60%** | &lt; 50% with adoption ≥ 15% → [Story 5 engine review](../sprints/sprint-11-match-quality-intelligence/STORY_05_engine_review_approval_workflow.md) |
| Actionable negatives | Review top 10 weekly | ≥ 3 distinct reporters on same `matchProfileId` → drill-down ([Story 4](../sprints/sprint-11-match-quality-intelligence/STORY_04_feedback_audit_drilldown.md) or CLI below) |

---

## Weekly ritual (~30 minutes)

1. Set window — default **7 days**; monthly review use **30 days**.
2. Postgres metrics: run [SQL pack](#sql-postgres) **or** open `/admin/match-quality` on gated staging (Story 3) → positive rate, top negatives; actionable negatives still in SQL until Story 4 drill-down UI.
3. Run [CloudWatch](#cloudwatch-insights-production) or [local log](#local-dev) queries → adoption %.
4. Sample up to **5** top-negative `matchProfileId`s — **View audit** on `/admin/match-quality` (Story 4) or [CLI audit](#drill-down-admin-ui--cli) below.
5. Export baseline — `GET /api/v1/admin/match-quality/export?windowDays=7&format=csv` (or JSON); fill [ENGINE_CHANGE_APPROVAL.md](../engine/ENGINE_CHANGE_APPROVAL.md) §1–2.
6. **Do not change ranking** unless Story 5 approval checklist is complete and §5 sign-off is done.

---

## SQL (Postgres)

Replace `'7 days'` with `'30 days'` for monthly windows. Copy-paste pack: `scripts/sql/match-quality-kpis.sql`.

### 7-day window

#### Feedback count

```sql
SELECT COUNT(*) AS feedback_count
FROM "MatchFeedback"
WHERE "createdAt" >= NOW() - INTERVAL '7 days';
```

#### Distinct candidates (any feedback)

```sql
SELECT COUNT(DISTINCT "matchProfileId") AS distinct_candidates
FROM "MatchFeedback"
WHERE "createdAt" >= NOW() - INTERVAL '7 days';
```

#### Volume and sentiment split

```sql
SELECT sentiment, COUNT(*) AS cnt
FROM "MatchFeedback"
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY sentiment;
```

#### Positive rate

```sql
SELECT
  COUNT(*) FILTER (WHERE sentiment = 'POSITIVE')::float
  / NULLIF(COUNT(*), 0) AS positive_rate
FROM "MatchFeedback"
WHERE "createdAt" >= NOW() - INTERVAL '7 days';
```

#### Distinct reporters (adoption numerator)

```sql
SELECT COUNT(DISTINCT "userId") AS distinct_reporters
FROM "MatchFeedback"
WHERE "createdAt" >= NOW() - INTERVAL '7 days';
```

#### Top negative candidates

```sql
SELECT
  mf."matchProfileId",
  COUNT(*) AS negative_count,
  COUNT(DISTINCT mf."userId") AS distinct_viewers
FROM "MatchFeedback" mf
WHERE mf.sentiment = 'NEGATIVE'
  AND mf."createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY mf."matchProfileId"
ORDER BY negative_count DESC
LIMIT 20;
```

#### Actionable negatives (≥ 3 distinct reporters)

```sql
SELECT
  "matchProfileId",
  COUNT(DISTINCT "userId") AS distinct_negative_reporters
FROM "MatchFeedback"
WHERE sentiment = 'NEGATIVE'
  AND "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY "matchProfileId"
HAVING COUNT(DISTINCT "userId") >= 3
ORDER BY distinct_negative_reporters DESC;
```

#### Week-over-week positive rate

```sql
SELECT
  COUNT(*) FILTER (WHERE sentiment = 'POSITIVE' AND "createdAt" >= NOW() - INTERVAL '7 days')::float
  / NULLIF(COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days'), 0) AS positive_rate_current,
  COUNT(*) FILTER (WHERE sentiment = 'POSITIVE' AND "createdAt" >= NOW() - INTERVAL '14 days' AND "createdAt" < NOW() - INTERVAL '7 days')::float
  / NULLIF(COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '14 days' AND "createdAt" < NOW() - INTERVAL '7 days'), 0) AS positive_rate_prior;
```

### 30-day window

Use the same queries with `INTERVAL '30 days'` instead of `7 days`. For month-over-month compare, use two windows (e.g. last 30d vs prior 30d) mirroring the week-over-week query above.

---

## CloudWatch Insights (production)

### Sentiment split

```sql
fields @timestamp, event, userId, properties.sentiment
| filter logKind = "product_analytics" and event = "match.feedback"
| filter @timestamp > ago(7d)
| stats count() as feedback_count by properties.sentiment
```

### Adoption % — distinct users (7 days)

```sql
fields @timestamp, event, userId
| filter logKind = "product_analytics"
| filter event in ["match.list_viewed", "match.feedback"]
| filter @timestamp > ago(7d)
| stats count_distinct(userId) as users by event
```

**Manual calc:** `adoption_pct = users(match.feedback) / users(match.list_viewed) * 100`

Example: 12 feedback users ÷ 80 list-view users = **15%**.

### Funnel event volume (sanity check)

```sql
fields @timestamp, event, userId
| filter logKind = "product_analytics" and event in ["match.list_viewed", "match.feedback"]
| filter @timestamp > ago(7d)
| stats count() by event
```

---

## Local dev

Tail live:

```powershell
Get-Content dating-api/logs/dating-api.log -Wait | Select-String 'match.feedback'
```

One-shot grep for adoption inputs:

```powershell
# Feedback events
Select-String -Path dating-api/logs/dating-api.log -Pattern '"event":"match\.feedback"'

# List views (adoption denominator)
Select-String -Path dating-api/logs/dating-api.log -Pattern '"event":"match\.list_viewed"'
```

Count distinct `userId` values manually from JSON lines, or use CloudWatch in staging.

---

## Drill-down (admin UI + CLI)

**Admin UI (Story 4):** `/admin/match-quality` → **View audit** on a negative row → `/admin/match-quality/{profileId}`.

**CLI** (fallback when audit unavailable in UI):


```powershell
cd dating-api
npx ts-node --project tsconfig.json scripts/match-quality-audit.ts `
  --viewer-user-id <userId-from-negative-row> `
  --candidate-profile-id <matchProfileId>
```

Review JSON with [match-quality-audit-manual-review.md](../match-quality-audit-manual-review.md).

---

## When to escalate to engineering

| Signal | Action |
|--------|--------|
| Adoption &lt; 10% for 2+ weeks | UX review (copy, placement on match detail) |
| Positive rate &lt; 50% with adoption ≥ 15% | Schedule engine review (Story 5) |
| Same `matchProfileId` in top negatives + open reports | Ops: photos + reports triage |
| Positive rate drops &gt; 10 pts week-over-week after deploy | Rollback candidate; [compare API](#post-deploy-validation-story-6) |
| Adoption unmeasurable (no `match.list_viewed` in logs) | Verify `PRODUCT_ANALYTICS_ENABLED`, log shipping, `STRUCTURED_LOG_FILE` |

---

## Engine approval (summary)

Full checklist: [ENGINE_CHANGE_APPROVAL.md](../engine/ENGINE_CHANGE_APPROVAL.md) · [STORY_05](../sprints/sprint-11-match-quality-intelligence/STORY_05_engine_review_approval_workflow.md).

**Rule:** No matcher/scoring deploy without documented baseline KPIs + PM + engineering sign-off.

**Export (baseline bundle):**

```bash
curl -b "dating_session=$SESSION" \
  "$API/api/v1/admin/match-quality/export?windowDays=7&format=csv" \
  -o match-quality-export-7d.csv
```

Paste adoption % from CloudWatch § above into the approval doc (not included in export).

---

## Post-deploy validation (Story 6)

After a matcher/scoring deploy (with Story 5 sign-off complete):

1. **Wait** — ≥ **7 days** after deploy **or** ≥ **30** feedback rows in the after window (whichever is later; N=30 is the ops default).
2. **Compare** — disjoint before/after windows:
   - Shorthand (deploy ≈ boundary `now-7d`): `GET .../compare?beforeDays=7&afterDays=7`
   - ISO (deploy-aligned): four ISO bounds bracketing deploy timestamp
3. **Adoption** — verify stable from logs (≥15% proxy); rollback rule requires stable adoption.
4. **Rollback trigger** — `positiveRateDelta < -0.10` (10 percentage points on 0–1 scale) with stable adoption → revert + fill approval §6 **Revert**.
5. **Record** — paste compare JSON into [ENGINE_CHANGE_APPROVAL.md](../engine/ENGINE_CHANGE_APPROVAL.md) §6 or `docs/engine/approvals/`.

**CLI (same logic as API):**

```bash
cd dating-api
npm run match-quality:compare -- --before-days 7 --after-days 7
```

---

## Admin API (Story 2)

Auth: session cookie + `ADMIN_USER_IDS` (same as `/api/v1/admin/reports`). Non-admin → **403** `admin_forbidden`.

### `GET /api/v1/admin/match-quality/summary`

| Query | Default | Range |
|-------|---------|-------|
| `windowDays` | `7` | 1–90 |

**Response** — Postgres-backed metrics aligned with §1 in this doc:

| Field | Meaning |
|-------|---------|
| `windowDays` | Echo of query param |
| `windowStart` | ISO timestamp — lower bound (`createdAt >= windowStart`) |
| `feedbackCount` | All feedback rows in window |
| `positiveCount` | `sentiment = POSITIVE` |
| `negativeCount` | `sentiment = NEGATIVE` |
| `positiveRate` | `positiveCount / feedbackCount` (0–1), or `null` when `feedbackCount === 0` |
| `distinctReporters` | Distinct `userId` |
| `distinctCandidates` | Distinct `matchProfileId` (any sentiment) |

**Not in v1:** `adoptionRate` (logs only — see CloudWatch §).

### `GET /api/v1/admin/match-quality/negative-candidates`

| Query | Default | Range |
|-------|---------|-------|
| `windowDays` | `7` | 1–90 |
| `limit` | `20` | 1–100 |
| `offset` | `0` | 0–500 |

**Response:** `{ windowDays, items[], total, limit, offset }` where each item has `matchProfileId`, `negativeCount`, `distinctViewers`, `lastNegativeAt` (ISO). Sorted by `negativeCount` DESC, then `matchProfileId` ASC. IDs only — no profile text.

**Dev smoke:**

```bash
curl -b "dating_session=..." "$API/api/v1/admin/match-quality/summary?windowDays=7"
curl -b "dating_session=..." "$API/api/v1/admin/match-quality/negative-candidates?windowDays=7&limit=20&offset=0"
```

### `GET /api/v1/admin/match-quality/candidates/:profileId/audit`

| Query | Default | Notes |
|-------|---------|-------|
| `windowDays` | `7` | 1–90 — `feedbackSummary` window |
| `viewerUserId` | auto | Optional; else newest negative reporters (up to 3) |

**Response:** `feedbackSummary` + nested `MatchQualityAuditReport` (same shape as CLI) or `audit: null` + `auditUnavailable`.

**UI:** `/admin/match-quality/{profileId}` (Story 4).

### `GET /api/v1/admin/match-quality/export`

| Query | Default | Range |
|-------|---------|-------|
| `windowDays` | `7` | 1–90 |
| `format` | `json` | `json` \| `csv` |

**JSON response:** `exportedAt`, `windowStart`, `summary` (Postgres metrics), `negativeCandidates` (top 20), `notes.adoptionSource: logs_only`.

**CSV:** `# key,value` summary comment rows + negatives table; `Content-Disposition` attachment.

**Dev smoke:**

```bash
curl -b "dating_session=..." "$API/api/v1/admin/match-quality/export?windowDays=7&format=json"
curl -b "dating_session=..." "$API/api/v1/admin/match-quality/export?windowDays=7&format=csv" -o export.csv
```

### `GET /api/v1/admin/match-quality/compare`

| Query (shorthand) | Query (ISO) | Notes |
|-------------------|-------------|-------|
| `beforeDays`, `afterDays` (1–90 each) | `beforeStart`, `beforeEnd`, `afterStart`, `afterEnd` | Mutually exclusive modes |

**Intervals:** `[start, end)` — inclusive start, exclusive end. Windows must be disjoint (`beforeEnd <= afterStart`).

**Response:** `comparedAt`, `before`/`after` period summaries, `deltas.positiveRateDelta`, `deltas.feedbackCountDelta`, `notes.adoptionComparison: logs_only`.

**Dev smoke:**

```bash
curl -b "dating_session=..." "$API/api/v1/admin/match-quality/compare?beforeDays=7&afterDays=7"
curl -b "dating_session=..." "$API/api/v1/admin/match-quality/compare?beforeStart=2026-05-20T00:00:00.000Z&beforeEnd=2026-05-27T00:00:00.000Z&afterStart=2026-05-27T00:00:00.000Z&afterEnd=2026-06-03T00:00:00.000Z"
```

---

## Related docs

- [PRODUCT_FUNNEL.md](./PRODUCT_FUNNEL.md) — `match.feedback`, `match.list_viewed`
- [MATCH_ENGINE_V1_CONTRACT.md](../MATCH_ENGINE_V1_CONTRACT.md) — scoring guards
- `dating-api/src/me-profile/match-quality-audit.ts` — per-pair audit JSON
