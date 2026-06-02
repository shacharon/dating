# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_list_conversations.md](../../STORY_02_list_conversations.md)  
**Sprint:** sprint-02-mutual-match  
**Date:** 2026-05-31  
**Status:** complete  

---

## Summary

- **No Prisma migration** — Story 1 `MutualMatch` table is sufficient; query `status = ACTIVE` only.
- New **`MeConversationsService`** + **`GET /api/v1/me/conversations`** on existing `MeProfileController` (`AuthGuard`, session `user.id`).
- List resolves **other user** per row (`userId1`/`userId2` vs session), batch-loads their **`UserProfile`** + approved photos for display.
- **Display name:** use product **`nickname`** + meta fallback (matches list pattern). Story draft says `firstName` — **User has no `firstName`**; do not invent one.
- **Photo URLs:** reuse `/api/v1/me/matches/:profileId/photos/:photoId/file` — **extend photo auth** so ACTIVE mutual-match partners can load photos even when match-engine eligibility would fail.
- New UI: **`/dating/conversations`** page + **`conversations-api.ts`** client; rows link to `/dating/conversations/:id` (detail page is Story 3 — link only, stub OK).
- **`unreadCount: 0`** on every item (Sprint 3 placeholder).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | N/A — no schema change |
| `dating-api/src/me-profile/me-conversations.service.ts` | created |
| `dating-api/src/me-profile/me-conversations.service.spec.ts` | created (agent 1/2) |
| `dating-api/src/me-profile/me-profile.controller.ts` | updated — `GET conversations` |
| `dating-api/src/me-profile/me-profile.module.ts` | updated — register service |
| `dating-api/src/me-profile/me-matches.service.ts` | updated — mutual-match photo bypass |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | updated — list endpoint tests |
| `dating-api/src/logging/error-codes.ts` | updated — optional trace code for list OK |
| `dating-ui/src/lib/conversations-api.ts` | created |
| `dating-ui/src/app/dating/conversations/page.tsx` | created |
| `dating-ui/src/app/dating/conversations/page.spec.tsx` | created |
| `dating-ui/src/app/dating/conversations/conversation-display.ts` | created — optional; mirror `match-display.ts` |
| `dating-ui/src/components/authenticated-app-shell.tsx` | updated — nav link (recommended) |
| `dating-ui/src/lib/i18n/en.ts`, `es.ts`, `types.ts` | updated — `nav.conversations` copy |

---

## Decisions (do not reverse without discussion)

### 1. No schema migration

Story 2 is read-only over existing `MutualMatch`. Indexes from Story 1 (`userId1+status`, `userId2+status`) support the list query.

### 2. Service placement — `MeConversationsService` in `me-profile` module

Keep conversation domain alongside `MutualMatchesService`. Do **not** create a separate Nest module yet (only one endpoint in this story; Story 3 adds detail).

Inject `MutualMatchesService` only if needed; list query can use `PrismaService` directly.

### 3. Display fields — nickname, not firstName

Story technical notes reference `firstName`. The product model uses:

| Source | Field |
|--------|-------|
| `UserProfile.nickname` | primary display (nullable) |
| `UserProfile.gender`, `birthDate`, `locationLabel` | fallback meta (same as `/me/matches`) |

Return structured fields so UI can reuse `match-display.ts` helpers or a thin `conversation-display.ts` wrapper.

### 4. Include `otherUser.profileId` in DTO

Photo URLs are keyed by **`UserProfile.id`**, not `User.id`. Required for `<img src>` and Story 3 detail.

### 5. Viewer profile gate — session only (not ANALYZED)

Unlike `GET /me/matches`, conversations list requires **only auth** (401 without session). A user with a mutual match should see conversations even if their profile is temporarily not `ANALYZED`.

Other user's profile: load by `userId`; **do not filter out** non-`ANALYZED` profiles (show row with fallback label + null photo if profile missing).

### 6. Photo URL + auth bypass

List returns:

```typescript
photoUrl: `/api/v1/me/matches/${profileId}/photos/${photoId}/file` | null
```

**Problem:** `MeMatchesService.getPrimaryPhotoFileById` today requires reciprocal gender eligibility + HG + no BLOCK.

**Fix (Story 2):** Before eligibility checks, if `MutualMatchesService.findActiveByUserPair(viewerUserId, candidate.userId)` returns a row → **allow photo read** (skip engine eligibility). Still require APPROVED primary photo exists.

Rationale: mutual-match partners must see each other's photos on the conversations list regardless of later preference drift or match-list filtering.

### 7. Sort and filter

- `where: { status: ACTIVE, OR: [userId1, userId2] }`
- `orderBy: { createdAt: 'desc' }`
- Exclude `UNMATCHED` (Story 5 will set status; integration test can stub UNMATCHED row → excluded)

