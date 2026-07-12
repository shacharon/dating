# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_photo_gate_profile_completeness.md](../../STORY_02_photo_gate_profile_completeness.md)  
**Sprint:** sprint-09-product-mvp  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Photo gate (API)** — viewer must have ≥1 `APPROVED` `UserProfilePhoto` before match list returns `status: 'ready'`; new `not_ready` reason **`no_photo`**.
- **Submit gate (API)** — `POST /api/v1/me/profile/submit` returns **422** `{ error: 'photo_required' }` when no approved photo (same pattern as `gender_required`).
- **Defense in depth** — mirror viewer photo check in `getById`, `assertMatchCandidateVisible` (blocks detail + like/pass/block when viewer lost their last photo).
- **Shared helper** — `countApprovedPhotosForProfile()` in new `me-profile-photo-gate.ts`; used by list, submit, and visibility asserts.
- **Analytics** — new product event **`profile.photo_gate_blocked`** with `{ surface: 'match_list' | 'submit' }`; **do not** emit `match.list_viewed` on `not_ready` (Sprint 7 rule unchanged).
- **UI** — `/dating/me-matches` redirects `no_photo` → **`/dating/profile`**; profile page **amber banner** when 0 approved photos; onboarding **required-for-matching** copy on photo section; optional **non-blocking completeness checklist** on profile page only.
- **No migration** — existing `ANALYZED` users without photos get `not_ready(no_photo)` until upload (ops note, not a schema change).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-profile-photo-gate.ts` | **created** — `countApprovedPhotosForProfile`, `viewerHasApprovedPhoto` |
| `dating-api/src/me-profile/me-profile-photo-gate.spec.ts` | unit tests for helper |
| `dating-api/src/me-profile/me-matches.service.ts` | `list()` gate after `ANALYZED`; extend `reason` union; photo check in `getById` + `assertMatchCandidateVisible` |
| `dating-api/src/me-profile/me-matches.service.spec.ts` | `not_ready(no_photo)`; visibility 404 when viewer has no photo |
| `dating-api/src/me-profile/me-profile.service.ts` | `submitForUser()` photo gate + analytics on block |
| `dating-api/src/me-profile/me-profile.service.spec.ts` | submit → 422 `photo_required` |
| `dating-api/src/me-profile/me-profile-http.integration.spec.ts` | HTTP 200 `not_ready/no_photo`; HTTP 422 submit |
| `dating-api/src/me-profile/me-profile.controller.ts` | JSDoc: document `no_photo` reason |
| `dating-api/src/analytics/product-analytics.events.ts` | `PROFILE_PHOTO_GATE_BLOCKED: 'profile.photo_gate_blocked'` |
| `dating-api/src/logging/error-codes.ts` | optional `ME_PROFILE_PHOTO_REQUIRED` for submit rejection trace |
| `dating-api/docs/analytics/PRODUCT_FUNNEL.md` | document new event |
| `dating-api/docs/MATCH_ENGINE_V1_CONTRACT.md` | guards table: `no_photo` row |
| `dating-api/docs/MATCH_ENGINE_DEEP_DIVE.md` | same guard row |
| `dating-ui/src/lib/me-profile-api.ts` | extend `MeMatchesListDto.reason` with `'no_photo'` |
| `dating-ui/src/lib/me-profile-api.spec.ts` | parse `no_photo` dto |
| `dating-ui/src/app/dating/me-matches/page.tsx` | redirect `no_photo` → `/dating/profile` |
| `dating-ui/src/app/dating/me-matches/page.spec.tsx` | redirect test for `no_photo` |
| `dating-ui/src/components/photo-gate-banner.tsx` | **created** — amber banner when 0 approved photos |
| `dating-ui/src/components/profile-completeness-hints.tsx` | **created** — non-blocking checklist |
| `dating-ui/src/components/profile-photo-section.tsx` | add `id="profile-photos"` anchor; optional `requiredForMatching?: boolean` helper copy |
| `dating-ui/src/components/onboarding-basic-form.tsx` | `<ProfilePhotoSection requiredForMatching />` |
| `dating-ui/src/app/dating/profile/page.tsx` | banner + completeness hints |
| `dating-ui/src/lib/i18n/types.ts`, `en.ts`, `es.ts` | `photoGate`, `profileCompleteness` copy |
| `dating-ui/src/components/photo-gate-banner.spec.tsx` | banner visible/hidden |
| `dating-ui/src/components/profile-completeness-hints.spec.tsx` | checklist rows |

**No changes:** Prisma schema, `.env.example` (no new env vars — contract docs only per DoD), candidate-side photo filtering (explicit out of scope).

---

## Decisions (do not reverse without discussion)

### 1. Gate order in `MeMatchesService.list()`

Check order (unchanged for first two; insert photo gate **third**, before expensive eval/candidate work):

| Step | Condition | Response |
|------|-----------|----------|
| 1 | No `UserProfile` | `{ status: 'not_ready', reason: 'no_profile' }` |
| 2 | `status !== ANALYZED` | `{ status: 'not_ready', reason: 'not_analyzed' }` |
| 3 | **Approved photo count &lt; 1** | `{ status: 'not_ready', reason: 'no_photo' }` |
| 4 | … | `{ status: 'ready', matches: [...] }` |

Implementation sketch:

```typescript
const approvedPhotoCount = await countApprovedPhotosForProfile(this.prisma, viewer.id);
if (approvedPhotoCount < 1) {
  this.obs.trace(
    `me matches list: no approved photo profileId=${viewer.id} userId=${userId}`,
    ErrorCodes.ME_MATCHES_LIST_NOT_READY,
  );
  this.analytics.track(userId, ProductAnalyticsEvents.PROFILE_PHOTO_GATE_BLOCKED, {
    surface: 'match_list',
  });
  return { status: 'not_ready', reason: 'no_photo' };
}
```

**Rationale:** Cheap `count` query before `latestEvaluationForProfile` + candidate scan. Users who are `ANALYZED` but photo-less (legacy dev data) get `no_photo`, not `not_analyzed`.

---

### 2. Shared photo gate helper

New file `me-profile-photo-gate.ts` (not inline duplicates):

```typescript
export async function countApprovedPhotosForProfile(
  prisma: Pick<PrismaService, 'userProfilePhoto'>,
  profileId: string,
): Promise<number> {
  return prisma.userProfilePhoto.count({
    where: { profileId, status: UserProfilePhotoStatus.APPROVED },
  });
}

