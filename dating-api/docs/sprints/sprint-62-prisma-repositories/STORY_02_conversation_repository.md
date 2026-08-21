# Story 02 — Conversation / Message Repository

**Sprint:** 62  
**Effort:** 2–3 days  
**Risk:** ⚠️ MEDIUM  
**Status:** Done

---

## Objective

Peel Prisma out of `MeConversationsService` and `MeConversationMessagesService` into a conversation/message repository port.

---

## Hot call sites

| Service | Path |
|---------|------|
| Conversations | `me-profile/me-conversations.service.ts` |
| Messages | `me-profile/me-conversation-messages.service.ts` |

Typical models: `mutualMatch`, `message`, `userProfile` (for list DTOs).

Side effects (realtime, email, moderation, rate-limit) **stay in the application service** — repository = persistence only.

---

## Design sketch

```typescript
export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

export interface ConversationRepository {
  listForUser(userId: string, cursor?: string): Promise<ConversationListPage>;
  getByIdForUser(conversationId: string, userId: string): Promise<ConversationDetail | null>;
  markRead(...): Promise<void>;
  // ...
}

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');
// or one ConversationMessagingRepository if methods are few
```

Start with **one** port if the surface is small; split only if ISP suffers.

---

## Tasks

1. Inventory prisma calls in both services.
2. Implement Prisma adapter(s); migrate list/get/mark-read/send persist.
3. Leave moderation/email/realtime in messages service (already multi-concern; Sprint 61 helps tests).
4. Specs: conversations + conversation-messages.

---

## Success

- [x] Conversations + messages services inject repository, not `PrismaService`
- [x] Send-message path behavior unchanged
- [x] Tests green

---

## Follow-up

Story 03 — Violations + reports.

---

## Shipped

`feature/sprint-62-story-2` @ `57f56b2` (close commit follows)

- `b4d03d5` — feat: conversation repository CONVERSATION_REPOSITORY
- `57f56b2` — test: guard conversation repository wiring

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agent 4 N/A)