### 8. Response shape — flat list wrapper

No `not_ready` gate (unlike matches). Empty list is valid `200`:

```typescript
{ conversations: ConversationListItemDto[] }
```

### 9. UI navigation

Story AC requires page at `/dating/conversations` but not nav. **Recommend** adding **Conversations** nav item in `AuthenticatedAppShell` (between Matches and Profile) so manual smoke is discoverable before Story 4 modal.

Row click → `Link` to `/dating/conversations/:id`. Story 3 owns detail page; Story 2 may ship with a minimal "Coming soon" stub at `[id]/page.tsx` **or** 404 until Story 3 — prefer **minimal stub** so click navigation satisfies AC without blocking Story 3.

### 10. `unreadCount` placeholder

Always `0` in API response. UI may omit badge until Sprint 3.

---

## Prisma schema

**No changes.** Reference query:

```typescript
await prisma.mutualMatch.findMany({
  where: {
    status: MutualMatchStatus.ACTIVE,
    OR: [{ userId1: sessionUserId }, { userId2: sessionUserId }],
  },
  orderBy: { createdAt: 'desc' },
  select: {
    id: true,
    userId1: true,
    userId2: true,
    createdAt: true,
  },
});
```

Batch profile load:

```typescript
await prisma.userProfile.findMany({
  where: { userId: { in: otherUserIds } },
  select: {
    id: true,
    userId: true,
    nickname: true,
    gender: true,
    birthDate: true,
    locationLabel: true,
    photos: {
      where: { status: 'APPROVED' },
      select: { id: true, isPrimary: true },
    },
  },
});
```

Age: reuse `buildProductProfileMatchingBridge(profile, asOf).derivedSelfAgeYears` or equivalent — keep consistent with matches list.

---

## Migration plan

N/A — no migration.

---

## API contract

### `GET /api/v1/me/conversations`

```
Auth: Session cookie (AuthGuard)
Response: 200
{
  "conversations": [
    {
      "id": "clx...",                    // MutualMatch.id
      "otherUser": {
        "id": "clu...",                  // User.id
        "profileId": "clp...",           // UserProfile.id
        "nickname": "Noa",
        "gender": "FEMALE",
        "ageYears": 32,
        "locationLabel": "Tel Aviv",
        "photoUrl": "/api/v1/me/matches/clp.../photos/photo_.../file"
      },
      "matchedAt": "2026-05-31T14:00:00.000Z",
      "unreadCount": 0
    }
  ]
}
```

**Status codes:**

| Code | When |
|------|------|
| 200 | Success (empty array OK) |
| 401 | No session |

**Not in Story 2:** `GET /api/v1/me/conversations/:id` (Story 3), `DELETE` unmatch (Story 5).

---

## DTOs (copy-paste)

```typescript
export interface ConversationOtherUserDto {
  id: string;
  profileId: string;
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  photoUrl: string | null;
}

export interface ConversationListItemDto {
  id: string;
  otherUser: ConversationOtherUserDto;
  matchedAt: string;
  unreadCount: number;
}

export interface ConversationListResponseDto {
  conversations: ConversationListItemDto[];
}
```

---

## Service signatures

### `MeConversationsService` (`me-conversations.service.ts`)

```typescript
@Injectable()
export class MeConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Active mutual matches for session user, newest first.
   * Resolves other user + profile display fields per row.
   */
  list(sessionUserId: string): Promise<ConversationListResponseDto>;
}
```

### `list` logic sketch

```typescript
async list(sessionUserId: string): Promise<ConversationListResponseDto> {
  const rows = await this.prisma.mutualMatch.findMany({ /* ACTIVE + OR userIds */ });

  const otherUserIds = rows.map((r) =>
    r.userId1 === sessionUserId ? r.userId2 : r.userId1,
  );

  const profiles = await this.prisma.userProfile.findMany({
    where: { userId: { in: otherUserIds } },
    select: { /* see batch select above */ },
  });
  const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));

  const conversations = rows.map((row) => {
    const otherUserId = row.userId1 === sessionUserId ? row.userId2 : row.userId1;
    const profile = profileByUserId.get(otherUserId);
    const photoId = pickApprovedPrimaryPhotoId(profile?.photos ?? []);
    return {
      id: row.id,
      otherUser: {
        id: otherUserId,
        profileId: profile?.id ?? '',
        nickname: profile?.nickname?.trim() || null,
        gender: profile ? String(profile.gender) : null,
        ageYears: profile ? deriveAgeYears(profile.birthDate) : null,
        locationLabel: profile?.locationLabel ?? null,
        photoUrl: profile?.id && photoId
          ? `/api/v1/me/matches/${profile.id}/photos/${photoId}/file`
          : null,
      },
      matchedAt: row.createdAt.toISOString(),
      unreadCount: 0,
    };
  });

  return { conversations };
}
```