export async function viewerHasApprovedPhoto(
  prisma: Pick<PrismaService, 'userProfilePhoto'>,
  profileId: string,
): Promise<boolean> {
  return (await countApprovedPhotosForProfile(prisma, profileId)) >= 1;
}
```

Call sites: `MeMatchesService.list`, `MeMatchesService.getById`, `MeMatchesService.assertMatchCandidateVisible`, `MeProfileService.submitForUser`.

---

### 3. API contract — `not_ready` reason union

Extend everywhere the list DTO is defined or mirrored:

```typescript
reason?: 'no_profile' | 'not_analyzed' | 'no_photo';
```

Semantics:

| Reason | Meaning |
|--------|---------|
| `no_profile` | No `UserProfile` row |
| `not_analyzed` | Profile exists; `status !== ANALYZED` |
| `no_photo` | Profile `ANALYZED` but zero `APPROVED` photos |

HTTP: still **200** on `GET /api/v1/me/matches` (same as existing `not_ready` reasons).

Update `MATCH_ENGINE_V1_CONTRACT.md` §6 and `MATCH_ENGINE_DEEP_DIVE.md` guards table.

---

### 4. Submit gate — `POST /api/v1/me/profile/submit`

Insert **after** gender validation, **before** status transition to `SUBMITTED`:

```typescript
if (!(await viewerHasApprovedPhoto(this.prisma, existing.id))) {
  this.obs.error(
    `me profile submit rejected: no approved photo profileId=${existing.id}`,
    ErrorCodes.ME_PROFILE_PHOTO_REQUIRED, // new code, or reuse SUBMIT_INVALID_STATE — prefer dedicated code
  );
  this.analytics.track(userId, ProductAnalyticsEvents.PROFILE_PHOTO_GATE_BLOCKED, {
    surface: 'submit',
  });
  throw new UnprocessableEntityException({
    error: 'photo_required',
    message: 'Upload at least one approved photo before submitting for analysis.',
  });
}
```

| Rejected alternative | Verdict |
|---------------------|---------|
| `no_approved_photo` | Rejected — inconsistent with `gender_required` noun pattern |
| Allow submit without photo; gate only on list | **Rejected** — story AC requires submit 422 |
| **`photo_required`** | **Chosen** |

Manual smoke AC #1: user skips photo → **submit fails 422**, not silent success.

---

### 5. Detail + actions — mirror viewer photo gate

After `viewer.status === ANALYZED` check in **`getById`** and **`assertMatchCandidateVisible`**:

```typescript
if (!(await viewerHasApprovedPhoto(this.prisma, viewer.id))) {
  throw new NotFoundException(
    'Your profile is not ready for matching. Add at least one photo first.',
  );
}
```

| Approach | Verdict |
|----------|---------|
| Only gate `list()` | Rejected — direct URL to match detail / actions bypass |
| 403 with explicit code | Rejected — inconsistent with existing not-ready detail semantics |
| **404-style `NotFoundException`** | **Chosen** — matches unanalyzed viewer today |

`MeMatchActionsService` already calls `assertMatchCandidateVisible` → like/pass/block auto-blocked when viewer has no photo.

---

### 6. Analytics vs observability

| Channel | When | Payload |
|---------|------|---------|
| Product analytics | `list()` returns `no_photo` | `profile.photo_gate_blocked` `{ surface: 'match_list' }` |
| Product analytics | `submit` rejected | `profile.photo_gate_blocked` `{ surface: 'submit' }` |
| Product analytics | `list()` returns `ready` | **`match.list_viewed`** unchanged (only on ready) |
| Ops trace | list `no_photo` | `ME_MATCHES_LIST_NOT_READY` (message includes `no_photo`) |
| Ops error | submit blocked | `ME_PROFILE_PHOTO_REQUIRED` |

**Do not** extend `match.list_viewed` with `blockedReason` — Sprint 7 locked no analytics on `not_ready` list responses; separate event keeps funnel semantics clean.

Update `PRODUCT_FUNNEL.md` with event + surfaces.

---

### 7. UI — `/dating/me-matches` redirect

Replace binary redirect with three-way guard:

```typescript
if (dto.status === 'not_ready') {
  if (dto.reason === 'no_profile') router.replace('/onboarding');
  else if (dto.reason === 'no_photo') router.replace('/dating/profile');
  else router.replace('/dating/analysis'); // not_analyzed
  return;
}
```

| Reason | Destination | Rationale |
|--------|-------------|-----------|
| `no_profile` | `/onboarding` | unchanged |
| `not_analyzed` | `/dating/analysis` | unchanged |
| **`no_photo`** | **`/dating/profile`** | User may already be `ANALYZED`; analysis page is wrong surface |

No dedicated nudge route — profile page banner satisfies AC.

---

### 8. UI — profile page surfaces

**`PhotoGateBanner`** (new component):

- Client component; calls `listMyProfilePhotos()` on mount.
- Visible when zero photos with `status === 'APPROVED'`.
- Copy (i18n): **"Add a photo to see matches"** with optional link `#profile-photos`.
- Placement: below page title, above `NotificationPreferencesSection`.

