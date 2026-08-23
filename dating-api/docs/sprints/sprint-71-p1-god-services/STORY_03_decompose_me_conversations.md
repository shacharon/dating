# Story 03 — Decompose MeConversationsService

**Sprint:** 71  
**Effort:** 1–2 days  
**Risk:** ⚡ LOW  
**Status:** Done  

**Handoffs:** [preflight](./handoffs/STORY_03_decompose_me_conversations/agent--1-preflight.md) · [architect](./handoffs/STORY_03_decompose_me_conversations/agent-0-architect.md) · [dev](./handoffs/STORY_03_decompose_me_conversations/agent-1-dev.md) · [CR](./handoffs/STORY_03_decompose_me_conversations/agent-2-cr.md) · [PM](./handoffs/STORY_03_decompose_me_conversations/agent-3-pm.md)

---

## Objective

Split `me-profile/me-conversations.service.ts` (405 LOC) — mostly a fat `list()` method plus read/lifecycle operations mixed with DTO builders.

**Public API unchanged** (used by `MeProfileController`):

- `list`, `unreadTotal`, `getById`, `markAsRead`, `countUnreadForParticipant`, `unmatch`, `assertActiveConversationParticipant`

---

## Target layout (locked — Agent 0)

```
me-profile/conversations/
  me-conversations.service.ts              # facade ≤150 LOC (re-export DTOs)
  me-conversations.dto.ts                  # Conversation*Dto interfaces
  conversation-list.mapper.ts              # buildOtherUserDto, deriveAgeYears, pickApprovedPrimaryPhotoId
  conversation-read-state.helpers.ts       # lastReadFieldForUser, lastReadAtForUser, lastReadAtIsoForUser
  conversation-list.service.ts             # list()
  conversation-read-state.service.ts       # unreadTotal, markAsRead, countUnreadForParticipant
  conversation-lifecycle.service.ts        # assertActive*, getById, unmatch
  me-conversations-spec-size.policy.spec.ts
```

Facade delegates all 7 public methods; `assertActiveConversationParticipant` stays on facade (messages + WS seam). Wire collaborators in `me-profile.module.ts`.

---

## Split rationale

| Concern | Methods | Changes together when… |
|---------|---------|------------------------|
| List | `list` | Pagination/cursor/lastMessage batching changes |
| Read state | `unreadTotal`, `markAsRead`, `countUnread*` | Unread semantics change |
| Lifecycle | `getById`, `unmatch`, `assertActive*` | Match status / unmatch policy changes |

---

## Tasks

1. Extract mapper helpers (pure functions) first — zero behavior risk.
2. Extract `ConversationListService` with `list()` body.
3. Extract read-state and lifecycle services.
4. Facade delegates; wire in `me-profile.module.ts`.
5. Update `me-conversations.service.spec.ts` + HTTP integration specs (imports only).
6. `npm test -- me-conversations`.

---

## Success

- [x] Facade ≤150 LOC (77 non-empty lines)
- [x] Each collaborator ≤200 LOC (max 141 — list service)
- [x] `/api/v1/me/conversations` responses unchanged (53 HTTP + 205 smoke)
- [x] Unmatch still enqueues rank rebuild for both users

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
