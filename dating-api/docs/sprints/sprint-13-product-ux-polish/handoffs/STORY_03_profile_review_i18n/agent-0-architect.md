# Handoff: Agent 0 — Architect — Story 3

**Agent:** 0 architect  
**Story:** [STORY_03_profile_review_i18n.md](../../STORY_03_profile_review_i18n.md)  
**Sprint:** sprint-13-product-ux-polish  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No Prisma / migration / API changes** — Story 3 is **UI i18n only** for `/dating/profile` review page chrome in **`page.tsx`**.
- Add **`profile.viewPage.*`** for page-specific strings; **reuse** existing keys where text is identical (Story 2 + Sprint 12).
- Remove local **`genderDisplay()`**; use root **`copy.gender`** (added in Story 2).
- Use **`useAppLocale()`** on the page (align with Story 2 forms).
- **Verify-only (already localized):** `NotificationPreferencesSection`, `PhotoGateBanner`, `ProfileCompletenessHints`, `ProfilePhotoSection`.
- **Out of scope:** Next.js `metadata` title, API error message localization, deduplicating `matchPreferences.partnerGender` → `copy.gender`.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/i18n/types.ts` | updated — extend `profile.viewPage` |
| `dating-ui/src/lib/i18n/en.ts` | updated |
| `dating-ui/src/lib/i18n/es.ts` | updated |
| `dating-ui/src/lib/i18n/he.ts` | updated |
| `dating-ui/src/app/dating/profile/page.tsx` | updated — remove `genderDisplay`, wire `copy` |
| `dating-ui/src/app/dating/profile/page.spec.tsx` | created — agent 2 |

**No changes:** `dating-api/*`, child components listed above, onboarding forms

---

## Decisions (do not reverse without discussion)

### 1. Scope — single page file

| Surface | Story 3 |
|---------|---------|
| `dating/profile/page.tsx` | **In scope** — all hardcoded strings in this file (~25) |
| Embedded child components | Verify-only (already i18n) |
| `genderDisplay()` local helper | **Remove** — use `copy.gender` |
| Refactor child components to `useAppLocale` | Out of scope |

---

### 2. Locale integration pattern

```tsx
const { copy } = useAppLocale();
const vp = copy.profile.viewPage;
const bf = copy.onboarding.basicForm;
const tf = copy.onboarding.textsForm;
const genderCopy = copy.gender;
```

**Error display (Sprint 12 / Story 2 pattern):**

| Case | Display |
|------|---------|
| API / network `Error` with message | Show `e.message` |
| Generic load fallback | `copy.onboarding.loadFailed` (same EN string as today) |
| Empty field / list values | `copy.profile.viewPage.emptyValue` (`—`) |

---

### 3. Reuse map (do not duplicate strings)

| UI element | Key (frozen) |
|------------|----------------|
| Loading text | `copy.common.loading` |
| Load error fallback | `copy.onboarding.loadFailed` |
| Go to onboarding (no-profile CTA) | `copy.matchPreferences.goToOnboarding` |
| Match prefs help paragraph | `copy.profile.matchPreferencesLinkHelp` (existing) |
| Match prefs link accessible text | `copy.profile.viewPage.matchPreferencesLinkCta(copy.profile.matchPreferencesLink)` |
| Basics section title | `copy.onboarding.basicForm.sectionTitle` |
| Field labels (nickname, birth date, gender, partner genders, city, country, location) | Same `copy.onboarding.basicForm.*Label` keys as onboarding form |
| Story section headings | `copy.onboarding.textsForm.aboutMeLabel` / `aboutPartnerLabel` / `aboutRelationshipLabel` |
| Gender values in `<dd>` | `copy.gender[g]` |
| Partner gender list join | `desiredPartnerGenders.map(g => genderCopy[g]).join(', ')` |

---

### 4. New copy schema — `profile.viewPage` (frozen)

| Key | EN | Used for |
|-----|-----|----------|
| `titleProfile` | Profile | h1 on loading / error / no-profile states |
| `titleReview` | Your profile | h1 when draft loaded |
| `subtitle` | Review your answers before finding matches. | intro paragraph |
| `matchingSectionTitle` | Matching | matching `<section>` h2 |
| `matchPreferencesLinkCta` | `(label: string) => \`${label} →\`` | link text; `label` = `copy.profile.matchPreferencesLink` |
| `backToOnboarding` | Back to onboarding | error-state link |
| `noProfileBody` | You don't have a profile yet. Complete onboarding to review and find matches. | empty-state body |
| `editLink` | Edit | CTA → `/onboarding/basic?edit=1` |
| `findMatchesLink` | Find matches | primary CTA → `/dating/me-matches` |
| `emptyValue` | — | placeholder for missing field values |

**Existing keys (unchanged):** `profile.matchPreferencesLink`, `profile.matchPreferencesLinkHelp`, `profile.notifications.*`

---

### 5. TypeScript shape (add under `profile` in `types.ts`)

```typescript
profile: {
  notifications: { /* unchanged */ };
  matchPreferencesLink: string;
  matchPreferencesLinkHelp: string;
  viewPage: {
    titleProfile: string;
    titleReview: string;
    subtitle: string;
    matchingSectionTitle: string;
    matchPreferencesLinkCta: (label: string) => string;
    backToOnboarding: string;
    noProfileBody: string;
    editLink: string;
    findMatchesLink: string;
    emptyValue: string;
  };
};
```

---

### 6. Implementation notes (`page.tsx`)

1. Delete `genderDisplay()` entirely.
2. Helper for partner line:

```tsx
function formatPartnerGenders(
  genders: string[],
  genderCopy: AppCopySchema['gender'],
  empty: string,
): string {
  if (genders.length === 0) return empty;
  return genders
    .map((g) => genderCopy[g as keyof typeof genderCopy] ?? g)
    .join(', ');
}
```

3. Keep `data-testid="profile-match-preferences-link"` on the preferences link.
4. **`matchPreferencesLinkCta`:** render `{vp.matchPreferencesLinkCta(copy.profile.matchPreferencesLink)}` — preserves AC that core label comes from `profile.matchPreferencesLink`.
5. All four render branches (loading, error, no-profile, review) must use localized h1/CTA copy — loading branch currently repeats hardcoded `"Profile"` three times.

---

### 7. RTL (Hebrew)

- Page inherits authenticated shell `dir` — no new `text-left` overrides.
- Definition lists: keep `flex flex-wrap gap-x-2` on rows (logical start/end).
- Arrow in `matchPreferencesLinkCta`: keep ` →` suffix in all locales for Story 3 (consistent with current EN UX); RTL polish of arrow direction is out of scope.

---

### 8. Out of scope (explicit)

| Item | Reason |
|------|--------|
| `document.title` / Next metadata | Separate story |
| Localizing user-written draft text | User content stays as stored |
| API validation messages | Passthrough `e.message` when present |
| `match-preferences-form` gender dedup | Minimize cross-story diff |

---

## Runtime topology (architect — auth / cookies)

| Item | Value |
|------|--------|
| REST | Unchanged — `GET /api/v1/me/profile` via `resolveEditableProfile()` |
| Locale | `useAppLocale()` + storage event |
| Expected Network tab | Same profile fetch |
| `prisma migrate deploy` | **N/A** |

---

## Tests / verification (agent 1 smoke; agent 2 full)

**New spec (agent 2 — none exists today):**

| File | Minimum coverage |
|------|------------------|
| `profile/page.spec.tsx` | Mock `resolveEditableProfile` → profile with draft fields; after mount: EN `titleReview`, `subtitle`, basics nickname label (`bf.nicknameLabel`), match prefs link (`getByTestId('profile-match-preferences-link')` text contains `enCopy.profile.matchPreferencesLink`); HE via `localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he')` — `heCopy.profile.viewPage.titleReview`, `findMatchesLink` role query |

