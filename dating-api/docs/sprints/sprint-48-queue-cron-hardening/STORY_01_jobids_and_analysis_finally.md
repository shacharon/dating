# Story 01 — Stable jobIds + analysis finally fix

**Sprint 48 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 1.5 days  
**Dependencies:** None  
**Repo:** `dating-api`  
**Risk:** Medium (worker behavior)

---

## Objective

1. Add stable Bull `jobId` coalesce for profile-analysis and photo-moderation (mirror match-list-rank `rebuild:{viewer}` pattern).
2. Stop profile-analysis worker `finally` from always invalidating cache + enqueueing rank rebuild when `runForUser` failed.

## Acceptance criteria

- [x] Duplicate enqueues for same user/photo coalesce
- [x] Failed analysis does not enqueue rebuild (or only on success / explicit Architect rule)
- [x] Specs cover coalesce + failure path
- [x] ErrorCodes / traces for skip vs run

## Definition of Done

- [x] Schema: N/A
- [x] API: N/A
- [x] UI: N/A
- [x] `analysis:{userId}` / `photo-mod:{photoId}` jobIds + Bull coalesce
- [x] Rank side effects only on analysis `success` (incl. already-ANALYZED retry recovery)
- [x] QUEUE_* ErrorCodes + obs traces
- [x] Specs green (Agent 2: 111 passed)
- [x] Agents 2.5 / 3.5 / 4: N/A
- [ ] Agent 5 post-deploy (after production)

## Commits

- `a942c12` — fix(workers): stable jobIds + skip rank rebuild on analysis failure
- `5091aa1` — test(workers): harden sprint 48 story 1 queue coalesce coverage

## Suggested commit

```
fix(workers): stable jobIds + skip rank rebuild on analysis failure

Sprint 48 Story 1
```
