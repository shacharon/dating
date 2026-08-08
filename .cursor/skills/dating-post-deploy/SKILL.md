---
name: dating-post-deploy
description: >-
  Post-deployment verifier for dating app — error rates, latency, user feedback.
  Loaded by agent 5.
disable-model-invocation: true
---

# Dating App Post-deployment Verification (role)

Verify production health after story deploys. **Catch regressions early.**

## Checklist

### Error rate
Tools: Sentry, CloudWatch Logs, application logs

- [ ] Check last 24-72 hours for new exception types
- [ ] Compare error count before/after deploy (baseline period = 7 days prior)
- [ ] Flag if error rate increased >20%

**Example:**
```
Baseline (7 days before): 12 errors/day
Post-deploy (3 days): 35 errors/day (+192%) ⚠️

New exception: TypeError in MatchRankingService.buildFullRankedList
  - 18 occurrences
  - Affects 8 users
  - Root cause: null check missing on policy.evaluate() result
```

### Performance
Tools: CloudWatch, Datadog, APM (New Relic, etc.)

Check endpoints added/changed by this story:
- [ ] P50 latency (should be <200ms for most endpoints)
- [ ] P95 latency (should be <1000ms)
- [ ] P99 latency (should be <2000ms)
- [ ] Compare to baseline (7 days prior)
- [ ] Flag if P95 increased >50%

**Example:**
```
GET /api/v1/me/matches
  Before: P50=120ms, P95=380ms, P99=850ms
  After:  P50=125ms, P95=410ms, P99=920ms (+8-10%) ✅ acceptable
```

### User metrics
Tools: Mixpanel, Amplitude, Google Analytics

Check story-specific metrics (defined in Agent 0 handoff, or generic engagement):
- [ ] DAU (Daily Active Users) — did it drop?
- [ ] Feature adoption (e.g., % of users who clicked new button)
- [ ] Conversion rate (e.g., % of matches that message)
- [ ] Bounce rate (did users leave after seeing this change?)

**Example:**
```
Story: Add "Super Like" button
  - DAU: 1,250 → 1,240 (-0.8%) ✅ no significant drop
  - Super Like click rate: 12% of users (target: 10%) ✅
  - Match conversion: 35% → 34% (-1%) ⚠️ investigate if trend continues
```

### User feedback
Tools: Support tickets (Zendesk, Intercom), app store reviews, social media

- [ ] Search support tickets for keywords related to this story
- [ ] Check app store reviews (App Store, Google Play) for complaints
- [ ] Check Twitter, Reddit for user complaints

**Example:**
```
Support tickets: 3 mentions of "matches not loading" (related to this story?)
App store reviews: 2 new 1-star reviews mentioning "app is slower now"
→ Correlate with performance regression? Check if same users hit P99 latency spike
```

### Feature flag
If story is behind a feature flag:
- [ ] Verify flag is ON in production
- [ ] Check rollout percentage (e.g., 10% → 50% → 100%)
- [ ] Monitor for errors/performance as rollout increases

## Severity classification

| Severity | Criteria | Examples |
|----------|----------|----------|
| **P0** | Site down, data loss, critical security issue | 500 errors on login; all matches deleted; password leak |
| **P1** | Core flow broken for many users | Matches endpoint times out; messages not sending |
| **P2** | Degraded UX, minor bugs | Slow loading; UI glitch; error on edge case |
| **P3** | Polish, low-impact bugs | Typo; minor styling issue |

**P0/P1 = immediate rollback or hotfix.** P2/P3 = track for next sprint.

## Deliverables

Write `agent-5-postdeploy.md`:

```markdown
## Error rate
- Baseline: 12 errors/day
- Post-deploy: 11 errors/day (-8%) ✅
- New exceptions: None

## Performance
### GET /api/v1/me/matches
- P50: 120ms → 125ms (+4%) ✅
- P95: 380ms → 410ms (+8%) ✅
- P99: 850ms → 920ms (+8%) ✅

### POST /api/v1/me/matches/:id/actions
- P50: 45ms → 48ms (+7%) ✅
- P95: 120ms → 130ms (+8%) ✅

## User metrics
- DAU: 1,250 → 1,240 (-0.8%) ✅
- Feature adoption: N/A (backend refactor, no UX change)
- Conversion: 35% → 35% (unchanged) ✅

## User feedback
- Support tickets: 0 mentions
- App store reviews: No new negative reviews
- Social media: No complaints

## Feature flag
- N/A (no flag for this story)

## Issues found

### P0
- None

### P1
- None

### P2
1. P99 latency increased 8% on `/api/v1/me/matches`
   - **Impact:** Small percentage of users see slow load
   - **Root cause:** Policy abstraction adds 1 extra function call (negligible, but measurable at P99)
   - **Action:** Monitor; if increases further, optimize policy caching

### P3
- None

## Rollback needed: No

## Verdict: Verified | Needs-hotfix

**If Verified:** Story fully Done, close Agent 5 handoff
**If Needs-hotfix:** Create hotfix PR, rerun Agent 5 after deploy
```

## Do not
- Implement fixes yourself (create follow-up story or hotfix PR instead)
- Approve P0/P1 issues with "will fix next sprint"
