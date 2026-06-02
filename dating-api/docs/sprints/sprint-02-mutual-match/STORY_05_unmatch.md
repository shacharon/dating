# Story 5: Unmatch action

**Sprint:** 2  
**Status:** Done  
**Depends on:** Story 2 (conversation list), Story 3 (conversation detail)

---

## Why

Users need a way to end conversations they're no longer interested in. This gives control and keeps the conversation list relevant.

---

## What

**As a** user in a conversation  
**I want** to unmatch from the other person  
**So that** we both no longer see the conversation

### Acceptance criteria

- [x] **Unmatch button** — Available on conversation detail page (`/dating/conversations/:id`)
- [x] **Confirmation dialog** — "Unmatch [Name]? You'll no longer see their messages. This can't be undone."
- [x] **API endpoint** — `DELETE /api/v1/me/conversations/:id` soft-deletes the mutual match
- [x] **Soft delete** — Set `MutualMatch.status = UNMATCHED`, `unmatchedAt = now()`, `unmatchedByUserId = sessionUserId`
- [x] **Both sides hidden** — Conversation disappears from list for both users
- [x] **Access denied after** — Attempting to view unmatched conversation → 404
- [x] **Redirect** — After unmatch, redirect to `/dating/conversations`
- [x] **Idempotent** — Unmatching twice → second call is 404 (already unmatched)
- [x] **Auth** — 401 without session; 403 if user not part of conversation
- [x] **Tests** — API unmatch flow, UI confirmation + redirect, list exclusion

### Out of scope (this story)

- Re-matching (if they like each other again after unmatch)
- Reporting/blocking within conversation
- Preserving message history after unmatch (deferred moderation decision)
- Notification to other user

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_05_unmatch/agent-0-architect.md` for HTTP status order (404 before 403) and soft-delete contract.

### UI flow

1. User clicks **Unmatch** button on conversation detail  
2. Confirmation dialog appears  
3. User confirms → `DELETE /api/v1/me/conversations/:id`  
4. Success → redirect to `/dating/conversations`  
5. Conversation no longer appears in list  

---

## Definition of done

- [x] API endpoint `DELETE /api/v1/me/conversations/:id` implemented
- [x] Soft delete: update `status`, `unmatchedAt`, `unmatchedByUserId`
- [x] Unmatch removes conversation from list for both users
- [x] 404 when accessing unmatched conversation
- [x] UI: Unmatch button with confirmation dialog
- [x] Redirect to conversation list after unmatch
- [x] Integration test: unmatch → status updated, list excludes it
- [x] Integration test: unmatch twice → second returns 404
- [x] UI test: click unmatch → confirmation → redirect
- [ ] Manual smoke: unmatch → conversation disappears, detail 404 — **pending user verification**

---

## Manual smoke

1. User A and User B have mutual match with conversation  
2. User A opens `/dating/conversations/:id`  
3. Click **Unmatch** → see confirmation "Unmatch [B's name]?"  
4. Confirm → redirected to `/dating/conversations`  
5. User B no longer appears in list  
6. Try direct URL `/dating/conversations/:id` → 404  
7. User B logs in → User A also not in their list  

---

## Shipped notes

- **`MeConversationsService.unmatch()`** — ACTIVE participant only; **204** empty body.
- **404** for missing / already UNMATCHED (idempotent second DELETE); **403** for non-participant.
- List/detail exclusion via existing **`status: ACTIVE`** filters (Stories 2–3) — no new queries.
- Story 4 **You matched!** badge clears on next GET (`findActiveByUserPair` ignores UNMATCHED).
- **15 automated tests** for Story 5 (4 unit + 6 integration + 5 UI).

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Re-match after UNMATCHED | Future story |
| Notify other user on unmatch | Future epic |
| Undo LIKE stale badge | Follow-up |
| Actual messaging | Sprint 3 |
