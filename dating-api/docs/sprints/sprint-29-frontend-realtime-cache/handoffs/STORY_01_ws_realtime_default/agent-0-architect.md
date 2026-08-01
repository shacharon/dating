# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_ws_realtime_default.md](../../STORY_01_ws_realtime_default.md)  
**Sprint:** sprint-29-frontend-realtime-cache  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Flip product default realtime mode from `poll` → `ws`. Skip Agent 4 if unit specs cover default + overrides. No API changes. No auto-fallback poll on WS disconnect this story.

---

## Summary

[`getRealtimeMode`](../../../../../dating-ui/src/lib/realtime-mode.ts) returns `poll` when `NEXT_PUBLIC_REALTIME` is unset. That drives 3s `/messages?after=` polling on open threads (SCALE CR). Messaging WS + reconnect catch-up already exist; infra/docs already expect `ws` for AWS (`DEV_CONFIG_MANIFEST`, Sprint 20 CI). This story only changes the **code default** + docs.

---

## Current behavior (must preserve call sites)

| Consumer | Role |
|----------|------|
| `use-conversation-messages.ts` | Poll interval only when mode === `poll` |
| `messaging-shell-provider.tsx` | WS subscribe / unread when mode === `ws` |
| Conversation detail / list pages | Branch on mode |
| Specs | Mostly **mock** `getRealtimeMode` |

Reconnect catch-up and socket reconnect UX stay as-is in `ws` mode.

---

## Decisions (do not reverse without discussion)

### 1. Default = `ws` (locked)

```ts
export type RealtimeMode = 'ws' | 'poll';

/**
 * `ws` = socket.io push; `poll` = Sprint 3 interval.
 * Default `ws` when unset (Sprint 29). Set `NEXT_PUBLIC_REALTIME=poll` to force poll / emergency rollback.
 */
export function getRealtimeMode(): RealtimeMode {
  const raw = process.env.NEXT_PUBLIC_REALTIME?.trim().toLowerCase();
  if (raw === 'poll') {
    return 'poll';
  }
  if (raw === 'ws' || raw === 'websocket' || raw == null || raw === '') {
    return 'ws';
  }
  // Unknown non-empty value → poll (safe explicit rollback / typo escape hatch)
  return 'poll';
}
```

| Env value | Mode |
|-----------|------|
| unset / empty | **`ws`** |
| `ws` / `websocket` | **`ws`** |
| `poll` | **`poll`** |
| other (e.g. `foo`) | **`poll`** |

- Accept `websocket` as alias (prior invalid case that surprised people).
- Unknown → `poll` so a bad deploy string does not half-enable WS.

### 2. Runtime WS-fail → auto poll (locked OUT)

- **Out of scope.** Mode is build-time (`NEXT_PUBLIC_*`).  
- Existing reconnect / catch-up covers transient disconnects.  
- Emergency: rebuild/redeploy UI with `NEXT_PUBLIC_REALTIME=poll` (Sprint 5 pattern).

### 3. Docs / env (locked)

Update `dating-ui/.env.example`:

- Default is **`ws`** (unset = ws).
- Set `NEXT_PUBLIC_REALTIME=poll` for local poll-only / emergency.
- Remove “default: poll” / “set ws only after Sprint 5 gate” wording; keep note that flag is **build-time** (rebuild to flip).

No change required to AWS manifest (already `ws`).

### 4. Tests (locked)

Update `realtime-mode.spec.ts`:

1. unset → `ws`
2. empty string → `ws`
3. `ws` / `websocket` → `ws`
4. `poll` → `poll`
5. invalid (`foo`) → `poll`

Do **not** rewrite conversation page specs that mock mode unless they assert env defaulting (they mock today).

### 5. Agent 4

- **Skip** if §4 unit specs land.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/realtime-mode.ts` | Default `ws` + table above |
| `dating-ui/src/lib/realtime-mode.spec.ts` | Flip / expand cases |
| `dating-ui/.env.example` | Docs for new default |

---

## Out of scope

- Auto-fallback poll on socket error  
- TanStack Query (Story 3)  
- Conversations pagination (Story 2)  
- API / gateway changes  
- Changing poll interval constants  

---

## Agent 1 instructions

1. Implement `getRealtimeMode` per §1; update `.env.example` per §3.
2. Specs per §4; `npx vitest run src/lib/realtime-mode.spec.ts` (+ any broken mocks if env was assumed).
3. Commit; write `agent-1-dev.md`.

Suggested commit message:

```
feat(ui): default messaging realtime to WebSocket

Sprint 29 Story 1
```

---

## Agent 2 instructions

- [ ] Unset env → `ws` (no 3s poll on product path when unset)
- [ ] Explicit `poll` still works
- [ ] Invalid → `poll`; `websocket` → `ws`
- [ ] Reconnect catch-up path not removed/broken (no drive-by hook edits)
- [ ] `.env.example` matches lock
- Write `agent-2-cr.md`

---

## Agent 3 instructions

- Accept if CR PASS; mark story Done; update sprint README → next Story 2 Agent 0.
- Write `agent-3-pm.md`.

---

## Open risks

1. Local `.env.local` with no flag will start using WS — API must be up on `:3001` / socket origin (same as today when `ws` was set).  
2. Vitest may still see `NEXT_PUBLIC_REALTIME` from process env — specs must force unset/delete like today.
