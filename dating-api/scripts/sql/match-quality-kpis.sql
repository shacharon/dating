-- Match quality KPIs (Sprint 11 Story 1)
-- Usage: psql $DATABASE_URL -f scripts/sql/match-quality-kpis.sql
-- Default window: 7 days. Change INTERVAL for 30-day monthly review.

-- Feedback count (7d)
SELECT COUNT(*) AS feedback_count
FROM "MatchFeedback"
WHERE "createdAt" >= NOW() - INTERVAL '7 days';

-- Distinct candidates with any feedback (7d) — Story 2 distinctCandidates
SELECT COUNT(DISTINCT "matchProfileId") AS distinct_candidates
FROM "MatchFeedback"
WHERE "createdAt" >= NOW() - INTERVAL '7 days';

-- Volume and sentiment (7d)
SELECT sentiment, COUNT(*) AS cnt
FROM "MatchFeedback"
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY sentiment;

-- Positive rate (7d)
SELECT
  COUNT(*) FILTER (WHERE sentiment = 'POSITIVE')::float
  / NULLIF(COUNT(*), 0) AS positive_rate
FROM "MatchFeedback"
WHERE "createdAt" >= NOW() - INTERVAL '7 days';

-- Distinct reporters (7d) — adoption numerator; compare to match.list_viewed users in logs
SELECT COUNT(DISTINCT "userId") AS distinct_reporters
FROM "MatchFeedback"
WHERE "createdAt" >= NOW() - INTERVAL '7 days';

-- Top negative candidates (7d)
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

-- Actionable negatives: >= 3 distinct reporters (7d)
SELECT
  "matchProfileId",
  COUNT(DISTINCT "userId") AS distinct_negative_reporters
FROM "MatchFeedback"
WHERE sentiment = 'NEGATIVE'
  AND "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY "matchProfileId"
HAVING COUNT(DISTINCT "userId") >= 3
ORDER BY distinct_negative_reporters DESC;

-- Week-over-week positive rate
SELECT
  COUNT(*) FILTER (WHERE sentiment = 'POSITIVE' AND "createdAt" >= NOW() - INTERVAL '7 days')::float
  / NULLIF(COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days'), 0) AS positive_rate_current,
  COUNT(*) FILTER (WHERE sentiment = 'POSITIVE' AND "createdAt" >= NOW() - INTERVAL '14 days' AND "createdAt" < NOW() - INTERVAL '7 days')::float
  / NULLIF(COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '14 days' AND "createdAt" < NOW() - INTERVAL '7 days'), 0) AS positive_rate_prior;
