# Story 4: Mutual match notification

**Sprint:** 2  
**Status:** Done  
**Depends on:** Story 1 (mutual detection), Story 3 (conversation route)

---

## Why

Users need immediate positive feedback when they get a mutual match. This creates excitement and drives engagement.

---

## What

**As a** user who just liked someone who already liked me  
**I want** to see a "It's a match!" notification  
**So that** I know we can now message each other

### Acceptance criteria

- [x] **API flag** — `POST /api/v1/me/matches/:id/actions` response includes `mutualMatch: boolean` field
- [x] **True on mutual** — Flag is `true` when this LIKE action creates/confirms a mutual match
- [x] **UI modal/banner** — After successful LIKE, if `mutualMatch = true`, show celebration UI
- [x] **Match info** — Display: "It's a match!", other user's photo, name
- [x] **CTA button** — "Send a message" button links to `/dating/conversations/:conversationId`
- [x] **Dismissible** — User can close modal (X button or click outside)
- [x] **Persistent indicator** — Match detail page shows "You matched!" badge if already mutual
- [x] **Tests** — API returns flag, UI shows modal, navigation works

### Out of scope (this story)

- Push notifications
- Email notifications
- Sound effects / confetti animation (nice-to-have)
- "They liked you first" context

---

## Technical notes (guidance, not prescriptive)

### Updated API response DTO

```typescript
interface MatchActionDto {
  action: 'LIKE' | 'PASS' | 'BLOCK';
  createdAt: string;
  mutualMatch: boolean;          // NEW: true if mutual match exists/created
  conversationId?: string;       // NEW: MutualMatch.id if mutual
}
```

### Service logic

Use `MutualMatchesService.detectAndCreateMutualMatch` return value (ACTIVE only) — not `Math.min`/`Math.max` on user IDs. See `handoffs/STORY_04_match_notification/agent-0-architect.md`.

### UI flow

1. User clicks **Like**  
2. API returns `{ action: 'LIKE', mutualMatch: true, conversationId: 'xyz' }`  
3. Show modal: "It's a match!" + photo + "Send a message" button  
4. Button navigates to `/dating/conversations/xyz`  

---

## Definition of done

- [x] API response for POST LIKE includes `mutualMatch` and `conversationId` fields
- [x] UI detects `mutualMatch: true` and shows celebration modal
- [x] Modal displays other user's photo, name, "It's a match!" message
- [x] "Send a message" button navigates to conversation detail
- [x] Modal is dismissible (close button)
- [x] Match detail page shows badge if already mutual (check on page load)
- [x] Integration test: reciprocal likes → API returns `mutualMatch: true`
- [x] UI test: mock response with `mutualMatch: true` → modal appears
- [ ] Manual smoke: like someone who liked you → see celebration — **pending user verification**

---

## Manual smoke

1. User A likes User B  
2. User B likes User A  
3. User B sees "It's a match!" modal with User A's photo  
4. Click "Send a message" → navigate to `/dating/conversations/:id`  
5. Return to match detail page → see "You matched!" badge  

---

## Shipped notes

- **`MatchActionDto`** and **`MatchActionStateDto`** extended with `mutualMatch` + `conversationId` (no migration).
- POST LIKE captures `detectAndCreateMutualMatch` return inside transaction; GET actions uses `findActiveByUserPair` for badge on load.
- **`MatchCelebrationModal`** on `/dating/me-matches/[id]` when POST returns `mutualMatch: true` (typically second liker).
- **"You matched!"** emerald badge + optional **View conversation** link when GET returns mutual.
- First liker does **not** get modal retroactively — badge on revisit only (per architect).
- **21 automated tests** for Story 4 (13 unit service + 4 integration + 4 UI notification cases).

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Undo LIKE after mutual (stale badge) | Story 5 / follow-up |
| Modal for first liker (push/in-app) | Future epic |
| Unmatch | Story 5 |
| Actual messaging | Sprint 3 |
