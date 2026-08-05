# Opener effectiveness — weekly report

**Sprint 42 Story 3.** Run via `OpenerTrackingService.getWeeklyReport()` or SQL below. No admin UI in v1.

## SQL (7-day window)

```sql
SELECT
  COUNT(*) AS generated,
  SUM(CASE WHEN displayed THEN 1 ELSE 0 END) AS displayed,
  SUM(CASE WHEN used THEN 1 ELSE 0 END) AS used,
  SUM(CASE WHEN sent THEN 1 ELSE 0 END) AS sent,
  SUM(CASE WHEN sent AND edited THEN 1 ELSE 0 END) AS edited,
  SUM(CASE WHEN "receivedReply" THEN 1 ELSE 0 END) AS replied,
  ROUND(AVG(CASE WHEN "receivedReply" THEN "responseTimeMin" END)::numeric, 1) AS avg_response_min
FROM "ConversationStarterCache"
WHERE "createdAt" >= NOW() - INTERVAL '7 days';
```

**Rates (compute in app / spreadsheet):**

- usageRate = used / displayed
- editRate = edited / sent
- sendRate = sent / used
- responseRate = replied / sent

## Decision thresholds (product)

| Metric | Kill | Caution | Success |
|--------|------|---------|---------|
| Usage rate | &lt;20% | 20–40% | &gt;40% |
| Send rate | &lt;60% | 60–80% | &gt;80% |
| Response rate | &lt;40% | 40–60% | &gt;60% |

Manual baseline lift (opener vs non-opener replies) is **ops-only** for v1 — not automated.

## Notes

- Rows are LLM-persisted openers only (fallback/null never stored).
- `displayed` / `used` come from best-effort `POST /me/matches/:id/opener-lifecycle`.
- `sent` / `edited` / `receivedReply` update on message send (attribution + reply via `sentMessageId`).
