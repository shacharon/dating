# Story 1: Like a match

**Sprint:** 1  
**Status:** Done  
**Depends on:** None (creates foundation)

---

## Why

Users need a way to express romantic interest. Without a persisted like, there is no path to mutual matches or messaging.

---

## What

**As a** logged-in user with an analyzed profile  
**I want to** like a match from the match detail page  
**So that** my interest is recorded and I can move on to other matches

### Acceptance criteria

- [x] **Like button** on match detail (`/dating/me-matches/[id]`) — `:id` is candidate `UserProfile.id`
- [x] **POST** `/api/v1/me/matches/:id/actions` with `{ "action": "LIKE" }` creates or updates action
- [x] **User-to-user identity** — row keyed by `actorUserId` (session user) + `targetUserId` (candidate's `User.id`), not profile id alone
- [x] **Profile snapshot** — persist `targetProfileIdSnapshot` = `:id` from the request (reference at action time only)
- [x] **One action per user pair** — `@@unique([actorUserId, targetUserId])`; upsert on conflict
- [x] **Idempotent** — liking again stays LIKE, no duplicate error
- [x] **Auth** — 401 without session
- [x] **Validation** — 404 if target profile missing; 400 if `targetUserId` equals `actorUserId` (self)
- [x] **UI feedback** — after like: button disabled or replaced with “You liked this person” (neutral copy)
- [x] **Tests** — API integration test + UI test for like flow

### Out of scope (this story)

- Pass, block, undo
- Mutual match / conversation
- Badges on match list (Story 3)
- Notifications
- **Persisted liked state after page refresh** (Story 3 — GET action state)

---

## Technical notes (guidance, not prescriptive)

```prisma
model MatchAction {
  id                      String          @id @default(cuid())
  actorUserId             String
  targetUserId            String
  targetProfileIdSnapshot String
  action                  MatchActionType
  createdAt               DateTime        @default(now())

  @@unique([actorUserId, targetUserId])
  @@index([actorUserId, action])
  @@index([targetUserId, action])
}

enum MatchActionType {
  LIKE
  PASS
  BLOCK
}
```

- **Resolve on write:** `POST .../matches/:profileId/actions` → load profile by id → set `targetUserId = profile.userId`, `targetProfileIdSnapshot = profile.id`, `actorUserId = session.userId`
- Enum: `LIKE | PASS | BLOCK` (only LIKE used in this story)
- New module or extend `me-profile`: service + controller under `/api/v1/me/matches/:id/actions`
- Reuse `AuthGuard` pattern from existing me endpoints (not SessionGuard)
- UI: extend `dating-ui/src/app/dating/me-matches/[id]/page.tsx` + `me-profile-api.ts`

---

## Definition of done

- [x] Prisma schema + migration applied locally (user-to-user unique constraint)
- [x] POST actions endpoint resolves profile → `targetUserId` + snapshot
- [x] Match detail UI: Like control + in-progress/success/error states
- [x] API tests (happy path, 401, 404, self-target by user id)
- [x] UI test (click like → feedback shown)
- [ ] Manual smoke: refresh page shows liked state — **deferred to Story 3** (DB persists; UI does not re-fetch yet)

---

## Manual smoke

1. Log in, open Matches → open a match detail  
2. Click **Like**  
3. See confirmation state (“You liked this person”)  
4. Network tab: POST returns 201; DB row has `actorUserId`, `targetUserId`, `targetProfileIdSnapshot`  
5. *(Story 3)* Refresh page — liked state should still show
