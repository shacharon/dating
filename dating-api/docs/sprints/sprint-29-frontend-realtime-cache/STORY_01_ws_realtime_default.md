# Story 01 — WS realtime default

**Sprint 29 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 0.5–1 day  
**Dependencies:** Messaging WS already exists (Sprint 4+)

**Handoffs:**  
[`agent-0-architect`](./handoffs/STORY_01_ws_realtime_default/agent-0-architect.md) ·  
[`agent-1-dev`](./handoffs/STORY_01_ws_realtime_default/agent-1-dev.md) ·  
[`agent-2-cr`](./handoffs/STORY_01_ws_realtime_default/agent-2-cr.md) ·  
[`agent-3-pm`](./handoffs/STORY_01_ws_realtime_default/agent-3-pm.md)

**Impl commit:** `d1453ef` · **CR:** `dfd5df2`

---

## Objective

Make WebSocket the **default** realtime mode for product messaging so open threads stop 3s-polling `/messages?after=` when unset.

## Why

[`SCALE_READINESS_CR`](../../SCALE_READINESS_CR.md): `NEXT_PUBLIC_REALTIME` unset → poll every 3s per open conversation.

## Scope / tasks

1. Find `getRealtimeMode` / `NEXT_PUBLIC_REALTIME` usage in `dating-ui`. ✅
2. Architect locks: default `ws` vs env-only; poll fallback when WS fails; local/dev override. ✅
3. Specs: default mode; explicit `poll` still works; no behavior break for reconnect catch-up. ✅
4. Document env in UI `.env.example` if present. ✅

### Architect locks (do not reverse)

| Decision | Lock |
|----------|------|
| Unset / empty | **`ws`** |
| `ws` / `websocket` | **`ws`** |
| `poll` | **`poll`** (emergency / tests) |
| Other non-empty | **`poll`** |
| Auto-fallback poll on WS fail | **Out of scope** (rebuild with `poll`) |

## Acceptance criteria

- [x] Default product path uses WS (not 3s poll) when env unset or explicitly defaulted
- [x] Poll mode still selectable for tests / emergency
- [x] Specs cover default + poll override
- [x] No silent loss of message catch-up on reconnect

## Commit message

```
feat(ui): default messaging realtime to WebSocket

Sprint 29 Story 1
```
