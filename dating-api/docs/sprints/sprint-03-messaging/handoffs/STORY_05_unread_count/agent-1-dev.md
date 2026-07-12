# Handoff: Agent 1 — Dev — Story 5

**Agent:** 1 dev  
**Story:** [STORY_05_unread_count.md](../../STORY_05_unread_count.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-06-02  
**Status:** complete  

---

## Summary

- **`GET /api/v1/me/conversations`** returns real **`unreadCount`** per row via `countUnreadForMatchRow()` (parallel `message.count` per ACTIVE mutual).
- **Refactor:** `unreadMessageCountWhere()` shared by list + `countUnreadForParticipant()`.
- **Sort:** unread-first, then `matchedAt` desc.
- **UI:** emerald unread badge (`conversation-unread-badge`), `99+` cap, updated header copy, **`visibilitychange`** refetch on list page.
- **No** nav total, list polling, or Prisma migration.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-conversations.service.ts` | `list()` unread + sort; `countUnreadForMatchRow`; `unreadMessageCountWhere` |
| `dating-api/src/me-profile/me-conversations.service.spec.ts` | list mocks: read columns + default `message.count` 0 |
| `dating-ui/src/app/dating/conversations/page.tsx` | badge, header, visibility refetch |

---

## Decisions (do not reverse without discussion)

- Followed architect: null `lastReadAt` = all peer messages unread; unread-first sort.
- `countUnreadForMatchRow` is **private**; public `countUnreadForParticipant` unchanged behavior.

---

## Tests / verification

- [x] `npm run build` (dating-api) — pass
- [x] `npx jest me-conversations.service.spec.ts` — 26/26 pass
- [x] `npm run build` (dating-ui) — pass
- [x] `npx vitest run page.spec.tsx` (conversations list) — existing tests pass
- [ ] Story 5-specific unit/integration/UI tests — Agent 2
- [ ] Manual smoke — pending user

---

## Manual smoke

1. User A sends 3 messages to User B (B never opened thread).  
2. User B opens `/dating/conversations` → badge **3** on A's row.  
3. B opens conversation → `PUT .../read`.  
4. B navigates back to list → badge gone.  
5. A sends another message → B refetches list (navigate away/back or switch tab) → badge **1**.

---

## Deferred / follow-up

| Item | Owner |
|------|--------|
| Story 5 automated tests (sort, badge, integration flow) | Agent 2 |
| Live badge while staying on list without navigation | future polling/WebSocket |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 3 story 5
```

**Notes for next agent:**

1. Add list unit tests: unread count 3/0, sort unread-first, count `where` uses `otherUserId`.
2. Integration block `Sprint 3 Story 5` on GET list + PUT read flow.
3. UI tests: badge render/hide, `aria-label`, visibility refetch.
