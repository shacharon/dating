# Epic: Mutual Match & Messaging (Dating Loop — Phase 2 & 3)

**Status:** Complete (Sprint 2 + Sprint 3)  
**Priority:** P0  
**Sprints:** 
- [Sprint 2 — Mutual Match + Conversation Shell](../sprints/sprint-02-mutual-match/README.md) — **complete** (5/5 stories)
- [Sprint 3 — Messaging](../sprints/sprint-03-messaging/README.md) — **complete** (6/6 stories)

---

## Why

Users can like, pass, and block matches, but there's no payoff when interest is mutual. Without conversation capability, the product can't facilitate connection — the core promise of dating. We need mutual match detection and messaging to complete the basic dating loop.

---

## What we want to achieve

### Sprint 2: Mutual Match + Conversation Shell

1. **Detect mutual like** — When both users have `LIKE` actions, create a `MutualMatch` record.
2. **Conversation list** — Users can see all their mutual matches in one place (`/dating/conversations`).
3. **Conversation shell** — Users can view match details (name, photo, match date) but messaging is not yet functional.
4. **Match notification** — Users see "It's a match!" feedback after reciprocal like.
5. **Unmatch action** — Users can end a conversation; both sides lose access.

### Sprint 3: Messaging

1. **Send text message** — Users can send messages in a conversation.
2. **Message history** — Past messages load and display chronologically.
3. **Real-time updates** — New messages appear without refresh (polling or WebSocket).
4. **Read tracking** — System tracks when users last read messages.
5. **Unread count** — Conversation list shows unread message badges.
6. **Safety guardrails** — Message length limits, rate limiting, content moderation hooks.

---

## Data model decisions

### MutualMatch

Represents a reciprocal like between two users.

| Field | Purpose |
|-------|---------|
| `id` | Primary key (cuid) |
| `userId1` | First user (lower ID for consistent ordering) |
| `userId2` | Second user (higher ID) |
| `createdAt` | When mutual match was detected |
| `status` | `ACTIVE` \| `UNMATCHED` |
| `unmatchedAt` | Timestamp if unmatched |
| `unmatchedByUserId` | Who initiated unmatch |

**Unique constraint:** `@@unique([userId1, userId2])` — one mutual match per user pair.

**Detection logic:** On `LIKE` action, check if reverse `LIKE` exists; if yes, create `MutualMatch` (idempotent).

---

### Message

Represents a text message in a conversation.

| Field | Purpose |
|-------|---------|
| `id` | Primary key (cuid) |
| `conversationId` | Foreign key to `MutualMatch.id` |
| `senderId` | User who sent message |
| `text` | Message content (max 2000 chars) |
| `createdAt` | Send timestamp |
| `status` | `SENT` \| `DELETED` (soft delete for moderation) |

**Indexes:**
- `@@index([conversationId, createdAt])` — for pagination
- `@@index([senderId])` — for sender queries

---

### Read tracking

Extend `MutualMatch` or create `ConversationParticipant`:

| Field | Purpose |
|-------|---------|
| `user1LastReadAt` | When user1 last viewed conversation |
| `user2LastReadAt` | When user2 last viewed conversation |

Or separate table if more participant metadata is needed later.

---

## User flow

1. **User A likes User B** → `MatchAction` created (actor=A, target=B, action=LIKE)
2. **User B likes User A** → `MatchAction` created + **mutual detection** → `MutualMatch` created
3. **Both see "It's a match!"** → Link to `/dating/conversations/:id`
4. **Conversation list** → Shows all mutual matches
5. **Click conversation** → Detail page with message history + input
6. **Send message** → Message saved, recipient polls and sees it
7. **Mark as read** → Unread count updates
8. **Unmatch** → Conversation hidden from both users

---

## Success metrics

- **Mutual match rate:** % of likes that result in mutual match (benchmark: 10-30%)
- **Conversation start rate:** % of mutual matches where ≥1 message is sent (target: ≥60%)
- **Response rate:** % of conversations where both users send ≥1 message (target: ≥40%)
- **Messages per conversation:** Average messages exchanged (target: ≥5)
- **Unmatch rate:** % of mutual matches that are unmatched (sanity check: <20%)

---

## Out of scope (this epic)

- Media attachments (photos, videos)
- Voice/video calls
- Message reactions, threads, or replies
- Typing indicators (nice-to-have, may add in Sprint 3)
- Push notifications (separate epic)
- Message search
- Group conversations
- Automated icebreaker suggestions
- Link previews
- GIF/sticker support

---

## Technical decisions

### Why polling over WebSocket (Sprint 3)?

**Phase 1:** Short polling (3-5s) is simpler to implement and debug. For early product validation, real-time feel is "good enough."

**Phase 2 (future):** WebSocket can replace polling when scale/latency becomes important.

### Why soft delete messages?

Preserve evidence for moderation/reporting. Status `DELETED` hides from UI but keeps in DB.

### Why `userId1` < `userId2` ordering?

Avoids duplicate `MutualMatch` rows. Always sort user IDs before creating/querying.

---

## Sprints (this epic)

| Sprint | Focus | Stories | Status |
|--------|--------|---------|--------|
| **Sprint 2** | Mutual match detection + conversation shell | 5 stories | **Complete** |
| **Sprint 3** | Text messaging + real-time + read status | 6 stories | **Complete** (6/6) |

---

## References

- Sprint 1 foundation: [EPIC_MATCH_ACTIONS.md](./EPIC_MATCH_ACTIONS.md)
- Match engine: [MATCH_ENGINE_V1_CONTRACT.md](../MATCH_ENGINE_V1_CONTRACT.md)
- API today: `GET /api/v1/me/matches`, `POST /api/v1/me/matches/:id/actions`
- UI today: `dating-ui/src/app/dating/me-matches/`