**`ProfileCompletenessHints`** (new component):

- **Non-blocking** checklist only — no submit/disable behavior.
- Placement: profile page, after banner, before Matching section.
- Rows (✓ / ○):

| Row | Complete when |
|-----|----------------|
| Photo | ≥1 `APPROVED` photo (from `listMyProfilePhotos`) |
| Basics | `birthDate` set; `gender` set and ≠ `PREFER_NOT_TO_SAY`; ≥1 `desiredPartnerGenders` |
| Story | `aboutMe`, `aboutPartner`, `aboutRelationship` each `trim().length > 0` |

Props: pass `draft: ProfileDraft` from profile page for basics/story; component fetches photos internally.

**Do not** add checklist to `/dating/analysis` — keeps analysis focused on re-run flow.

---

### 9. UI — onboarding nudge

In `onboarding-basic-form.tsx`:

```tsx
<ProfilePhotoSection requiredForMatching />
```

When `requiredForMatching === true`, show helper under "Photos" heading (i18n):

> At least one photo is required before you can see matches.

No submit blocking in onboarding UI — API enforces on submit.

---

### 10. `ProfilePhotoSection` anchor

Add `id="profile-photos"` on the section root for banner deep-link. No separate route/query param (`?photo=required` not required).

---

### 11. Existing users / ops note

