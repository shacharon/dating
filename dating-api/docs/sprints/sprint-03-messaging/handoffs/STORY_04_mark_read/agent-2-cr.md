# Handoff: Agent 2 — Code review — Story 4

**Agent:** 2 code-review  
**Story:** [STORY_04_mark_read.md](../../STORY_04_mark_read.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-06-02  
**Status:** complete  
**Verdict:** approved  

---

## Summary

- Reviewed Agent 1 implementation against architect handoff — **no code changes required**.
- Added **26** unit tests (`me-conversations.service.spec.ts`, +9), **7** integration tests (Story 4 block), **4** UI tests (`page.spec.tsx`, 18 → 22).
- Security/auth: reuses `assertActiveConversationParticipant`; participant-only field update; no client timestamps.
- **`list().unreadCount`** still `0` — correct Story 5 boundary.

---

## Review notes

| Area | Finding |
|------|---------|
| Auth | PUT gated by `AuthGuard`; 404/403 order matches other conversation routes |
| Data | `userId1`/`userId2` field mapping correct (no min/max user id hack) |
| Idempotency | Repeated PUT advances `lastReadAt` — per spec |
| UI | Silent failures; mount + visibility debounce match architect |
| Minor | None blocking |

---

## Tests added

### Unit — `me-conversations.service.spec.ts`

- `markAsRead` — user1/user2 field, second call timestamps, 404 UNMATCHED, 403 stranger
- `countUnreadForParticipant` — null lastRead (all peer), after lastRead, sender filter
- `getById` — returns ISO `lastReadAt` when set

### Integration — `me-profile-http.integration.spec.ts`

Block: **`Sprint 3 Story 4: PUT .../conversations/:id/read`**

- 401, 200 + DB update, GET detail `lastReadAt`, count 3 → PUT → count 0, 403, 404 missing, 404 UNMATCHED

### UI — `page.spec.tsx`

- `markConversationAsRead` after shell load
- Visibility after 6s debounce (Date.now spy)
- Visibility within 5s skipped
- Mark-read failure silent (no banner)

---

## Tests / verification

```text
cd dating-api
npx jest me-conversations.service.spec.ts --no-cache
# 26 passed

npx jest me-profile-http.integration.spec.ts -t "Sprint 3 Story 4" --no-cache
# 7 passed

cd ../dating-ui
npx vitest run "src/app/dating/conversations/[id]/page.spec.tsx"
# 22 passed
```

- [x] Unit: **26/26** pass
- [x] Integration (Story 4 filter): **7/7** pass
- [x] UI: **22/22** pass

---

## Artifacts

| Path | Change |
|------|--------|
| `me-conversations.service.spec.ts` | +9 tests, `message.count` mock |
| `me-profile-http.integration.spec.ts` | Story 4 block, `message.count`, `MeConversationsService` import |
| `page.spec.tsx` | +4 mark-read tests, mock `markConversationAsRead` |

---

## Decisions (do not reverse without discussion)

- UI debounce tests use **Date.now spy** (not fake timers) to avoid breaking `waitFor` in suite.
- Integration unread proof uses **mocked `message.count`** (3 then 0) + stateful `mutualMatch` read columns — not full message seeding.

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 3 sprint 3 story 4
```
