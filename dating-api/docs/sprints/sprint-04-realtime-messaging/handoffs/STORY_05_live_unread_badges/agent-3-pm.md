# Handoff: Agent 3 — PM — Story 5

**Agent:** 3 pm  
**Story:** [STORY_05_live_unread_badges.md](../../STORY_05_live_unread_badges.md)  
**Sprint:** sprint-04-realtime-messaging  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Story 5 closed as Done** — live unread badges on `/dating/conversations` when `NEXT_PUBLIC_REALTIME=ws`.
- Full pipeline: architect → dev → code review → pm.
- **Sprint 4 progress: 5/6** — optional Story 6 (hardening / prod gate) remains.

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Live signal on list | Done | Reuses Story 2 `message.new` to `user:<id>` room |
| Badge increment + re-sort | Done | `conversation-list-unread.ts` + list handler |
| Open conversation excluded | Done | `conversation-focus.ts` + detail mount effect |
| Authoritative reconcile | Done | Existing mount + `visibilitychange` refetch |
| Flag = `poll` unchanged | Done | Socket only when `ws` |
| UI tests | Done | 27 tests across util, list page, hook (+ detail focus) |
| Manual browser smoke | Pending user | Story file steps |

---

## Acceptance criteria

**7 / 7** checked (manual smoke in checklist).

---

## Sprint 4 progress

| # | Story | Status |
|---|--------|--------|
| 1 | WebSocket gateway + auth | **Done** |
| 2 | Emit message.new on send | **Done** |
| 3 | UI subscribe on conversation route | **Done** |
| 4 | Reconnect + catch-up | **Done** |
| 5 | Live unread badges (opt) | **Done** |
| 6 | Hardening + prod gate (opt) | Not started |

---

## Artifacts

| Path | Change |
|------|--------|
| `STORY_05_live_unread_badges.md` | Status Done, AC/DoD, shipped notes |
| `README.md` (sprint-04) | 5/6, live unread shipped, current → Story 6 |
| `EPIC_MUTUAL_MATCH_MESSAGING.md` | Sprint 4 in progress (5/6) |

---

## Decisions (do not reverse without discussion)

- No new server event — client listens to `message.new` on the list.
- Optimistic increment reconciled by REST list fetch (not merged).
- Two sockets (list + detail) acceptable until Story 6 consolidation.

---

## Tests / verification

- [x] `conversation-list-unread.spec` — 3/3
- [x] `conversations/page.spec` — 13/13 (ws live unread block)
- [x] `use-messaging-socket.spec` — 11/11
- [x] Detail focus — `setActiveConversationId` on mount/unmount
- [ ] Manual smoke Story 5 — pending user
- [ ] Enable `NEXT_PUBLIC_REALTIME=ws` in prod when ready (Story 6 gate)

---

## Open questions / blockers

- None blocking Story 6 kickoff.

---

## Next work

```text
--agent 0 sprint 4 story 6
```

Or run manual smoke for Stories 1–5 with `NEXT_PUBLIC_REALTIME=ws` before prod hardening.
