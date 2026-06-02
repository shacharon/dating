# Handoff: Agent 2 — Code review — Story 5

**Agent:** 2 code-review  
**Story:** [STORY_05_unread_count.md](../../STORY_05_unread_count.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-06-02  
**Status:** complete  
**Verdict:** approved  

---

## Summary

- Reviewed Agent 1 implementation — **no code changes required**.
- Added **4** unit tests (`list() unreadCount`), **3** integration tests (Story 5 block), **4** UI tests (list page 3 → 7).
- Confirmed shared `unreadMessageCountWhere` keeps list and `countUnreadForParticipant` aligned.
- Story 2 list integration mock updated with read columns + `message.count`.

---

## Review notes

| Area | Finding |
|------|---------|
| Count semantics | Matches Story 4: peer-only, `SENT`, null lastRead = all unread |
| Sort | Unread-first then `matchedAt` desc — correct |
| N+1 | Parallel counts per row — acceptable per architect |
| UI | Badge hidden at 0; `99+` cap; visibility refetch |
| Minor | None blocking |

---

## Tests added

### Unit — `me-conversations.service.spec.ts` (+4 → **30** total)

- `unreadCount: 3` when lastRead null
- `unreadCount: 0` with `createdAt: { gt: lastReadAt }`
- `senderId` = other user only
- Sort: unread row before newer read row

### Integration — `me-profile-http.integration.spec.ts`

Block: **`Sprint 3 Story 5: GET /api/v1/me/conversations unreadCount`**

- List `unreadCount: 3` + count `where` uses candidate as sender
- Flow: list 3 → PUT read → list 0
- Sort: unread conversation before read conversation

Also fixed Story 2 list test mock: `user1LastReadAt` / `user2LastReadAt` + `message.count` → 0.

### UI — `page.spec.tsx` (+4 → **7** total)

- Badge renders `3`
- No badge at `unreadCount: 0`
- `aria-label` for single unread
- `visibilitychange` triggers second `fetchMyConversations`

---

## Tests / verification

```text
cd dating-api
npx jest me-conversations.service.spec.ts --no-cache
# 30 passed

npx jest me-profile-http.integration.spec.ts -t "Sprint 3 Story 5" --no-cache
# 3 passed

cd ../dating-ui
npx vitest run "src/app/dating/conversations/page.spec.tsx"
# 7 passed
```

- [x] Unit: **30/30** pass
- [x] Integration (Story 5): **3/3** pass
- [x] UI: **7/7** pass

---

## Artifacts

| Path | Change |
|------|--------|
| `me-conversations.service.spec.ts` | +4 list unread tests |
| `me-profile-http.integration.spec.ts` | Story 5 block; Story 2 list mock fix |
| `page.spec.tsx` | +4 badge/refetch tests |

---

## Decisions (do not reverse without discussion)

- Integration flow test uses stateful `user2LastReadAt` mock (same pattern as Story 4).
- Optional AC sort covered in unit + integration tests.

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 3 sprint 3 story 5
```
