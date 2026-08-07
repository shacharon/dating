# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_chapter_intent_routing.md](../../STORY_05_chapter_intent_routing.md)  
**Sprint:** sprint-44-teaser-modes  
**Date:** 2026-08-06  
**Status:** complete  

---

## Summary

- Persist viewer **dating chapter** on `UserProfile.datingChapter` (nullable Prisma enum = `TeaserMode` values).
- **Server resolves mode** and builds `teaser` with that mode on match list/detail (not client layout picking). Age proxy only when chapter unset; else default `first_chapter`.
- Expose chapter on GET/PATCH `/api/v1/me/profile` only — **never** on other users’ match/public DTOs.
- Onboarding: one low-friction radio group on **basic form**; Settings: edit section (notifications pattern). Invalidate match-list Redis cache when chapter changes so cards re-render without re-login.
- Analytics: `profile.dating_chapter_set`. **Skip Agent 4** (presentation preference only — not eligibility / ranking / match preference dimensions).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | design — `enum DatingChapter` + `UserProfile.datingChapter` |
| `dating-api/prisma/migrations/…` | design — Agent 1 migration |
| `dating-api/src/matches/match-teaser.ts` | design — `resolveTeaserMode`; viewer-aware build helper |
| `dating-api/src/me-profile/me-matches.service.ts` | design — resolve mode from viewer; pass into builder |
| `dating-api/src/me-profile/dto/*` + `profile-write.helpers.ts` + CRUD | design — GET/PATCH `datingChapter` |
| `dating-api/src/me-profile/profile/profile-crud.service.ts` | design — invalidate list cache on chapter change |
| `dating-ui` onboarding basic + settings + i18n | design — modeled EN/HE (+ ES parity) |
| `dating-ui` me-profile-api types | design — `datingChapter` |
| QA preview `dating.teaserModePreview` | **keep** as client override for QA (wins over API) |

---

## Decisions (do not reverse without discussion)

### 1. Storage — `UserProfile.datingChapter` nullable enum (locked)

```prisma
enum DatingChapter {
  first_chapter
  ready_again
  new_chapter
}

model UserProfile {
  // ...
  /// Viewer presentation intent for match teasers (Sprint 44). Null = use age proxy.
  datingChapter DatingChapter?
}
```

| Option | Verdict |
|--------|---------|
| **UserProfile.datingChapter** | **Locked** — same write path as `birthDate`; server has it on viewer load |
| UserProfilePreference | Reject — that table is matching eligibility prefs |
| User + dedicated PATCH like notifications | Reject — extra surface; chapter is profile presentation |
| evaluationJson / client-only | Reject — not durable SOT |

Values **identical** to `TeaserMode` strings — no mapping table.

**Privacy (locked):** Omit from `MeMatchItemDto` / detail candidate payloads / any public profile. Only `MeProfileResponseDto` (self) + server-side teaser build.

### 2. Mode resolution — server builds teaser (locked)

Story prefers server. Cards already branch on `teaser.mode` (Stories 2–4).

```ts
/** Pure — chapter wins; age proxy; else first_chapter. */
export function resolveTeaserMode(input: {
  datingChapter: TeaserMode | DatingChapter | null | undefined;
  ageYears: number | null | undefined;
}): TeaserMode {
  const chapter = input.datingChapter;
  if (
    chapter === 'first_chapter' ||
    chapter === 'ready_again' ||
    chapter === 'new_chapter'
  ) {
    return chapter;
  }
  const age = input.ageYears;
  if (age != null && Number.isFinite(age)) {
    if (age <= 34) return 'first_chapter';
    if (age <= 44) return 'ready_again';
    if (age >= 45) return 'new_chapter';
  }
  return 'first_chapter'; // DEFAULT_TEASER_MODE
}
```

**Age source (locked):** viewer `derivedSelfAgeYears` from existing bridge (`buildProductProfileMatchingBridge` / `birthDate`) — same as list already loads. If `birthDate` null → default A.

**Replace** hard-coded `buildDefaultMatchTeaser` at all list/detail call sites (~704, ~1324, ~1392, ~1832 in `me-matches.service.ts`) with:

