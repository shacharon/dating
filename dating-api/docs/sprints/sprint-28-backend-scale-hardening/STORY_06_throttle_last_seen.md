# Story 06 — Throttle lastSeenAt

**Sprint 28 · Status: Done**  
**Priority:** P1  
**Estimated effort:** 0.5 day  
**Dependencies:** None (auth path)

**Handoffs:**  
[`agent-0-architect`](./handoffs/STORY_06_throttle_last_seen/agent-0-architect.md) ·  
[`agent-1-dev`](./handoffs/STORY_06_throttle_last_seen/agent-1-dev.md) ·  
[`agent-2-cr`](./handoffs/STORY_06_throttle_last_seen/agent-2-cr.md) ·  
[`agent-3-pm`](./handoffs/STORY_06_throttle_last_seen/agent-3-pm.md)

**Impl commit:** `c66d5f9` · **CR:** `694fef4`

---

## Objective

Stop writing `lastSeenAt` on every authenticated request; update only when older than a locked threshold (e.g. 5 minutes).

## Why

Auth guard currently does session lookup + `lastSeenAt` update + user lookup — chatty under every API call.

## Scope / tasks

1. Find auth/session `lastSeenAt` update path. ✅ (`SessionService.validateSessionToken`)
2. Architect locks: threshold (ms), whether Redis session cache is in or out this story (default: **throttle only**; Redis session cache = stretch / follow-up). ✅
3. Specs: first request updates; immediate second request skips write; after threshold updates again. ✅
4. Do not change session validity semantics. ✅

### Architect locks (do not reverse)

| Decision | Lock |
|----------|------|
| Threshold | **5 minutes** (`SESSION_LAST_SEEN_THROTTLE_MS = 300_000`) |
| Where | `validateSessionToken` only (JS gate on loaded row) |
| Skip when | `lastSeenAt != null` and age `<` threshold |
| Write when | `lastSeenAt` null **or** age ≥ threshold |
| Redis session cache | **Out of scope** this story |

## Acceptance criteria

- [x] `lastSeenAt` not updated on every request within the window
- [x] Still updates after threshold / first touch
- [x] Tests cover skip vs write
- [x] No login/session breakage

## Commit message

```
perf(auth): throttle lastSeenAt writes on the request path

Sprint 28 Story 6
```
