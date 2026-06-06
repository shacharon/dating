# Story 1: Photos in match browse

**Sprint:** 9  
**Status:** Done (engineering gate — manual smoke pending operator)  
**Depends on:** — (API already exposes `primaryPhotoUrl` on match DTOs)

---

## Why

Users cannot evaluate attraction from text-only cards. The API already returns `primaryPhotoUrl` and serves photo files via `GET /api/v1/me/matches/:profileId/photos/:photoId/file`, but the match **list** is text-only and the match **detail** page does not lead with a photo hero.

---

## What

**As a** user browsing matches  
**I want** to see each candidate's primary photo on the list and detail pages  
**So that** I can recognize people and feel confident before liking

### Acceptance criteria

- [x] **Match list** — each row shows primary photo thumbnail (or neutral placeholder when absent)
- [x] **Match detail** — photo hero above score/explainability; uses authenticated photo URL
- [x] **Conversation list** — other user's primary photo on each row (reuse same URL pattern) *(pre-shipped Sprint 2–3; regression verified)*
- [x] **Conversation header** — peer avatar in thread view when photo exists *(pre-shipped; regression verified)*
- [x] **Celebration modal** — unchanged behavior; verify still works with shared photo component
- [x] **Loading / error** — broken image → placeholder; no layout shift
- [x] **PII-safe** — photo URLs remain session-authenticated endpoints (no public CDN URLs in HTML)
- [x] **Tests** — list/detail/conversation render with and without `primaryPhotoUrl`

### Out of scope (this story)

- Requiring a photo before browse (Story 2)
- Photo upload UX changes
- Multiple photos / gallery carousel
- Real moderation

---

## Technical notes (guidance, not prescriptive)

- Reuse `primaryPhotoUrl` from `MeMatchItemDto` / `MeMatchDetailDto` / conversation `otherUser` DTO (extend if missing).
- Shared UI: `MatchPhoto` component — rounded thumbnail + `object-cover`, alt text from display name.
- Fetch pattern: `<img src={url}>` with credentials or blob fetch if cookies don't attach to img (match existing detail test pattern in `page.spec.tsx`).
- Conversation list already has `otherUser` fields — confirm `primaryPhotoUrl` on list API or add minimal field.

---

## Definition of done

- [x] Photos visible on match list, detail, conversation list, and chat header
- [x] Placeholder when no approved primary photo
- [x] UI unit tests updated
- [ ] Manual smoke: two users with photos see each other's faces in browse + chat list *(operator)*

---

## Manual smoke

1. User A and B both have approved primary photos.
2. A opens `/dating/me-matches` → sees B's thumbnail on list row.
3. A opens match detail → hero photo visible above score.
4. After mutual match, A opens `/dating/conversations` → B's photo on row and in thread header.

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Shared UI | `MatchPhoto` — `list` / `hero` / `celebration` / `header` variants; placeholder initials; `onError` fallback |
| URL helper | `matchPhotoSrc` re-export of `conversationPhotoSrc` |
| Match list | Thumbnail per row (`/dating/me-matches`) |
| Match detail | Full-width hero above header (`/dating/me-matches/[id]`) |
| Modal | `MatchCelebrationModal` uses `MatchPhoto variant="celebration"` |
| Types | `primaryPhotoUrl` on UI `MeMatchItemDto` |
| Tests | **218/218** UI suite; +10 story-focused tests |

Handoffs: `handoffs/STORY_01_photos_in_match_browse/agent-*.md`

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Operator two-browser photo smoke | Manual smoke section above |
| Refactor conversations to `MatchPhoto` | Optional cleanup |
| Multi-photo gallery on detail | Future sprint |
| Blur until mutual match | Product decision |