```ts
const mode = resolveTeaserMode({
  datingChapter: viewer.datingChapter,
  ageYears: viewerAgeYears,
});
teaser: buildMatchTeaser(mode, assembleMatchTeaserFacts(input), 'en');
```

Keep `buildDefaultMatchTeaser` as thin wrapper calling `resolveTeaserMode({ datingChapter: null, ageYears: null })` **or** deprecate and update specs — Agent 1 choice; all production paths must pass viewer context.

`withTeaserScore` still preserves mode — correct after rebuild; do **not** change mode on score-only refresh.

### 3. Cache invalidation (locked)

Cached list rows embed `teaser`. When `datingChapter` changes on PATCH:

1. Persist new value.
2. Call `MeMatchesService.invalidateMatchListCache(userId)` (existing helper).
3. Next list/detail rebuilds teasers with new mode — **no re-login**.

Wire invalidation in `ProfileCrudService.patchForUser` (or facade) when patch includes `datingChapter` **and** value differs from previous (or whenever the key is present — simpler OK).

Do **not** enqueue full rank rebuild solely for chapter change (ranking unchanged).

### 4. API contract (locked)

**No new endpoint.** Extend existing profile DTO:

```ts
// MeProfileResponseDto + writable fields
datingChapter: 'first_chapter' | 'ready_again' | 'new_chapter' | null;

// PATCH /api/v1/me/profile
{ "datingChapter": "ready_again" }  // or null to clear → age fallback
```

Validation: `@IsOptional()` + `@IsIn(['first_chapter','ready_again','new_chapter'])` or Prisma enum; allow `null` to clear.

`CreateMeProfileDto` may accept the same field.

### 5. Onboarding + settings UX (locked)

**One screen, low friction — no new `UserProfileOnboardingStep`.**

| Surface | Behavior |
|---------|----------|
| **Onboarding basic form** | Add radio group (modeled question + helper + 3 choices + optional `new_chapter` subtext). Same PATCH as other basic fields. **Not** required to advance — null allowed (age fallback). |
| **Settings** | New section on profile settings tab (beside notifications): title `Dating chapter` / subtitle `Change how match cards look`. Same PATCH. |
| Existing COMPLETED users | Settings path; age fallback until set |

**Do not** invent age-only chrome that hides the chapter control (“You’re over 45 so Mode C”) — always show chapter picker when editing; age is silent fallback only.

### 6. i18n (locked)

Modeled copy from story (EN + HE). ES schema parity (plain Spanish). Suggested keys under profile/settings/onboarding — Agent 1 may nest under existing copy trees:

| Key | EN | HE |
|-----|----|----|
| question | `Where are you in your dating story?` | `איפה את/ה בסיפור הדייטים שלך?` |
| helper | `This only changes how we present matches — not who we show.` | `זה משנה רק איך מציגים לך התאמות — לא את מי מציגים.` |
| `first_chapter` | `Just starting my chapter` | `בתחילת הדרך` |
| `ready_again` | `Ready again after a long relationship` | `מוכן/ה שוב אחרי מערכת יחסים ארוכה` |
| `new_chapter` | `Building a new chapter` | `בונה פרק חדש` |
| `new_chapter` subtext | `Divorced, separated, or dating again later in life` | `גרוש/ה, פרוד/ה, או חוזר/ת לדייטים בשלב מאוחר יותר` |
| settings title | `Dating chapter` | `פרק הדייטים` |
| settings subtitle | `Change how match cards look` | `לשנות איך נראות כרטיסי ההתאמה` |

**Banned labels:** Younger · Second time (bare) · Old · Mature · Gen Z · Senior · Mature singles · Second chance at love.

### 7. Analytics (locked)

Emit on successful chapter set/change (PATCH that updates `datingChapter`):

```ts
// product analytics / structured log — mirror existing profile events style
{
  event: 'profile.dating_chapter_set',
  dating_chapter: 'first_chapter' | 'ready_again' | 'new_chapter' | null,
}
```

Card `match.card_viewed` + `teaser_mode` already ship — will reflect resolved mode after rebuild.

### 8. QA preview (locked)

Keep `localStorage` `dating.teaserModePreview` as **client display override** (wins in `resolveBrowseTeaserMode`). Does not change API persistence. Useful for side-by-side without PATCH.