No backfill. Users with `ANALYZED` profile and 0 photos:

- `GET /me/matches` → `200 { status: 'not_ready', reason: 'no_photo' }`
- Upload stub-approved photo → next list call can return `ready` (if other gates pass)

Document in story manual smoke + agent 3 closeout; no migration script.

---

### 12. Out of scope (confirmed)

- Hiding photo-less **candidates** from others' lists
- Requiring N&gt;1 photos (min 1, max 3 unchanged)
- Real moderation / rejecting low-quality photos
- Blocking profile text saves without photo

---

## Runtime topology

| Item | Value |
|------|--------|
| Photo upload | Existing `POST /api/v1/me/profile/photos` — stub auto-`APPROVED` |
| Gate counts | `UserProfilePhoto.status = APPROVED` only (`PENDING`/`REJECTED` do not satisfy) |
| Delete last photo | Existing delete endpoint; next `list()` → `no_photo` |
| Env vars | None new |

---

## Tests / verification

**API**

- [ ] `me-profile-photo-gate.spec.ts` — count helper
- [ ] `me-matches.service.spec.ts` — `list()` → `not_ready/no_photo`; no `match.list_viewed` analytics call; `profile.photo_gate_blocked` fired
- [ ] `me-matches.service.spec.ts` — `getById` / `assertMatchCandidateVisible` 404 when viewer has no photo
- [ ] `me-profile.service.spec.ts` — submit 422 `photo_required`; analytics on block
- [ ] `me-profile-http.integration.spec.ts` — HTTP integration for list + submit

**UI**

- [ ] `me-profile-api.spec.ts` — `no_photo` reason typed
- [ ] `me-matches/page.spec.tsx` — mock `fetchMyMatches` → `no_photo`, assert `router.replace('/dating/profile')`
- [ ] `photo-gate-banner.spec.tsx` — shown/hidden by approved count
- [ ] `profile-completeness-hints.spec.tsx` — row states
- [ ] Commands: `cd dating-api && npm test -- --testPathPattern="me-profile-photo-gate|me-matches.service|me-profile.service"`; `cd dating-ui && npm test`

**Manual smoke (story file)**

1. Onboarding texts, no photo → submit **422** → navigate matches → lands on profile with banner  
2. Upload photo → analyzed → matches **ready**  
3. Delete last photo → matches **not_ready(no_photo)**

---

## Open questions / blockers

- None blocking agent 1.

Optional polish (not blocking DoD): hide "Find matches" link on profile page when `no_photo` (banner already explains); dev may ship banner-only first.

---

## Next agent

```text
--agent 1 sprint 9 story 2
```

**Notes for next agent:**

1. Implement `me-profile-photo-gate.ts` first; wire list + submit; then visibility asserts.
2. Extend DTO unions in API + `me-profile-api.ts` in same PR.
3. UI redirect is a one-line branch change — do immediately after API types.
4. Fire `profile.photo_gate_blocked` only on blocked paths (not on every profile page view).
5. Run targeted API specs then full UI suite before `--agent 2`.
