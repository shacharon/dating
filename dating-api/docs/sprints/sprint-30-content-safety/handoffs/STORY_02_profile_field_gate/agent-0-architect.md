# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_profile_field_gate.md](../../STORY_02_profile_field_gate.md)  
**Sprint:** sprint-30-content-safety  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Wire Story 1 client into profile create/patch. **Skip Agent 4** (extend existing unit + HTTP integration mocks; no live OpenAI).

---

## Summary

- Gate **`aboutMe` / `aboutPartner` / `aboutRelationship`** on `MeProfileService.createForUser` + `patchForUser` via **`OpenAIModerationClient`** (Story 1 — there is **no** `ContentModerationService`).
- Pre-check **`profile_edit_blocked`** → **403**; flagged content → record violation → **400**; after **≥3** profile-surface violations → set `contentViolationStatus = 'profile_edit_blocked'` (still return **400** on that request; **403** on later attempts).
- Respect **`isContentModerationEnabled()`** and **fail-open**.
- Extend **`getViolationCount`** with optional **`surfacePrefix`** (Story 1 deferred this to Story 04; Story 2 needs it for strikes — lock it here, Story 04 consolidates further).

**Out of scope:** message gate (Story 03), `submitForUser`, account scrub, admin unblock (Story 05), full `enforceViolationThreshold` API (Story 04 may absorb status writes).

---

## Artifacts

| Path | Change |
|------|--------|
| `src/me-profile/me-profile.module.ts` | import `ContentModerationModule` |
| `src/me-profile/me-profile.service.ts` | inject client + violation service; gate create/patch |
| `src/me-profile/me-profile.service.spec.ts` | unit: flagged → 400; 3rd strike → status; blocked → 403; fail-open/clean; flag off |
| `src/me-profile/me-profile-http.integration.spec.ts` | HTTP 400 / 403 / clean save; mock moderation |
| `src/content-moderation/content-violation.service.ts` (+ spec) | add `surfacePrefix` option to `getViolationCount` |
| `src/logging/error-codes.ts` | add flagged / profile-blocked codes |

**Do not** invent `content-moderation.service.ts`.

---

## Decisions (do not reverse without discussion)

### 1. Injectables + module (locked)

```ts
// MeProfileModule.imports
ContentModerationModule

// MeProfileService constructor (append)
private readonly moderation: OpenAIModerationClient,
private readonly contentViolations: ContentViolationService,
```

- Import types/helpers from `content-moderation/` (`isContentModerationEnabled`, `ContentViolationSurface`).
- Story doc name `ContentModerationService` is **stale** — use `OpenAIModerationClient.checkContent`.

### 2. Hook points (locked)

| Method | Gate? | Placement |
|--------|-------|-----------|
| `createForUser` | **Yes** | After `profile_already_exists` conflict check; **before** nickname / `$transaction` |
| `patchForUser` | **Yes** | After `profile_not_found`; **before** onboarding assert / writable build / `$transaction` |
| `submitForUser` | **No** | Does not write about* text |
| Account scrub / evaluate / admin | **No** | Not user profile edit |

**Blocked short-circuit applies to any create/patch** (including preference-only PATCH) so a blocked user cannot edit anything via these endpoints.

**Order when flag enabled:**

```text
1. assertProfileEditAllowed(userId)     // 403 if profile_edit_blocked
2. moderateProfileTextFields(userId, body)  // 400 if flagged
3. existing create/patch logic…
```

### 3. Feature flag (locked)

```ts
if (!isContentModerationEnabled()) {
  // skip assert + moderation entirely (local/dev escape hatch)
  return;
}
```

When **disabled**: no 403 from content status, no API calls, no recordings. When **enabled**: full gate.

### 4. Fail-open (locked)

If `result.failOpen === true` → treat field as **clean** (do not record, do not 400). Log already emitted by client with `CONTENT_MODERATION_FAIL_OPEN`.

### 5. Which fields / when to check (locked)

Surfaces (exact Story 1 union):

| DTO field | `surface` |
|-----------|-----------|
| `aboutMe` | `profile_aboutMe` |
| `aboutPartner` | `profile_aboutPartner` |
| `aboutRelationship` | `profile_aboutRelationship` |

Rules:

- Check only fields **present** on the body (`!== undefined`).
- Skip if value is `null` or `trim()` is empty (allow clear / whitespace-only without API).
- Check **sequentially**; on first flagged field → record + maybe block status → throw (**do not** moderate remaining fields on that request).
- PATCH with no about* keys → skip moderation loop (still run blocked assert when flag on).

### 6. HTTP error shapes (locked)

Match existing `{ error, message }` style (`onboarding_texts_incomplete`, etc.). Use `markHttpExceptionObservabilityLogged` where peers do.

**400 — flagged (including the 3rd strike on that request):**

```json
{
  "error": "content_moderation_failed",
  "message": "Your profile contains inappropriate content",
  "details": {
    "field": "aboutMe",
    "category": "sexual",
    "suggestion": "Please rephrase without explicit or harmful content"
  }
}
```

- `field`: DTO key (`aboutMe` | `aboutPartner` | `aboutRelationship`), **not** the surface string.
- `category`: `result.primaryCategory ?? result.categories[0] ?? 'unknown'`.

