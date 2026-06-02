# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_unread_count.md](../../STORY_05_unread_count.md)  
**Sprint:** sprint-03-messaging  
**Date:** 2026-06-02  
**Status:** complete  

---

## Summary

- **No Prisma migration** — Story 4 read columns + Story 1 `Message` table are sufficient.
- **Wire `unreadCount` into `GET /api/v1/me/conversations`** — replace hard-coded `0` using Story 4 `countUnreadForParticipant` logic per row.
- **Refactor** shared unread `where` builder so `list()` and `countUnreadForParticipant()` stay identical (no drift).
- **List query** extends `mutualMatch.findMany` `select` with `user1LastReadAt`, `user2LastReadAt`; **parallel `message.count`** per row (acceptable MVP — typical list size small).
- **Sort:** conversations with **`unreadCount > 0` first**, then `matchedAt` desc (implements optional AC).
- **UI:** badge on list row when `unreadCount > 0`; numeric pill + `aria-label`; hide at zero.
- **List refresh:** refetch on **page mount** (return from detail) + optional **`visibilitychange` → visible`** (no 3s polling on list in Story 5).
- **No** nav-wide unread total, push notifications, or list polling interval.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | N/A |
| `dating-api/src/me-profile/me-conversations.service.ts` | updated — `list()` unread + sort; refactor count helper |
| `dating-api/src/me-profile/me-conversations.service.spec.ts` | updated (agent 2) |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | updated (agent 2) — extend Story 2 list block |
| `dating-ui/src/app/dating/conversations/page.tsx` | updated — badge + header copy + visibility refetch |
| `dating-ui/src/app/dating/conversations/page.spec.tsx` | updated (agent 2) |
| `dating-ui/src/lib/conversations-api.ts` | N/A — `unreadCount` already on type |

---

## Decisions (do not reverse without discussion)

### 1. No new HTTP route

Only **`GET /api/v1/me/conversations`** changes. `countUnreadForParticipant(conversationId)` remains public for tests / future use; list uses same count rules inline.

### 2. Unread semantics (match Story 4 — locked)

| Rule | Value |
|------|--------|
| Count only | `Message.status = SENT` |
| Sender | **Other user only** (`senderId = otherUserId`) |
| Cursor | Session user's `user1LastReadAt` or `user2LastReadAt` |
| `lastReadAt` null | **All** peer SENT messages count as unread |
| Own messages | Never unread |

Story draft note "or treat as 0" when no `lastReadAt` — **rejected**; Story 4 architect + tests use "all peer messages unread".

### 3. Shared count implementation

Extract private helper (names illustrative):

```typescript
function unreadMessageCountWhere(
  conversationId: string,
  otherUserId: string,
  lastReadAt: Date | null,
): Prisma.MessageWhereInput {
  return {
    conversationId,
    senderId: otherUserId,
    status: MessageStatus.SENT,
    ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
  };
}

async countUnreadForMatchRow(
  sessionUserId: string,
  row: {
    id: string;
    userId1: string;
    userId2: string;
    user1LastReadAt: Date | null;
    user2LastReadAt: Date | null;
  },
): Promise<number> {
  const otherUserId =
    row.userId1 === sessionUserId ? row.userId2 : row.userId1;
  const lastReadAt = lastReadAtForUser(row, sessionUserId);
  return this.prisma.message.count({
    where: unreadMessageCountWhere(row.id, otherUserId, lastReadAt),
  });
}
```

Refactor `countUnreadForParticipant()`:

```typescript
async countUnreadForParticipant(sessionUserId, conversationId) {
  const match = await this.assertActiveConversationParticipant(...);
  return this.countUnreadForMatchRow(sessionUserId, match);
}
```

### 4. `list()` algorithm

```typescript
const rows = await prisma.mutualMatch.findMany({
  where: { status: ACTIVE, OR: [...] },
  orderBy: { createdAt: 'desc' },
  select: {
    id: true,
    userId1: true,
    userId2: true,
    createdAt: true,
    user1LastReadAt: true,
    user2LastReadAt: true,
  },
});

const unreadCounts = await Promise.all(
  rows.map((row) => this.countUnreadForMatchRow(sessionUserId, row)),
);