### 9. Untouched (locked)

- Ranking scores / eligibility / `UserProfilePreference` partner filters.
- Teaser wording formulas (Story 01).
- Card layout branches (Stories 02–04) — they already switch on `teaser.mode`.
- Agent 4 E2E harness — N/A.

---

## API contract (copy-paste)

```
GET  /api/v1/me/profile
Response: { …existing, datingChapter: 'first_chapter'|'ready_again'|'new_chapter'|null }

PATCH /api/v1/me/profile
Auth: SessionGuard
Request: { datingChapter?: 'first_chapter'|'ready_again'|'new_chapter'|null, … }
Response: MeProfileResponseDto
Side effect: if datingChapter changed → invalidateMatchListCache(userId)

GET /api/v1/me/matches (list) / GET …/me/matches/:id
teaser.mode === resolveTeaserMode(viewer.datingChapter, viewerAgeYears)
```

---

## Service / function signatures

```ts
// match-teaser.ts
resolveTeaserMode({ datingChapter, ageYears }): TeaserMode
// buildMatchTeaser(mode, facts) — unchanged
// call sites stop using DEFAULT-only buildDefaultMatchTeaser without viewer context

// ProfileCrudService.patchForUser
// — persist datingChapter; invalidate list cache when changed

// MeMatchesService list/detail
// — load viewer.datingChapter + age; resolveTeaserMode; buildMatchTeaser(mode, …)
```

---

## Migration plan

1. Add Prisma enum + nullable column (no backfill — null = age fallback).
2. `npx prisma migrate deploy` in Agent 1.
3. Rollback: drop column/enum (teasers revert to always needing default path — keep `resolveTeaserMode` null-safe).

---

## Integration points

| Component | Action |
|-----------|--------|
| Prisma `UserProfile` | `datingChapter` |
| Profile DTO / writable / `toResponse` / repository writes | expose + persist |
| `match-teaser.ts` | `resolveTeaserMode` |
| `me-matches.service.ts` | viewer mode → builder |
| Profile PATCH | cache invalidate |
| Onboarding basic form | radios |
| Profile settings tab | Dating chapter section |
| i18n en/he/es | modeled strings |
| Analytics | `profile.dating_chapter_set` |

---

## Runtime topology

**N/A** for sockets. Schema migration: Agent 1 must run `prisma migrate deploy`. No Next proxy / cookie changes.

---

## E2E verification (agent 4)

**Skip Agent 4** — does not change eligibility gates, preference dimensions used for matching, or rank order. Only teaser packaging. Manual AC owned by Agent 3 (pick each chapter → A/B/C; age fallback when unset).

---

## Tests / verification (plan for Agent 1–2)

- [ ] `resolveTeaserMode` unit matrix: chapter set / age bands / null→A
- [ ] PATCH profile persists `datingChapter`; GET returns it
- [ ] PATCH clears to null → age fallback on next teaser build
- [ ] List/detail teaser.mode matches resolved mode (fixture ages)
- [ ] Chapter change calls `invalidateMatchListCache`
- [ ] Candidate match DTOs do **not** include `datingChapter`
- [ ] Onboarding + settings UI: modeled copy; banned labels absent
- [ ] Analytics event on set
- [ ] Mode A/B/C card regression still green with fixture `teaser.mode`
- [ ] `prisma migrate deploy`: yes (Agent 1)
- [ ] Browser Network: N/A (optional smoke: PATCH then list refresh shows new mode)
- [ ] Socket: N/A

---

## Open questions / blockers

- None. Depends on Stories 01–04 Done (builder + card branches).

---

## Next agent

```text
--agent 1 sprint 44 story 5
```

**Notes for next agent:**

1. Migration + DTO + `resolveTeaserMode` + wire all `buildDefaultMatchTeaser` call sites with viewer context + cache invalidate.
2. Onboarding basic radios + settings section + i18n; do not add onboarding step enum.
3. Do not put chapter on match candidate DTOs; do not change ranking.
4. Suggested commit: `feat(profile): dating chapter intent routes teaser modes A/B/C` / Sprint 44 Story 5.
