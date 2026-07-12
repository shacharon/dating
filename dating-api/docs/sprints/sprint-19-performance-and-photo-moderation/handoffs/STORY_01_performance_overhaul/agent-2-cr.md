# Handoff: Agent 2 — Code Review — Story 1

**Agent:** 2 code-review  
**Story:** [STORY_01_performance_overhaul.md](../../STORY_01_performance_overhaul.md)  
**Sprint:** sprint-19-performance-and-photo-moderation  
**Date:** 2026-07-12  
**Status:** complete  
**Verdict:** fixed  

---

## Summary

- Reviewed Agent 1 implementation against Agent 0 decisions (ranked cursor, Redis fail-open, Bull 202, signed CDN).
- **Fixed Major:** CloudFront signed URL used `URLSearchParams` which percent-encodes `~` in Signature → manual query assembly; strip scheme from CDN domain.
- **Fixed Major:** `list()` with missing/invalid `limit` could NaN-slice → clamp to default 20 / max 50.
- Updated broken unit/integration/UI specs for Redis cache DI, submit **202** + `{ analysisJobId, profile }`, IntersectionObserver, analysis status poll mock.
- Added tests: `match-list-cache.spec.ts`, `cdn-url.spec.ts`, me-matches pagination unit test.
- Matching E2E **Agent 4 required next** (pagination order / matches contract).

---

## Issues

| Severity | Issue | Resolution |
|----------|-------|------------|
| Major | CDN Signature `%7E` encoding via `URLSearchParams` | Manual query string in `cdn-url.ts` |
| Major | `query.limit` undefined → empty page | Clamp in `MeMatchesService.list` |
| Major | Specs broken by new ctors / 202 contract | Updated API + UI specs |
| Minor | Analysis poll initial 3s broke backoff expectation | Updated `analysis-progress-poll.spec.ts` |
| Minor | jsdom missing `IntersectionObserver` | Stub + guard in hook |

No Critical auth/data-leak issues found. Session guards unchanged on `/me/*`.

---

## Artifacts (this step)

| Path | Change |
|------|--------|
| `dating-api/src/photo-storage/cdn-url.ts` | Fixed signed URL encoding + domain normalize |
| `dating-api/src/photo-storage/cdn-url.spec.ts` | **New** |
| `dating-api/src/cache/match-list-cache.spec.ts` | **New** pagination/cursor tests |
| `dating-api/src/me-profile/me-matches.service.ts` | Safe limit clamp |
| `dating-api/src/me-profile/*.spec.ts` / e2e | 202 + Redis mocks + pagination test |
| `dating-ui/.../page.spec.tsx` / poll / infinite hook | Test fixes |

---

## Tests / verification

### Commands + results

```text
# API
npx jest --no-coverage src/cache/match-list-cache.spec.ts src/photo-storage/cdn-url.spec.ts src/me-profile/me-match-actions.service.spec.ts --runInBand
→ 3 suites, 22 passed

npx jest --no-coverage src/me-profile/me-matches.service.spec.ts src/me-profile/me-matches.v1-contract.spec.ts src/me-profile/me-profile.service.spec.ts --runInBand
→ 3 suites, 134 passed

npx jest --no-coverage src/me-profile/me-profile-http.integration.spec.ts -t "profile/submit" --runInBand
→ 7 passed (submit 202)

npx jest --no-coverage src/me-profile/me-new-model-e2e-eligibility.integration.spec.ts --runInBand
→ 5 passed

npx tsc --noEmit -p tsconfig.json
→ exit 0

# UI
npx vitest run analysis-progress-poll.spec.ts analysis/page.spec.tsx match-photo.spec.tsx me-matches/page.spec.tsx me-profile-api.spec.ts
→ 5 files, 56 passed
```

- [x] Unit/integration: pass (scoped Story 1 surface)
- [x] `prisma migrate deploy`: already applied in Agent 1
- [ ] Browser Network smoke: **deferred** (manual / Agent 3)
- [ ] Socket transport: **N/A**

---

## Runtime topology

- REST same-origin / cookie auth unchanged for relative photo URLs.
- CDN absolute signed URLs only when `PHOTO_CDN_ENABLED=1` (no session cookie).
- No realtime/socket changes in this story.

---

## E2E verification (Agent 4 required)

Story touches **matches list contract + ranked page stability**.

| Item | Note |
|------|------|
| Baseline specs | Eligibility suite green after 202 submit fix; Agent 4 must re-run full baseline set unmodified where possible |
| New scenarios | Page1+page2 concat == full ranked order; no dupes; cache hit path optional |
| Next | `--agent 4 sprint 19 story 1` |

**Do not treat this story as fully Done until Agent 4 passes.**

---

## Remaining / follow-ups

1. Manual browser smoke (infinite scroll Network, submit 202, status poll) — Agent 3.
2. Optional: assert `hasMore`/`nextCursor` in HTTP integration (unit coverage exists).
3. Bull exact 1m/5m/15m backoff still approximate (exponential 60s) — deferred.

---

## Next agent

```text
--agent 4 sprint 19 story 1
```

**Notes for next agent:**

- Ranked cursor pagination must preserve full-list order across pages.
- Submit is **202**; harness `submitProfile` does not assert status — e2e specs already expect 202.
- Deep E2E owns pagination + eligibility baselines; CR did not clear that gate.