Extract `pickApprovedPrimaryPhotoId` / `buildMatchPrimaryPhotoUrl` to a shared helper **only if** duplicating from `me-matches.service.ts` feels wrong — optional refactor.

### Controller addition (`me-profile.controller.ts`)

```typescript
@Get('conversations')
listConversations(@CurrentUser() user: SessionUser) {
  return this.conversations.list(user.id);
}
```

Register `MeConversationsService` in constructor + module `providers`.

### Photo auth change (`me-matches.service.ts`)

```typescript
// At start of getPrimaryPhotoFileById, after loading candidate:
const mutual = await this.mutualMatches.findActiveByUserPair(userId, candidate.userId);
if (mutual) {
  // skip eligibility + block checks OR only skip eligibility — see note below
  return this.readApprovedPrimaryPhoto(candidateProfileId, photoId);
}
// ... existing eligibility path
```

**Block vs mutual:** If viewer has `BLOCK` toward target but `MutualMatch` is still ACTIVE (Story 1 deferred), photo bypass still applies for Story 2 consistency with list visibility. Story 5 unmatch will set `UNMATCHED` and remove from list.

Inject `MutualMatchesService` into `MeMatchesService`.

---

## UI contract

### API client — `dating-ui/src/lib/conversations-api.ts`

```typescript
export interface ConversationListItemDto { /* mirror API */ }
export interface ConversationListResponseDto { conversations: ConversationListItemDto[] }

export async function fetchMyConversations(): Promise<ConversationListResponseDto>;
```

Use `getApiBase()`, session cookies, same error pattern as `fetchMyMatches`.

### Page — `dating-ui/src/app/dating/conversations/page.tsx`

- Client component (like `me-matches/page.tsx`)
- Load on mount → `fetchMyConversations()`
- **Empty state:** "No matches yet. Keep swiping!" (+ optional link to `/dating/me-matches`)
- **Row:** avatar (`photoUrl`), primary label (nickname || meta), subtitle `"Matched {relative date}"` (simple `Intl.RelativeTimeFormat` or formatted date)
- **Link:** `/dating/conversations/${item.id}`
- Loading + error states

### Optional stub — `conversations/[id]/page.tsx`

Minimal placeholder: "Conversation detail — Story 3" + back link. Prevents dead-end on row click.

### Nav (recommended)

`authenticated-app-shell.tsx`: add `/dating/conversations` link + active state + i18n key `nav.conversations` ("Conversations" / Spanish equivalent).

---

## Test plan (for Agent 2)

### Unit — `me-conversations.service.spec.ts`

| Case | Expected |
|------|----------|
| User with 2 ACTIVE mutual matches | 2 items, correct other users |
| User with 0 mutual matches | `{ conversations: [] }` |
| UNMATCHED row exists | excluded from list |
| Other user resolution | session = userId1 → other = userId2 |
| Sort order | newest `createdAt` first |
| Missing other profile | row returned, empty profileId, null photo, fallback fields |

### Integration — `me-profile-http.integration.spec.ts`

| Case | Expected |
|------|----------|
| No session | 401 |
| A↔B mutual LIKE → GET conversations as A | 200, contains B |
| Same as B | 200, contains A |
| User with unmatch (UNMATCHED) | excluded (may seed row directly until Story 5 HTTP exists) |
| Photo URL in response | non-null when primary photo exists |

### Photo integration

| Case | Expected |
|------|----------|
| Mutual match exists, engine would reject eligibility | GET photo file still 200 |

### UI — `conversations/page.spec.tsx`

| Case | Expected |
|------|----------|
| Renders list rows | photo, name, matched date |
| Empty state | copy visible |
| Row click | navigates to `/dating/conversations/:id` |

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Detail stub in Story 2 vs Story 3 only** — Recommend minimal `[id]` stub so row navigation works; full shell is Story 3.
2. **Nav link** — Not in story AC; recommended for discoverability. Agent 1 may skip if user prefers URL-only access until Story 4.
3. **BLOCK + ACTIVE mutual** — List shows ACTIVE mutual regardless of BLOCK on match actions until Story 5; document as known limitation.

---

## Next agent

```text
--agent 1 sprint 2 story 2
```

**Notes for next agent:**

1. Story 1 `MutualMatch` + `MutualMatchesService` already shipped — no migration.
2. Implement `MeConversationsService.list` + controller route first; add integration tests.
3. **Must** extend `getPrimaryPhotoFileById` mutual-match bypass or photos break on list.
4. Use **nickname** display pattern from `match-display.ts`; ignore story's `firstName`.
5. Do **not** implement `GET /conversations/:id` (Story 3) except optional UI stub.
6. `unreadCount` always `0`.
7. After API + UI, manual smoke: reciprocal likes → visit `/dating/conversations` → see other user.
