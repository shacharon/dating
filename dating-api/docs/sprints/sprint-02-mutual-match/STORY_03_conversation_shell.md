# Story 3: View conversation shell

**Sprint:** 2  
**Status:** Done  
**Depends on:** Story 2 (conversation list must exist)

---

## Why

Users need to access a specific conversation detail page where they'll eventually send messages. This story creates the shell without messaging functionality.

---

## What

**As a** user who clicked on a conversation  
**I want** to see details about the match  
**So that** I can prepare to message them (messaging in Sprint 3)

### Acceptance criteria

- [x] **New route** — `/dating/conversations/:id` page exists (`:id` = `MutualMatch.id`)
- [x] **API endpoint** — `GET /api/v1/me/conversations/:id` returns conversation metadata
- [x] **Access control** — Session user must be part of the mutual match (403 if not)
- [x] **Match info displayed** — Other user's photo, name, "Matched on [date]"
- [x] **Messaging placeholder** — UI shows "Messaging coming soon" or disabled input box
- [x] **404 handling** — If conversation doesn't exist or is unmatched → 404
- [x] **Back navigation** — Link/button to return to `/dating/conversations`
- [x] **Tests** — API returns conversation, UI renders shell, 403/404 cases

### Out of scope (this story)

- Message history (Sprint 3)
- Send message functionality (Sprint 3)
- Typing indicators
- Unread status

---

## Technical notes (guidance, not prescriptive)

### API response DTO

```typescript
interface ConversationDetailDto {
  id: string;                    // MutualMatch.id
  otherUser: {
    id: string;                  // User.id
    firstName: string;
    photoUrl: string | null;
    bio?: string;                // optional: show profile bio
  };
  matchedAt: string;             // ISO timestamp
  status: 'ACTIVE' | 'UNMATCHED';
  lastReadAt?: string;           // placeholder null (Sprint 3)
}
```

### Service logic

```typescript
// MeConversationsService.getById(sessionUserId: string, conversationId: string)

const match = await prisma.mutualMatch.findUnique({
  where: { id: conversationId }
});

if (!match) throw new NotFoundException('Conversation not found');
if (match.status === MutualMatchStatus.UNMATCHED) throw new NotFoundException('Conversation not found');

// Verify session user is part of this mutual match
if (match.userId1 !== sessionUserId && match.userId2 !== sessionUserId) {
  throw new ForbiddenException('Access denied');
}

// Resolve other user...
```

### UI component structure

- Page: `dating-ui/src/app/dating/conversations/[id]/page.tsx`
- Layout: Top section = match card (photo, name, date), bottom = placeholder

---

## Definition of done

- [x] API endpoint `GET /api/v1/me/conversations/:id` implemented
- [x] Verify session user is participant (403 otherwise)
- [x] Return conversation metadata with other user info
- [x] UI page `/dating/conversations/[id]` renders match card
- [x] Placeholder for messaging ("Coming soon" or disabled input)
- [x] Back button to conversation list
- [x] Integration test: GET conversation → returns data
- [x] Integration test: user not part of conversation → 403
- [x] Integration test: unmatched conversation → 404
- [x] UI test: renders conversation shell, match info, back button
- [ ] Manual smoke: click conversation from list → see match card — **pending user verification**

---

## Manual smoke

1. User A and User B have mutual match  
2. User A navigates to `/dating/conversations/:id`  
3. See User B's photo, name, "Matched on [date]"  
4. See placeholder: "Start messaging in Sprint 3!" (or similar)  
5. Click back → return to conversation list  
6. Try accessing User C's conversation (not matched) → 404  

---

## Shipped notes

- **Display name** uses `nickname` + meta fallback (same as Story 2 list); no raw bio/`firstName`.
- Detail subtitle uses **`formatMatchedOnDate`** ("Matched on May 31, 2026"); list still uses relative **`formatMatchedAt`**.
- **`lastReadAt: null`** and **`status: 'ACTIVE'`** on 200 only; UNMATCHED returns 404.
- Non-participant gets **403** (`conversation_forbidden`).
- Replaced Story 2 stub page with full shell (match card + disabled textarea).

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Message history + send | Sprint 3 |
| Read tracking / `lastReadAt` | Sprint 3 Story 4 |
| Evaluation summary on shell | Optional follow-up |
| Unmatch | Story 5 |
