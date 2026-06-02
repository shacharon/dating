# Handoff: Agent 1 — Senior dev — Story 1

**Agent:** 1 dev  
**Story:** [STORY_01_send_message.md](../../STORY_01_send_message.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- Added Prisma **`Message`** model + **`MessageStatus`** enum; migration `20260531160000_add_message_table`.
- **`POST /api/v1/me/conversations/:id/messages`** → **201** + `MessageDto` via **`MeConversationMessagesService.sendMessage()`**.
- **`MeConversationsService.assertActiveConversationParticipant()`** — shared ACTIVE participant gate; **`getById`** / **`unmatch`** refactored to use it.
- UI conversation detail: enabled composer, session-only message list (append after POST), Enter to send / Shift+Enter newline, char counter.
- **Out of scope (by design):** GET history (Story 2), polling (Story 3), rate limits (Story 6). Recipient does not see messages until Story 2.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | updated — `Message`, `MessageStatus`, relations |
| `dating-api/prisma/migrations/20260531160000_add_message_table/migration.sql` | created |
| `dating-api/src/me-profile/me-conversation-messages.dto.ts` | created |
| `dating-api/src/me-profile/me-conversation-messages.service.ts` | created |
| `dating-api/src/me-profile/me-conversations.service.ts` | updated — `assertActiveConversationParticipant`, refactor |
| `dating-api/src/me-profile/me-profile.controller.ts` | updated — `POST conversations/:id/messages` |
| `dating-api/src/me-profile/me-profile.module.ts` | updated — register messages service |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | updated — `prismaMock.message.create` |
| `dating-api/src/logging/error-codes.ts` | updated — `ME_CONVERSATIONS_MESSAGE_SEND_OK` |
| `dating-ui/src/lib/conversations-api.ts` | updated — `MessageDto`, `sendConversationMessage` |
| `dating-ui/src/app/dating/conversations/[id]/page.tsx` | updated — composer + message list |
| `dating-ui/src/app/dating/conversations/[id]/page.spec.tsx` | updated — empty state / enabled composer |

**Deferred to Agent 2:** `me-conversation-messages.service.spec.ts`, POST integration tests, send-flow UI tests per architect test plan.

---

## Decisions (do not reverse without discussion)

- Followed architect: trim in service; 400 on whitespace-only after DTO validation; **201** on success.
- Session-only UI message list until Story 2 (no GET on mount).
- All bubbles right-aligned in Story 1 (sender is always viewer).
- `prisma db push` used locally when `migrate dev` failed on shadow DB (P3006); committed SQL migration for other environments.

---

## How to run

```powershell
cd c:\dev\piza\dating\dating-api
# If DB not yet migrated:
npx prisma migrate deploy
# Or: npx prisma db push
npx prisma generate   # stop API first if EPERM on Windows
npm run start:dev

cd c:\dev\piza\dating\dating-ui
npm run dev
```

---

## Manual smoke (happy path)

1. User A ↔ User B mutual match (ACTIVE).
2. User A → **Conversations** → open User B.
3. **Expect:** "No messages yet. Say hi!", enabled textarea, **Send** button.
4. Type `Hello` → **Send** (or Enter).
5. **Expect:** bubble appears with `Hello`; input clears.
6. Refresh page → **messages gone** (session-only until Story 2).
7. User B same conversation → **no messages** (expected until Story 2).
8. Invalid id / unmatch → 404/403 unchanged from Sprint 2.

---

## Tests / verification

- [x] `npm run build` (dating-api) — pass
- [x] `npm run build` (dating-ui) — pass
- [x] `page.spec.tsx` (9 tests) — pass
- [x] `me-conversation-messages.service.spec.ts` — Agent 2
- [x] POST message integration tests — Agent 2

---

## Open questions / blockers

- **`prisma migrate dev`** fails locally with shadow DB error on `20260415000001_profile_submit_lifecycle` (pre-existing). Migration file committed; use `migrate deploy` or `db push` on dev DB.
- **`prisma generate`** may need API process stopped on Windows (EPERM on query engine DLL).

---

## Next agent

**Agent 2 (CR):** `--agent 2 sprint 3 story 1` — implement architect test plan (service unit, HTTP integration, UI send flow).