**403 — already blocked (pre-flight):**

```json
{
  "error": "profile_edit_blocked",
  "message": "Profile editing is currently restricted due to previous content violations"
}
```

Use `ForbiddenException` / `BadRequestException` accordingly. Do **not** change Nest’s default status mapping.

### 7. Violation + 3-strike (locked)

On flagged:

1. `recordViolation({ userId, surface, flaggedText: trimmedText, category, score: result.score, action: 'blocked' })`.
2. Count profile strikes:

```ts
const profileViolations = await this.contentViolations.getViolationCount(userId, {
  surfacePrefix: 'profile_',
});
```

3. If `profileViolations >= 3`:

```ts
await this.prisma.user.update({
  where: { id: userId },
  data: { contentViolationStatus: 'profile_edit_blocked' },
});
```

**Do not** overwrite `contentViolationCount` here — `recordViolation` already increments it.

4. Then throw **400** (same shape). Next create/patch → **403**.

**`getViolationCount` extension (Story 2):**

```ts
getViolationCount(
  userId: string,
  options?: { surface?: string; surfacePrefix?: string; since?: Date },
): Promise<number>
```

- `surface` → exact match (unchanged).
- `surfacePrefix` → Prisma `surface: { startsWith: surfacePrefix }`.
- If both provided → **prefer exact `surface`** (ignore prefix). Document in JSDoc.
- Unit-test the prefix path in `content-violation.service.spec.ts`.

**Block check:** use `contentViolations.getUserViolationStatus(userId)` and compare `status === 'profile_edit_blocked'` (do not invent a parallel prisma select unless needed).

### 8. Observability (locked)

Add to `error-codes.ts` (Story 1 already has CHECK / FAIL_OPEN / RECORDED):

| Code | When |
|------|------|
| `CONTENT_MODERATION_FLAGGED` | After deciding to reject a field (before or after record; include `field`, `category`, `userId`; **no raw text**) |
| `CONTENT_PROFILE_EDIT_BLOCKED` | Pre-flight 403 short-circuit |
| `CONTENT_USER_BLOCKED` | When transitioning status → `profile_edit_blocked` (3rd strike) |

Optional: `CONTENT_MODERATION_CHECK` per field is noisy — **prefer** only flagged / fail-open / recorded / blocked transitions.

### 9. Helper shape (locked)

Private methods on `MeProfileService` (Story 04 may move enforcement later):

```ts
private async assertProfileEditAllowed(userId: string): Promise<void>
private async moderateProfileTextFields(
  userId: string,
  body: Pick<CreateMeProfileDto | PatchMeProfileDto, 'aboutMe' | 'aboutPartner' | 'aboutRelationship'>,
): Promise<void>
```

Keep logic out of the controller / validation pipe.

### 10. Tests (locked)

| Spec | Must cover |
|------|------------|
| `me-profile.service.spec.ts` | Flagged → BadRequest + record; clean → no throw; failOpen → proceed; flag off → no moderation calls; status blocked → Forbidden; 3rd profile violation → updates `contentViolationStatus` |
| `content-violation.service.spec.ts` | `surfacePrefix: 'profile_'` filters |
| `me-profile-http.integration.spec.ts` | PATCH/POST flagged aboutMe → **400** + `error: content_moderation_failed` + `details.field`; blocked user → **403** + `profile_edit_blocked`; clean text still **201/200** and prisma write called |

Wire Nest testing module with mocks for `OpenAIModerationClient` + `ContentViolationService` (or override providers). **No live OpenAI.**

Update `MeProfileService` constructor call sites in unit specs.

### 11. Agent 4

**Skip.**

---

## Runtime topology

```text
POST/PATCH /api/v1/me/profile
  → MeProfileService.createForUser | patchForUser
       → isContentModerationEnabled?
            no  → existing logic
            yes → getUserViolationStatus
                  → profile_edit_blocked? → 403 CONTENT_PROFILE_EDIT_BLOCKED
                  → for each non-empty about* in body:
                       checkContent(text)
                       → failOpen / not flagged → continue
                       → flagged → recordViolation(surface=profile_*)
                                → count surfacePrefix 'profile_'
                                → if ≥3 set status profile_edit_blocked + CONTENT_USER_BLOCKED
                                → 400 content_moderation_failed
       → existing create/patch persistence
```

---

## Open questions / blockers

- None blocking Agent 1.
- Unblock UX → Story 05. Until then, blocked users need ops/DB or admin later.
- Story 04 may centralize status writes into `enforceViolationThreshold`; duplicate status update here is **acceptable** for Story 2 and may be refactored then.

---

## Next agent

```text
--agent 1 sprint 30 story 2
```

**Notes for next agent:**

1. Import `ContentModerationModule` into `MeProfileModule`; inject `OpenAIModerationClient` + `ContentViolationService`.
2. Add `surfacePrefix` to `getViolationCount` before wiring the 3-strike check.
3. Gate **only** `createForUser` / `patchForUser`.
4. Fail-open and flag-off must not block saves.
5. Commit with story message; write `agent-1-dev.md`.
