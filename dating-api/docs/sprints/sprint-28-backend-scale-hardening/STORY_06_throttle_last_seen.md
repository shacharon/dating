# Story 06 — Throttle lastSeenAt

**Sprint 28 · Status: PLANNED**  
**Priority:** P1  
**Estimated effort:** 0.5 day  
**Dependencies:** None (auth path)

---

## Objective

Stop writing `lastSeenAt` on every authenticated request; update only when older than a locked threshold (e.g. 5 minutes).

## Why

Auth guard currently does session lookup + `lastSeenAt` update + user lookup — chatty under every API call.

## Scope / tasks

1. Find auth/session `lastSeenAt` update path.
2. Architect locks: threshold (ms), whether Redis session cache is in or out this story (default: **throttle only**; Redis session cache = stretch / follow-up).
3. Specs: first request updates; immediate second request skips write; after threshold updates again.
4. Do not change session validity semantics.

## Acceptance criteria

- [ ] `lastSeenAt` not updated on every request within the window
- [ ] Still updates after threshold / first touch
- [ ] Tests cover skip vs write
- [ ] No login/session breakage

## Commit message

```
perf(auth): throttle lastSeenAt writes on the request path

Sprint 28 Story 6
```
