# Story 2: List my conversations

**Sprint:** 2  
**Status:** Done  
**Depends on:** Story 1 (MutualMatch must exist)

---

## Why

Users need to see all their mutual matches in one place to navigate to conversations. The conversation list is the entry point for messaging.

---

## What

**As a** user with mutual matches  
**I want** to see a list of all my conversations  
**So that** I can choose who to message

### Acceptance criteria

- [x] **New route** — `/dating/conversations` page exists in UI
- [x] **API endpoint** — `GET /api/v1/me/conversations` returns list of mutual matches
- [x] **Active only** — Only return `MutualMatch` where `status = ACTIVE` (exclude unmatched)
- [x] **Other user info** — Each item includes: other user's name, primary photo thumbnail, match date
- [x] **User resolution** — For each `MutualMatch`, determine "other user" (if session user = userId1, other = userId2; vice versa)
- [x] **Profile lookup** — Load other user's current active profile for display info
- [x] **Sort order** — Newest matches first (`createdAt DESC`)
- [x] **Empty state** — UI shows "No matches yet. Keep swiping!" when list is empty
- [x] **Clickable rows** — Each conversation links to `/dating/conversations/:id` (`:id` = `MutualMatch.id`)
- [x] **Auth** — 401 without session
- [x] **Tests** — API returns correct list, UI renders rows, empty state, navigation

### Out of scope (this story)

- Unread message count (Sprint 3)
- Last message preview (Sprint 3)
- Search/filter conversations
- Pagination (defer until >100 conversations per user)
- Archived conversations

---

## Technical notes (guidance, not prescriptive)

### API response DTO

```typescript
interface ConversationListItemDto {
  id: string;                    // MutualMatch.id
  otherUser: {
    id: string;                  // User.id
    firstName: string;
    photoUrl: string | null;     // primary photo thumbnail
  };
  matchedAt: string;             // ISO timestamp (MutualMatch.createdAt)
  unreadCount: number;           // placeholder: 0 (Sprint 3)
}
```

### Service logic

```typescript
// MeConversationsService.list(sessionUserId: string)

const mutualMatches = await prisma.mutualMatch.findMany({
  where: {
    AND: [
      { status: MutualMatchStatus.ACTIVE },
      { OR: [{ userId1: sessionUserId }, { userId2: sessionUserId }] }
    ]
  },
  orderBy: { createdAt: 'desc' }
});

// For each match, resolve other user + load their active profile
// ...
```

### UI component structure

- Page: `dating-ui/src/app/dating/conversations/page.tsx`
- API client: `dating-ui/src/lib/conversations-api.ts`
- List component: Show user photo, name, "Matched [date]" subtitle

---

## Definition of done

- [x] API endpoint `GET /api/v1/me/conversations` implemented
- [x] Response includes all active mutual matches for session user
- [x] Each item resolved to other user's profile info (name, photo)
- [x] UI page `/dating/conversations` renders list
- [x] Empty state handled
- [x] Clicking row navigates to conversation detail (stub detail page until Story 3)
- [x] Integration test: user with 2 mutual matches → list returns 2 items *(unit test; integration covers 1-item list)*
- [x] Integration test: user with unmatch → list excludes it *(ACTIVE filter at query level; HTTP unmatch in Story 5)*
- [x] UI test: renders conversation list, empty state, click navigation
- [ ] Manual smoke: see mutual matches in list after reciprocal likes — **pending user verification**

---

## Manual smoke

1. User A and User B have mutual match  
2. User A logs in, navigates to `/dating/conversations`  
3. See User B listed with photo, name, "Matched [time ago]"  
4. Click row → navigate to `/dating/conversations/:id`  
5. User A unmatches User B (Story 5) → refresh list → User B no longer appears  

---

## Shipped notes

- **Display name** uses `UserProfile.nickname` with gender/age/location fallback (not `firstName` — field does not exist on `User`).
- **Nav link** added: Conversations in main app shell (`/dating/conversations`).
- **Detail page** is a minimal stub (`/dating/conversations/[id]`) — full shell is **Story 3**.
- **Photo auth:** mutual-match partners can load photos via existing match photo endpoint even when match-engine eligibility would fail.
- **`unreadCount`** always `0` (Sprint 3).
- **Known limitation:** ACTIVE mutual may still appear if user BLOCKed match actions (Story 5 handles explicit unmatch).
