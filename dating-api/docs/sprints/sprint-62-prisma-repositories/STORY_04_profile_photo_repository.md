# Story 04 — Profile Photo Repository

**Sprint:** 62  
**Effort:** 2 days  
**Risk:** ⚡ LOW–MED  
**Status:** Done

---

## Objective

Move `userProfilePhoto` Prisma access out of `ProfilePhotoService` (and admin photos where shared) into a repository, aligned with existing `IUserProfileRepository` family.

---

## Hot call sites

| Service | Path | Notes |
|---------|------|-------|
| Profile photos | `me-profile/profile/profile-photo.service.ts` | ~13 prisma ops |
| Admin photos | `admin/admin-photos/admin-photos.service.ts` | share adapter methods |
| Photo moderation | may still need status updates — prefer repo methods |

Optional stretch: analysis persistence helpers still on `MeProfileAnalysisService` — only if time; else leave for follow-up (already partly on `IUserProfileRepository` via submit path).

---

## Design sketch

```typescript
export const PROFILE_PHOTO_REPOSITORY = Symbol('PROFILE_PHOTO_REPOSITORY');

export interface ProfilePhotoRepository {
  listForProfile(profileId: string): Promise<PhotoRow[]>;
  create(...): Promise<PhotoRow>;
  updateModerationStatus(...): Promise<void>;
  // match methods ProfilePhotoService already uses
}
```

Prefer **sibling** to `IUserProfileRepository`, not a second competing profile aggregate.

---

## Tasks

1. Inventory photo prisma calls.
2. Prisma adapter + Nest token.
3. Migrate `ProfilePhotoService`; reuse from admin where identical.
4. Specs: profile-photo + admin-photos smoke.

---

## Success

- [x] `ProfilePhotoService` without `PrismaService` (also AdminPhotos / PhotoModeration / PhotoSlaEnforcer)
- [x] Soft sprint goal: Prisma injectors down meaningfully (~29 → ≤15 if Stories 01–04 all land) — ~12 `*.service.ts` files still reference `PrismaService`
- [x] Tests green (unit/wiring/admin HTTP; photo visibility pool assertions documented harness noise)

---

## Follow-up

Optional later pass: session/users/admin-match-quality / analysis / legacy matches still on Prisma — not required to close Track 4 MVP.

Optional: fix eligibility harness `matchListRank` readback so `me-new-model-e2e-photo-moderation` pool-appearance cases go fully green.

---

## Shipped

`feature/sprint-62-story-4` @ _(close commit)_

- `b85feca` — feat: profile photo PROFILE_PHOTO_REPOSITORY
- `33bd368` — test: guard profile photo repository wiring
- _(close)_ — chore: close sprint 62 story 4

**Pipeline:** `-1 → 0 → 1 → 2 → 4 → 3`
