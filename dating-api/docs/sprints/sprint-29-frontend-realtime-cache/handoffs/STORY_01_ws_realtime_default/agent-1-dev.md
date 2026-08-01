# Handoff: Agent 1 — Dev — Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_ws_realtime_default.md](../../STORY_01_ws_realtime_default.md)  
**Sprint:** sprint-29-frontend-realtime-cache  
**Date:** 2026-08-01  
**Status:** complete  
**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

`getRealtimeMode()` now defaults to **`ws`** when `NEXT_PUBLIC_REALTIME` is unset/empty; explicit `poll` still forces polling; `websocket` aliases `ws`; unknown values → `poll`. `.env.example` updated. No hook/API drive-bys. Agent 4 skipped.

---

## Lock parity checklist

| Lock item | Result |
|-----------|--------|
| Unset/empty → `ws` | Pass |
| `ws` / `websocket` → `ws` | Pass |
| `poll` → `poll` | Pass |
| Invalid → `poll` | Pass |
| No auto-fallback on WS fail | Pass (unchanged) |
| Specs + `.env.example` | Pass |

---

## Changes

| Path | Change |
|------|--------|
| `dating-ui/src/lib/realtime-mode.ts` | Default `ws` |
| `dating-ui/src/lib/realtime-mode.spec.ts` | §4 cases |
| `dating-ui/.env.example` | New default docs |

---

## Verification

- `npx vitest run src/lib/realtime-mode.spec.ts` — 6 passed

---

## Agent 2 notes

- Call sites still mock `getRealtimeMode`; no page-spec rewrites needed.
- Local `.env.local` without the flag will use WS after rebuild — API must be up.