**Mock strategy:** Hoist `resolveEditableProfile`; stub heavy children if needed (`NotificationPreferencesSection`, `ProfilePhotoSection` photo list fetch) — follow onboarding form specs.

**Patterns:** No `toHaveAttribute` — use `.getAttribute()`.

**Commands:**

- [ ] `cd dating-ui && npm test -- src/app/dating/profile/page.spec.tsx`
- [ ] Full `npm test` gate — baseline **368/368** after Story 13 Story 2
- [ ] `prisma migrate deploy`: N/A

**Manual smoke:**

1. HE locale → `/dating/profile` → title, field labels, CTAs in Hebrew.
2. Gender + partner genders display Hebrew enum labels from `copy.gender`.
3. Match preferences link shows localized label + arrow.
4. No-profile state → localized body + “Go to onboarding” (from `matchPreferences.goToOnboarding`).

---

## Acceptance criteria mapping

| Story AC | Implementation |
|----------|----------------|
| Page title, sections, labels, CTAs localized | `profile.viewPage` + reuse map |
| Match prefs link uses `profile.matchPreferencesLink` | Via `matchPreferencesLinkCta(label)` |
| Gender display uses shared enum copy | `copy.gender` |
| `he.ts` / `es.ts` complete | All new `viewPage` keys mirrored |
| `profile/page.spec.tsx` EN + HE | Agent 2 |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 13 story 3
```

**Notes for next agent:**

1. Extend `types.ts` + three locale files first, then wire `page.tsx`.
2. Delete `genderDisplay()`; use reuse map above — do not duplicate onboarding label strings under `viewPage`.
3. Wire all four render branches (loading/error/empty/review).
4. Agent 2 adds `page.spec.tsx` + full suite gate.
5. Last story in Sprint 13 — PM close completes sprint engineering gate.
