# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_photos_in_match_browse.md](../../STORY_01_photos_in_match_browse.md)  
**Sprint:** sprint-09-product-mvp  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No Prisma / migration / API changes** — match list + detail already return `primaryPhotoUrl`; conversations already return `otherUser.photoUrl`; photo file auth exists on `GET /api/v1/me/matches/:profileId/photos/:photoId/file`.
- **UI gap only** — match **list** and **detail** pages do not render photos; celebration modal already uses photo URL; **conversation list + thread header already render photos** (verify + regression tests, do not rebuild).
- **New shared UI** — `MatchPhoto` component + thin URL helper; align list/detail with existing conversation `<img>` pattern (`conversationPhotoSrc`).
- **Type sync** — add `primaryPhotoUrl` to UI `MeMatchItemDto` (API field already wired in `MeMatchesService`).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/match-photo.ts` | created — `matchPhotoSrc(url)` (alias/wrapper over `conversationPhotoSrc`) |
| `dating-ui/src/components/match-photo.tsx` | created — shared avatar/thumbnail/hero with placeholder + `onError` fallback |
| `dating-ui/src/lib/me-profile-api.ts` | add `primaryPhotoUrl?: string \| null` to `MeMatchItemDto` |
| `dating-ui/src/app/dating/me-matches/page.tsx` | list row thumbnail (left of text) |
| `dating-ui/src/app/dating/me-matches/[id]/page.tsx` | photo hero above score block; refactor modal to use `MatchPhoto` (optional) |
| `dating-ui/src/components/match-celebration-modal.tsx` | optional — use `MatchPhoto` variant `celebration` |
| `dating-ui/src/app/dating/me-matches/page.spec.tsx` | tests: photo img present / placeholder when null |
| `dating-ui/src/app/dating/me-matches/[id]/page.spec.tsx` | tests: hero img + placeholder |
| `dating-ui/src/lib/match-photo.spec.ts` | unit tests for src resolution + placeholder initial |

**No changes:** `dating-api/*` (unless dev discovers list DTO regression — none expected; `me-matches.service.spec.ts` already covers `primaryPhotoUrl`).

**Verify only (already shipped):**

| Surface | File | Field |
|---------|------|-------|
| Conversation list | `conversations/page.tsx` | `otherUser.photoUrl` |
| Conversation header | `conversations/[id]/page.tsx` | `otherUser.photoUrl` |

---

## Decisions (do not reverse without discussion)

### 1. No backend work

| Approach | Verdict |
|----------|---------|
| New public CDN URLs | Rejected — breaks session auth |
| Duplicate photo endpoint under conversations | Rejected — reuse match photo route |
| Add `primaryPhotoUrl` to list API | **Not needed** — already on `MeMatchItemDto` in `me-matches.service.ts` |

Existing API shapes (frozen):

```typescript
// GET /api/v1/me/matches — each match item
{
  id: string; // UserProfile.id
  // ...
  primaryPhotoUrl: string | null; // e.g. "/api/v1/me/matches/{profileId}/photos/{photoId}/file"
  approvedPhotoCount: number;
}

// GET /api/v1/me/matches/:id — detail (same primaryPhotoUrl)

// GET /api/v1/me/conversations — each item.otherUser
{
  photoUrl: string | null; // same path pattern, built in buildOtherUserDto()
}
```

Photo file endpoint (unchanged):

```http
GET /api/v1/me/matches/:profileId/photos/:photoId/file
Auth: session cookie (AuthGuard)
200: image bytes (Content-Type from stored mime)
403/404: not visible (blocked, not eligible, or missing photo)
```

Mutual-match photo bypass in `getPrimaryPhotoFileById` (Sprint 2 Story 2) — **keep as-is**.

---

### 2. URL resolution — reuse `conversationPhotoSrc`

Do **not** invent a second resolver. Either:

- Re-export from `match-photo.ts`:

```typescript
// match-photo.ts
export { conversationPhotoSrc as matchPhotoSrc } from '@/lib/conversations-api';
```

- Or import `conversationPhotoSrc` directly in `MatchPhoto`.

Rule: relative path when `getApiBase()` is `''` (browser default → same-origin `/api/...` via Next rewrite); prepend base when `NEXT_PUBLIC_API_URL` is set.

---

### 3. Shared `MatchPhoto` component

Single component, variant prop:

| Variant | Use | Size (Tailwind) |
|---------|-----|-----------------|
| `list` | Match list row | `h-14 w-14 rounded-full` (match conversation list) |
| `hero` | Match detail top | `w-full aspect-[4/3] rounded-t-xl object-cover` **or** `h-48 w-full` inside card |
| `celebration` | Modal | `h-28 w-28 rounded-full ring-4` (current modal styling) |
| `header` | Conversation thread (optional refactor) | `h-20 w-20 rounded-full` |

Props:

```typescript
export type MatchPhotoProps = {
  photoUrl: string | null;
  displayName: string; // for placeholder initial + aria-label
  variant: 'list' | 'hero' | 'celebration' | 'header';
  className?: string;
};
```

Behavior (locked):

- `src = matchPhotoSrc(photoUrl)` when URL present
- Placeholder: circle with first letter of `displayName` (fallback `?` if empty) — match celebration modal pattern
- `onError` on `<img>` → swap to placeholder (no broken-image icon)
- `alt=""` decorative when name shown adjacent; or `alt={displayName}` on hero only — pick one and test consistently
- Use `<img>` not `next/image` (matches conversations + modal; auth cookie + dynamic URL)

---

### 4. Match list layout

Current row: text-only flex. New row structure (mirror `conversations/page.tsx`):

```tsx
<div className="flex items-center gap-4">
  <MatchPhoto variant="list" photoUrl={m.primaryPhotoUrl ?? null} displayName={matchListPrimaryLabel(m)} />
  <div className="min-w-0 flex-1">…existing text…</div>
  <div className="shrink-0">…badges + score…</div>
</div>
```

Add `data-testid="match-list-photo"` on img or placeholder for tests.

---

### 5. Match detail layout

Insert **hero** immediately inside `<article>`, **before** the text header block (or replace header top with hero + overlay name — simpler: hero then existing header):

```tsx
<article>
  <MatchPhoto variant="hero" photoUrl={data.primaryPhotoUrl ?? null} displayName={matchDetailTitle(data)} />
  <header>…existing title/subtitle…</header>
  <div>…score + explainability…</div>
</article>
```

Hero spans full card width; use `overflow-hidden rounded-t-xl` on article so hero clips cleanly.

Celebration modal: keep passing `data.primaryPhotoUrl`; optionally delegate rendering to `MatchPhoto variant="celebration"`.

---

### 6. Conversations — verification scope only

Story AC mentions conversation list + header. **Already implemented** in Sprint 2–3. Agent 1 must:

- [ ] Confirm no regression after `MatchPhoto` extraction
- [ ] Add/extend tests only if coverage gaps found
- [ ] **Do not** duplicate photo markup in conversations unless refactoring to `MatchPhoto variant="header"|"list"` (optional cleanup, not required for DoD)

---

## Runtime topology (photo auth / proxy)

This story is **not** realtime, but `<img>` loads authenticated bytes — document for dev smoke.

| Item | Value |
|------|--------|
| REST browser target | Same-origin `/api/...` when `NEXT_PUBLIC_API_URL` unset (Next rewrite → `API_PROXY_TARGET`, default `http://127.0.0.1:3001`) |
| Photo request | Browser `GET /api/v1/me/matches/{profileId}/photos/{photoId}/file` with session cookie on UI origin |
| Cookie host rule | Open UI at **`http://localhost:3000`** or **`http://127.0.0.1:3000`** consistently; do not mix with cross-origin API URL unless cookies configured for that domain |
| Socket | N/A this story |
| Expected Network tab | Photo `file` request → **200**, `Content-Type: image/*`; **401** if logged out |

**Cross-origin note:** If `NEXT_PUBLIC_API_URL` points to API host directly, `<img src>` may **not** send HttpOnly `dating_session` cookie (browser third-party cookie rules). Default dev path (empty base + rewrite) is the supported configuration — same as conversations today.

**Dev smoke (agent 1):**

1. Two users with approved primary photos
2. A on `/dating/me-matches` → Network shows photo `file` 200, thumbnail visible
3. A on match detail → hero 200
4. Mutual match → B's photo still 200 on conversations (regression)

---

## Tests / verification

- [ ] Unit: `matchPhotoSrc` / placeholder initial
- [ ] Component: `MatchPhoto` error → placeholder
- [ ] Page: `me-matches/page.spec.tsx` — with/without `primaryPhotoUrl`
- [ ] Page: `me-matches/[id]/page.spec.tsx` — hero present; celebration modal unchanged
- [ ] Conversations specs: run existing suite (no regressions)
- [ ] Command: `cd dating-ui && npm test`
- [ ] `prisma migrate deploy`: N/A
- [ ] Browser Network smoke: deferred to agent 1 (see topology)

---

## Open questions / blockers

- None blocking agent 1.

Optional product call (not blocking): hero aspect ratio `4:3` vs fixed `h-48` — dev may pick whichever matches card layout; default **`aspect-[4/3]` full-width**.

---

## Next agent

```text
--agent 1 sprint 9 story 1
```

**Notes for next agent:**

1. Start with `MeMatchItemDto` type + list page — highest user-visible impact.
2. Reuse `conversationPhotoSrc`; do not add API calls.
3. Conversation photos already work — verify, don't rewrite unless refactoring to `MatchPhoto`.
4. Run full `dating-ui` test suite before handoff.
5. Manual two-user smoke per story file + photo Network 200 check.
