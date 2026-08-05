# Beta metrics cookbook

Primary KPIs also appear on **`/admin/beta-metrics`** (Postgres). Use this doc for SQL spot-checks and CloudWatch funnel volume.

Definitions match Sprint 43 Story 4 architect lock.

---

## Postgres (psql / Prisma Studio)

Replace timestamps as needed. Soft-deleted users: `deletedAt IS NULL`.

### Active users (7d)

```sql
SELECT COUNT(*) AS active_7d
FROM "User"
WHERE "deletedAt" IS NULL
  AND "lastLoginAt" >= NOW() - INTERVAL '7 days';
```

### Sign-ups since beta start

```sql
SELECT COUNT(*) AS signups
FROM "User"
WHERE "deletedAt" IS NULL
  AND "createdAt" >= TIMESTAMP '2026-08-01'; -- set your betaStart
```

### D7 cohort (created 7–8 days ago; returned in last 24h)

```sql
WITH cohort AS (
  SELECT id, "lastLoginAt"
  FROM "User"
  WHERE "deletedAt" IS NULL
    AND "createdAt" >= NOW() - INTERVAL '8 days'
    AND "createdAt" <  NOW() - INTERVAL '7 days'
)
SELECT
  COUNT(*) AS cohort_size,
  COUNT(*) FILTER (
    WHERE "lastLoginAt" >= NOW() - INTERVAL '1 day'
  ) AS returned
FROM cohort;
```

### Opener usage / response (7d cache rows)

Prefer admin page (reuses `buildOpenerWeeklyReport`). Raw:

```sql
SELECT
  COUNT(*) FILTER (WHERE displayed) AS displayed,
  COUNT(*) FILTER (WHERE used) AS used,
  COUNT(*) FILTER (WHERE sent) AS sent,
  COUNT(*) FILTER (WHERE "receivedReply") AS replied
FROM "ConversationStarterCache"
WHERE "createdAt" >= NOW() - INTERVAL '7 days';
```

### HIGH browse share (non-blocked, scored)

HIGH ≥ 85, GOOD ≥ 70 (see `match-priority.ts`).

```sql
SELECT
  COUNT(*) FILTER (WHERE "matchScore" >= 85) AS high_n,
  COUNT(*) FILTER (WHERE "matchScore" >= 70 AND "matchScore" < 85) AS good_n,
  COUNT(*) FILTER (WHERE "matchScore" >= 0 AND "matchScore" < 70) AS other_n
FROM "MatchListRank"
WHERE "hardBlocked" = false
  AND "matchScore" >= 0;
```

### HIGH priority emails (7d)

```sql
SELECT COUNT(*) AS hp_emails_7d
FROM "HighPriorityMatchEmailLog"
WHERE "sentAt" >= NOW() - INTERVAL '7 days';
```

---

## CloudWatch Insights (secondary)

```sql
fields @timestamp, event, userId
| filter logKind = "product_analytics"
| filter @timestamp >= ago(7d)
| stats count_distinct(userId) by event
```

### Browse → message proxy (aspirational)

```sql
fields userId, event
| filter logKind = "product_analytics"
| filter event in ["match.list_viewed", "message.sent"]
| filter @timestamp >= ago(7d)
| stats count_distinct(userId) by event
```

Ratio of distinct `message.sent` users / distinct `match.list_viewed` users ≈ browse→message proxy. **Not** on the admin page (ambiguous joins).

---

## Related

- [PRODUCT_FUNNEL.md](../analytics/PRODUCT_FUNNEL.md)
- [MATCH_QUALITY_RUNBOOK.md](../analytics/MATCH_QUALITY_RUNBOOK.md)
- [BETA_DECISION_FRAMEWORK.md](./BETA_DECISION_FRAMEWORK.md)
