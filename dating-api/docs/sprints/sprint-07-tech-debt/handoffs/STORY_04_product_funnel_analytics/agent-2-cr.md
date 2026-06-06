# Handoff: Agent 2 — Code review — Story 4

**Agent:** 2 code-review  
**Story:** [STORY_04_product_funnel_analytics.md](../../STORY_04_product_funnel_analytics.md)  
**Sprint:** sprint-07-tech-debt  
**Date:** 2026-06-03  
**Status:** complete  
**Verdict:** approved (fixed)

---

## Summary

- Reviewed Agent 1 implementation against architect handoff — **matches spec** (structured log provider, 8 events, PII rules, Sentry separation, env gating).
- **Added tests** for provider JSON shape, WS auth-failure no-track, WS disconnect track, mutual-not-created guard, undo action.
- No security or logic defects requiring code changes beyond tests.
- Full suite **1309/1309** pass.

---

## Review findings

| Severity | Finding | Resolution |
|----------|---------|------------|
| Minor | No unit test for `StructuredLogAnalyticsProvider` line shape | **Fixed** — `structured-log-analytics.provider.spec.ts` |
| Minor | WS auth failure could regress into `ws_connected` analytics | **Fixed** — gateway spec asserts `track` not called |
| Minor | `match.mutual_created` idempotency not asserted in tests | **Fixed** — existing “already existed” test extended |
| Minor | Undo `match.action` not asserted | **Fixed** — deleteAction test |
| Minor | WS disconnect analytics not asserted | **Fixed** — disconnect test |
| Accepted | `match.list_viewed` fires on every ready list (refresh noise) | Per architect — funnel proxy |
| Accepted | `otherUserId` in mutual_created properties | Opaque cuid per PII policy |
| Accepted | No salt → deterministic conversation hash in dev | Documented; prod should set salt |
| Accepted | UI page-view / PostHog v2 | Deferred |

**PII audit (code paths):**

| Event | Payload check | OK |
|-------|---------------|-----|
| `message.sent` | `conversationIdHash` only; no `text` | ✅ |
| `conversation.opened` | hash only | ✅ |
| `match.action` | `action`, `candidateProfileId` | ✅ |
| `profile.submitted` | `profileId`, `priorStatus` | ✅ |
| WS events | `activeConnections` count only; no `sessionId` | ✅ |
| Provider line | `logKind: product_analytics`; no Sentry | ✅ |

**Logic verified:**

- `match.list_viewed` only on `status: 'ready'` return path.
- `profile.submitted` only after successful SUBMITTED update.
- `match.mutual_created` only when `detectResult.created === true` (×2 users).
- `match.action` after successful create; undo after successful delete (not on BLOCK/forbidden).
- WS connect analytics only after auth success; disconnect only when `data.userId` set.
- `AnalyticsService.track` swallows provider errors; respects `PRODUCT_ANALYTICS_ENABLED`.

---

## Acceptance criteria

| AC | Status |
|----|--------|
| Event schema (8 events) | ✅ |
| API emission on transitions | ✅ |
| UI emission | ⏭ deferred |
| Structured log provider, env-gated | ✅ |
| PII policy | ✅ |
| Sentry separation | ✅ |
| Unit test match action + mock provider | ✅ |
| Dashboard doc | ✅ `docs/analytics/PRODUCT_FUNNEL.md` |

---

## Artifacts (CR changes)

| Path | Change |
|------|--------|
| `structured-log-analytics.provider.spec.ts` | **New** — logKind + no message/text |
| `messaging.gateway.spec.ts` | auth fail + disconnect analytics assertions |
| `me-match-actions.service.spec.ts` | mutual idempotency + undo assertions |

---

## Tests / verification

| Command | Result |
|---------|--------|
| `npx jest src/analytics` | **8/8** pass |
| `npx jest me-match-actions.service.spec.ts` | pass |
| `npx jest messaging.gateway.spec.ts` | pass |
| `npm test` (dating-api) | **1309/1309** pass |

---

## Open questions / blockers

- None blocking Agent 3.

---

## Next agent

```text
--agent 3 sprint 7 story 4
```

**Notes for PM:**

- Mark Story 4 Done → closeout **12/12**; Sprint 7 engineering **4/4** complete.
- Operator smoke: grep `product_analytics` in logs after submit → like → message flow (story manual smoke).
