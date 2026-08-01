# Story 01 — WS realtime default

**Sprint 29 · Status: PLANNED**  
**Priority:** P0  
**Estimated effort:** 0.5–1 day  
**Dependencies:** Messaging WS already exists (Sprint 4+)

---

## Objective

Make WebSocket the **default** realtime mode for product messaging so open threads stop 3s-polling `/messages?after=` when unset.

## Why

[`SCALE_READINESS_CR`](../../SCALE_READINESS_CR.md): `NEXT_PUBLIC_REALTIME` unset → poll every 3s per open conversation.

## Scope / tasks

1. Find `getRealtimeMode` / `NEXT_PUBLIC_REALTIME` usage in `dating-ui`.
2. Architect locks: default `ws` vs env-only; poll fallback when WS fails; local/dev override.
3. Specs: default mode; explicit `poll` still works; no behavior break for reconnect catch-up.
4. Document env in UI `.env.example` if present.

## Acceptance criteria

- [ ] Default product path uses WS (not 3s poll) when env unset or explicitly defaulted
- [ ] Poll mode still selectable for tests / emergency
- [ ] Specs cover default + poll override
- [ ] No silent loss of message catch-up on reconnect

## Commit message

```
feat(ui): default messaging realtime to WebSocket

Sprint 29 Story 1
```
