# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [STORY_04_mark_read.md](../../STORY_04_mark_read.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-06-01  
**Status:** complete  

---

## Summary

- **Migration** `20260601100000_add_mutual_match_read_tracking` — `user1LastReadAt`, `user2LastReadAt` on `MutualMatch`.
- **API** `PUT /api/v1/me/conversations/:id/read` → 200 `{ lastReadAt }`; `getById` returns session user `lastReadAt`.
- **`countUnreadForParticipant()`** implemented for Story 5; `list().unreadCount` still **0**.
- **UI** `markConversationAsRead()` on detail mount (after shell load) + visibility with **5s debounce**; errors silent.
- **`assertActiveConversationParticipant`** extended to select/return read columns (used by mark, getById, count).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | `user1LastReadAt`, `user2LastReadAt` |
| `dating-api/prisma/migrations/20260601100000_add_mutual_match_read_tracking/migration.sql` | created |
| `dating-api/src/me-profile/me-conversations.service.ts` | `markAsRead`, `countUnreadForParticipant`, `getById` lastReadAt, assert read fields |
| `dating-api/src/me-profile/me-profile.controller.ts` | `PUT conversations/:id/read` |
| `dating-api/src/logging/error-codes.ts` | `ME_CONVERSATIONS_MARK_READ_OK` |
| `dating-api/src/me-profile/me-conversations.service.spec.ts` | mock rows include read columns |
| `dating-ui/src/lib/conversations-api.ts` | types + `markConversationAsRead()` |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | mark-read effects |

---

## Decisions (do not reverse without discussion)

- Followed architect: columns on `MutualMatch`, 200 response, 5s visibility debounce, silent UI errors.
- `assert` returns explicit object (no `status` leak).
- Reset `lastMarkReadAtRef` when `id` changes.

---

## Tests / verification

- [x] `npm run build` (dating-api) — pass
- [x] `npx jest me-conversations.service.spec.ts me-conversation-messages.service.spec.ts` — 34/34 pass
- [x] `npm run build` (dating-ui) — pass
- [x] `npx vitest run page.spec.tsx` — existing tests pass (no Story 4 mark-read tests yet — agent 2)
- [ ] `npx prisma migrate dev` — **not run** (apply migration locally before manual smoke)
- [ ] `npx prisma generate` — EPERM if API process locks query engine (stop API, re-run)
- [ ] Manual smoke — pending user

---

## Migration / local dev

```powershell
cd dating-api
# Stop running API if prisma generate fails with EPERM
npx prisma migrate dev
# or: npx prisma db push
npx prisma generate
npm run start:dev
```

---

## Manual smoke (happy path)

1. Apply migration.  
2. User A sends messages to User B.  
3. User B opens `/dating/conversations/:id` — network shows `PUT .../read` after GET detail.  
4. DB: `user2LastReadAt` (or `user1` depending on pair order) ≈ now.  
5. `GET .../conversations/:id` → `lastReadAt` non-null for B.  
6. Hide tab, wait 6s, show tab — second `PUT` (debounce allows).  
7. List still shows `unreadCount: 0` placeholder until Story 5.

---

## Deferred / follow-up

| Item | Owner |
|------|--------|
| Unit/integration/UI tests per architect plan | Agent 2 |
| `list().unreadCount` + badge | Story 5 |
| Mark read on poll while viewing | out of scope |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 3 story 4
```

**Notes for next agent:**

1. Add `markAsRead` / `countUnreadForParticipant` unit tests.  
2. Integration block `Sprint 3 Story 4: PUT .../read` (3 messages → read → count 0).  
3. UI tests: mount + visibility + debounce + silent failure.  
4. Update integration mocks for `MutualMatch` seed if migration columns required.