// Build ConversationListItemDto[] with unreadCounts[i]
// Then sort in memory:
conversations.sort((a, b) => {
  if (b.unreadCount !== a.unreadCount) {
    return b.unreadCount - a.unreadCount;
  }
  return b.matchedAt.localeCompare(a.matchedAt); // ISO strings, desc
});
```

**N+1 note:** One `count` query per ACTIVE mutual row. Acceptable for MVP (< ~50 rows). Do **not** add raw SQL or `groupBy` in Story 5 unless perf issue appears.

### 5. `unreadCount` type and bounds

- Always **non-negative integer** (`number` in JSON).
- No server-side cap required; UI may display **`99+`** when `unreadCount > 99` (optional polish).

### 6. HTTP — unchanged status codes

`GET /api/v1/me/conversations` — still **200** / **401** only. Empty list valid.

**Response item (unchanged shape, real `unreadCount`):**

```json
{
  "conversations": [
    {
      "id": "mutual_row_1",
      "otherUser": { "id": "...", "profileId": "...", "nickname": "Noa", "...": "..." },
      "matchedAt": "2026-05-31T12:00:00.000Z",
      "unreadCount": 3
    }
  ]
}
```

### 7. Observability

Reuse **`ME_CONVERSATIONS_LIST_OK`**. Optional trace segment: `unreadTotal=<sum>` — skip unless useful; not required in Story 5.

### 8. UI — conversation list page

**File:** `dating-ui/src/app/dating/conversations/page.tsx`

| Element | Spec |
|---------|------|
| Badge visibility | Render only when `item.unreadCount > 0` |
| Badge content | `{unreadCount}` or `{unreadCount > 99 ? '99+' : unreadCount}` |
| Placement | Right side of row (replace or sit before `→` chevron) |
| `data-testid` | `conversation-unread-badge` |
| `aria-label` | `` `${unreadCount} unread message${unreadCount === 1 ? '' : 's'}` `` |
| Styles | Small pill — e.g. `min-w-[1.25rem] rounded-full bg-emerald-600 px-1.5 text-xs font-semibold text-white` (match app accent) |

**Header copy:** Remove "messaging coming soon" — replace with neutral copy, e.g. "Your mutual matches".

### 9. List refresh after mark-read (Story 4 integration)

| Trigger | Behavior |
|---------|----------|
| Navigate back from detail | List page **remounts** → existing mount `fetchMyConversations()` → `unreadCount: 0` |
| Tab becomes visible while on list | **Refetch** once (no interval): |

```typescript
useEffect(() => {
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    void load().catch(() => undefined);
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => document.removeEventListener('visibilitychange', onVisible);
}, [load]);
```

**No** 3s list polling in Story 5 (manual smoke step 8 "within 3-5s" satisfied by user refresh / tab switch / re-navigation). Real-time list badges while staying on list page deferred (would need polling or WebSocket).

### 10. Detail page — no changes required

Story 4 already calls `PUT .../read` on detail mount. Story 5 does not add mark-read on list rows.

### 11. Optional AC: sort by unread — **include**

Sort unread-first in `list()` (§4). Document in story shipped notes.

---

## Prisma schema

**No changes.**

---

## Migration plan

None.

---

## API contract

### `GET /api/v1/me/conversations`

**Auth:** session cookie.

**Change:** each `conversations[]` item includes accurate **`unreadCount`** per §2.

**Example:**

```json
{
  "conversations": [
    {
      "id": "mutual_abc",
      "otherUser": {
        "id": "user_b",
        "profileId": "prof_b",
        "nickname": "Noa",
        "gender": "FEMALE",
        "ageYears": 32,
        "locationLabel": "Tel Aviv",
        "photoUrl": "/api/v1/me/matches/prof_b/photos/photo_1/file"
      },
      "matchedAt": "2026-05-31T10:00:00.000Z",
      "unreadCount": 3
    },
    {
      "id": "mutual_xyz",
      "otherUser": { "...": "..." },
      "matchedAt": "2026-05-31T09:00:00.000Z",
      "unreadCount": 0
    }
  ]
}
```

**Sort order:** higher `unreadCount` first; tie-break `matchedAt` descending.

---

## UI contract

### `conversations/page.tsx`

```tsx
{item.unreadCount > 0 && (
  <span
    data-testid="conversation-unread-badge"
    aria-label={`${item.unreadCount} unread message${item.unreadCount === 1 ? '' : 's'}`}
    className="..."
  >
    {item.unreadCount > 99 ? '99+' : item.unreadCount}
  </span>
)}
```

Expose existing `load()` for visibility refetch (already present).

---

## Test plan (for Agent 2)

### Unit — `me-conversations.service.spec.ts`

| Case | Expected |
|------|----------|
| `list` — row with null lastRead, count mock 3 | `unreadCount: 3` |
| `list` — row with lastRead set, count mock 0 | `unreadCount: 0` |
| `list` — only counts other user's messages | `count` where uses `otherUserId` |
| `list` — sort unread first | row with 3 before row with 0 despite older `matchedAt` |
| `countUnreadForParticipant` still passes | refactor did not change behavior |

### Integration — extend `Sprint 2 Story 2: GET /api/v1/me/conversations`

Add block or cases under Story 5 label:

| Case | Expected |
|------|----------|
| List returns `unreadCount: 3` when 3 peer messages, null lastRead | 200 |
| After `PUT .../read`, list returns `unreadCount: 0` | 200 |
| Own messages do not increment unread | sender = session user → 0 |
| Sort: unread conversation appears before read one | order in `conversations[]` |

**Flow test:**

1. Mock mutual row + `message.count` → 3 for list.  
2. `GET /conversations` → `unreadCount: 3`.  
3. `PUT .../read`.  
4. Mock `message.count` → 0 (or stateful lastRead).  
5. `GET /conversations` → `unreadCount: 0`.

### UI — `page.spec.tsx`

| Case | Expected |
|------|----------|
| Renders badge when `unreadCount: 3` | `conversation-unread-badge` text `3` |
| No badge when `unreadCount: 0` | badge absent |
| `aria-label` present when badge shown | accessibility |
| Visibility refetch | `fetchMyConversations` called again on `visibilitychange` (mock visible) |

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Live badge while user stays on list** — requires list polling (out of scope); refetch on return/visibility only.
2. **Nav unread total** — future story.
3. **Performance** — parallel counts per row OK for MVP; revisit if list size grows.

---

## Next agent

```text
--agent 1 sprint 3 story 5
```

**Notes for next agent:**

1. Refactor unread where + `countUnreadForMatchRow`; wire `list()`.
2. Sort unread-first in service before return.
3. List UI badge + update header copy; visibility refetch.
4. Do not add nav badge or list polling interval.
5. Reuse Story 4 semantics exactly (null lastRead = all peer messages unread).
