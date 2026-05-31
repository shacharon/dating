# Epic: Match Actions (Dating Loop — Phase 1)

**Status:** Done (Sprint 1 shipped)  
**Priority:** P0  
**Sprint:** [Sprint 1 — Match Actions](../sprints/sprint-01-match-actions/README.md) — **complete**

---

## Why

Users can browse scored matches but cannot act on them. The product is read-only: no interest, no choice, no progression. We need the first step of the dating loop before mutual matches and messaging.

---

## What we want to achieve

1. **Like** — User can express interest in a match; action is saved and idempotent.
2. **Pass** — User can skip a match; action is saved (same mechanism as like).
3. **See action state** — User sees whether they already liked, passed, or blocked on list and detail.
4. **Undo** — User can remove a like or pass and decide again (block is not undoable).
5. **Block** — User can permanently hide a match; blocked profiles never appear in list or detail.
6. **Safe & fast** — Auth required; user cannot act on self; actions persist; API responds in &lt;500ms under normal load.
7. **Tested end-to-end** — Each story ships API + UI + tests for its behavior.
8. **Foundation for Phase 2** — Actions are **user-to-user** (`actorUserId` ↔ `targetUserId`) so mutual-like detection works without profile-id ambiguity.

---

## Data model decision (MatchAction)

Actions are keyed by **users**, not by profile id alone. The match list/detail API still uses `UserProfile.id` in URLs; the service resolves that to `targetUserId` and stores a snapshot of the profile viewed at action time.

| Field | Purpose |
|-------|---------|
| `actorUserId` | Session user who acted |
| `targetUserId` | Other user's `User.id` (canonical pair identity for Phase 2 mutual matching) |
| `targetProfileIdSnapshot` | `UserProfile.id` at action time — reference only, not part of uniqueness |
| `action` | `LIKE` \| `PASS` \| `BLOCK` |
| `createdAt` | Timestamp |

**Unique constraint:** `@@unique([actorUserId, targetUserId])` — one row per directed user pair.

**Not used for identity:** `targetProfileIdSnapshot` (audit/history only).

**Phase 2 implication:** Mutual match = `LIKE` from A→B and `LIKE` from B→A on `(actorUserId, targetUserId)`.

---

## Sprints (this epic)

| Sprint | Focus | Stories |
|--------|--------|---------|
| **Sprint 1** | Match actions core | [5 stories](../sprints/sprint-01-match-actions/README.md) |

Future epics (not this document):

- **Phase 2:** Mutual match detection + conversation shell
- **Phase 3:** Messaging
- **Phase 4:** Discovery polish (filters, sort, notifications)

---

## Success metrics

- ≥80% of active users take at least one action per session
- Average ≥5 actions per session (like + pass combined)
- Undo rate &lt;10% (sanity check on UX)
- Zero duplicate rows per **actorUser–targetUser** pair (unique constraint holds)

---

## Out of scope (this epic)

- Photos on match cards
- Swipe gestures
- “Someone liked you” notifications
- Mutual match creation / messaging
- Rate limits / premium tiers
- Undo block

---

## References

- Match engine contract: [MATCH_ENGINE_V1_CONTRACT.md](../MATCH_ENGINE_V1_CONTRACT.md)
- Match engine deep dive: [MATCH_ENGINE_DEEP_DIVE.md](../MATCH_ENGINE_DEEP_DIVE.md)
- UI today: `dating-ui/src/app/dating/me-matches/`
- API today: `GET /api/v1/me/matches`, `GET /api/v1/me/matches/:id`
