# Handoff: Agent 0 — Architect — Story 2

**Agent:** 0 architect  
**Story:** [STORY_02_onboarding_forms_i18n.md](../../STORY_02_onboarding_forms_i18n.md)  
**Sprint:** sprint-13-product-ux-polish  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **No Prisma / migration / API changes** — Story 2 is **UI i18n only** for onboarding form chrome.
- Wire **`onboarding-basic-form.tsx`** (~40 strings) and **`onboarding-texts-form.tsx`** (~20 strings) to `getCopy(locale)`.
- Add a **shared root `gender`** namespace (5 enum labels including `PREFER_NOT_TO_SAY`); onboarding forms use it. **`matchPreferences.partnerGender` stays unchanged** in Story 2 (avoid cross-file refactor).
- Use **`useAppLocale()`** in both forms (align with Sprint 12 pages). **`onboarding-page-heading.tsx`** already i18n — verify-only; do not refactor heading to `useAppLocale` in this story.
- **Verify-only (already localized):** `ProfilePhotoSection` on basic form, page headings.
- **Out of scope:** `onboarding-index-redirect.tsx` (“Loading…”), Story 3 profile page, page metadata titles, API error message localization.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/i18n/types.ts` | updated — extend `onboarding.*`, add root `gender` |
| `dating-ui/src/lib/i18n/en.ts` | updated — full EN strings |
| `dating-ui/src/lib/i18n/es.ts` | updated — mirror EN |
| `dating-ui/src/lib/i18n/he.ts` | updated — mirror EN |
| `dating-ui/src/components/onboarding-basic-form.tsx` | updated — remove local `genderLabel`, use `copy` |
| `dating-ui/src/components/onboarding-texts-form.tsx` | updated — use `copy` |
| `dating-ui/src/components/onboarding-basic-form.spec.tsx` | created — agent 2 |
| `dating-ui/src/components/onboarding-texts-form.spec.tsx` | created — agent 2 |
| `dating-ui/src/components/onboarding-page-heading.tsx` | verify-only |
| `dating-ui/src/components/profile-photo-section.tsx` | verify-only (on basic form) |

**No changes:** `dating-api/*`, match preferences form, profile review page

---

## Decisions (do not reverse without discussion)

### 1. Scope — two form components only

| Surface | Story 2 |
|---------|---------|
| `onboarding-basic-form.tsx` | **In scope** |
| `onboarding-texts-form.tsx` | **In scope** |
| `onboarding-page-heading.tsx` | Verify-only (done Sprint 12) |
| `ProfilePhotoSection` | Verify-only |
| `onboarding-index-redirect.tsx` | Out of scope |
| `onboarding-draft-form.tsx` | Out of scope (unused in routes) |
| Refactor `match-preferences-form` to shared `gender` | Out of scope |

---

### 2. Locale integration pattern

**Use `useAppLocale()`** at top of each form:

```tsx
const { copy } = useAppLocale();
const ob = copy.onboarding;
const genderCopy = copy.gender;
```

Remove the local `genderLabel()` helper in basic form; render options/checkboxes with `genderCopy[g]`.

**Error display (Sprint 12 pattern):**

| Case | Display |
|------|---------|
| API / network `Error` with message | Show `e.message` as today |
| Generic catch fallback | Localized `copy.onboarding.loadFailed` / `saveFailed` / etc. |
| Client validation | Localized keys below — never hardcoded English |

---

### 3. Copy schema (frozen keys)

#### Root `gender` (new — shared enum labels)

| Key | EN | Used by |
|-----|----|---------|
| `gender.MALE` | Male | Basic form select + partner checkboxes |
| `gender.FEMALE` | Female | ↑ |
| `gender.NON_BINARY` | Non-binary | ↑ |
| `gender.OTHER` | Other | ↑ |
| `gender.PREFER_NOT_TO_SAY` | Prefer not to say | Basic form select only |

Hebrew/Spanish: natural translations; HE must stay consistent with existing `matchPreferences.partnerGender` wording for the four partner values.

#### `onboarding` — shared form chrome (new)

| Key | EN |
|-----|-----|
| `onboarding.syncingProfile` | Syncing profile… |
| `onboarding.loadFailed` | Failed to load profile |
| `onboarding.saveFailed` | Save failed |
| `onboarding.savedFlash` | Saved. |
| `onboarding.saveProgress` | Save progress |
| `onboarding.continueLater` | Continue later |

#### `onboarding.basicForm` (new)

| Key | EN | Maps from current string |
|-----|----|--------------------------|
| `sectionTitle` | Basics | h2 |
| `googleNameLabel` | Google name | |
| `googleNameHelp` | From your Google account (read-only). Use nickname below for how you appear here. | |
| `nicknameLabel` | Nickname | |
| `nicknamePlaceholder` | How you want to be called | |
| `birthDateLabel` | Birth date | |
| `ageDisplay` | `(age: number) => \`Age: ${age}\`` | replaces `Age: {n}` |
| `genderLabel` | Gender | field label |
| `genderSelectPlaceholder` | — Select — | empty `<option>` |
| `partnerGendersLegend` | Open to matching with | fieldset legend (before hint span) |
| `partnerGendersRequiredHint` | (required to continue) | `<span>` in legend |
| `partnerGendersRequiredError` | Choose at least one gender you are open to matching with before continuing. | `partnerError` |
| `genderRequiredError` | `(preferNotToSay: string) => string` — EN: `Choose a gender (other than "${preferNotToSay}") before continuing — it is required when you submit for analysis.` | `genderStepError`; pass `copy.gender.PREFER_NOT_TO_SAY` |
| `cityLabel` | City | |
| `cityPlaceholder` | e.g. Tel Aviv | |
| `countryLabel` | Country | |
| `countryPlaceholder` | e.g. IL | |
| `locationLabelLabel` | Location label | |
| `locationLabelPlaceholder` | e.g. Tel Aviv, Israel | |
| `continueToStory` | Continue to story | primary CTA |

#### `onboarding.textsForm` (new)

| Key | EN |
|-----|-----|
| `intro` | A few short paragraphs help us understand you. You can save and come back, or finish to run analysis. |
| `aboutMeLabel` | About me |
| `aboutMePlaceholder` | Describe yourself… |
| `aboutPartnerLabel` | About partner |
| `aboutPartnerPlaceholder` | What you look for in a partner… |
| `aboutRelationshipLabel` | About relationship |
| `aboutRelationshipPlaceholder` | What you want from a relationship… |
| `finishAndAnalyze` | Finish & analyze |
| `submitting` | Submitting… |
| `backToBasics` | Back to basics |
| `genderMissingError` | Go back to basics and choose a gender before submitting for analysis. |
| `verifyFailedError` | Could not verify your profile. Try again. |
| `finishFailedError` | Could not finish onboarding |

**Existing keys (unchanged):** `onboarding.basicsTitle`, `basicsSubtitle`, `storyTitle`, `storySubtitle`

---

### 4. TypeScript shape (add to `types.ts`)

```typescript
gender: {
  MALE: string;
  FEMALE: string;
  NON_BINARY: string;
  OTHER: string;
  PREFER_NOT_TO_SAY: string;
};
onboarding: {
  basicsTitle: string;
  basicsSubtitle: string;
  storyTitle: string;
  storySubtitle: string;
  syncingProfile: string;
  loadFailed: string;
  saveFailed: string;
  savedFlash: string;
  saveProgress: string;
  continueLater: string;
  basicForm: {
    sectionTitle: string;
    googleNameLabel: string;
    googleNameHelp: string;
    nicknameLabel: string;
    nicknamePlaceholder: string;
    birthDateLabel: string;
    ageDisplay: (age: number) => string;
    genderLabel: string;
    genderSelectPlaceholder: string;
    partnerGendersLegend: string;
    partnerGendersRequiredHint: string;
    partnerGendersRequiredError: string;
    genderRequiredError: (preferNotToSay: string) => string;
    cityLabel: string;
    cityPlaceholder: string;
    countryLabel: string;
    countryPlaceholder: string;
    locationLabelLabel: string;
    locationLabelPlaceholder: string;
    continueToStory: string;
  };
  textsForm: {
    intro: string;
    aboutMeLabel: string;
    aboutMePlaceholder: string;
    aboutPartnerLabel: string;
    aboutPartnerPlaceholder: string;
    aboutRelationshipLabel: string;
    aboutRelationshipPlaceholder: string;
    finishAndAnalyze: string;
    submitting: string;
    backToBasics: string;
    genderMissingError: string;
    verifyFailedError: string;
    finishFailedError: string;
  };
};
```

---

### 5. RTL (Hebrew)

- Forms inherit page/shell `dir` from onboarding layout — no per-field `text-left` overrides.
- Fieldset checkbox rows: keep `flex items-center gap-2` (same as match preferences).
- Legend hint span stays inline after legend text (natural RTL flow).

---

### 6. Out of scope (explicit)

| Item | Reason |
|------|--------|
| API validation message translation | Server messages stay English when surfaced via `e.message` |
| `onboarding-index-redirect` loading | Separate micro-story if needed |
| Profile review page (`/dating/profile`) | Story 3 |
| Deduplicate `matchPreferences.partnerGender` → `gender` | Minimize Story 2 diff |

---

## Runtime topology (architect — auth / cookies)

| Item | Value |
|------|--------|
| REST | Unchanged — existing `GET/PATCH /api/v1/me/profile`, `POST` create, analysis submit |
| Locale | `localStorage` + `APP_LOCALE_CHANGE_EVENT` via `useAppLocale()` |
| Expected Network tab | Same profile fetch/patch calls |
| `prisma migrate deploy` | **N/A** |

---

## Tests / verification (agent 1 smoke; agent 2 full)

**New specs (agent 2 — none exist today):**

| File | Minimum coverage |
|------|------------------|
| `onboarding-basic-form.spec.tsx` | Mock `fetchMyProfile` → profile on `/onboarding/basic`; after sync, EN labels (`getByLabelText(enCopy.onboarding.basicForm.nicknameLabel)`); HE via `localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he')` + `heCopy` for section title + save button; partner validation shows localized `partnerGendersRequiredError` |
| `onboarding-texts-form.spec.tsx` | Mock profile on texts step; EN intro + `aboutMeLabel`; HE `finishAndAnalyze` / `backToBasics`; optional finish validation `genderMissingError` |

**Patterns:** Follow `match-preferences-form.spec.tsx` (hoisted mocks, `waitFor` after sync). Do **not** use `toHaveAttribute` — use `.getAttribute()`.

**Commands:**

- [ ] `cd dating-ui && npm test -- src/components/onboarding-basic-form.spec.tsx src/components/onboarding-texts-form.spec.tsx`
- [ ] Full `npm test` gate — baseline **361/361** after Story 13 Story 1
- [ ] `prisma migrate deploy`: N/A

**Manual smoke:**

1. Set locale HE → `/onboarding/basic` → section title, labels, gender options, buttons in Hebrew.
2. Continue to texts → intro + field labels Hebrew; “Finish & analyze” localized.
3. Switch ES mid-flow (nav language) → form chrome updates without reload (locale listener).
4. Trigger partner-gender validation on basic → Hebrew error text.

---

## Acceptance criteria mapping

| Story AC | Implementation |
|----------|----------------|
| All visible chrome i18n | Keys above in both forms |
| Gender labels shared | Root `copy.gender` |
| `he.ts` / `es.ts` complete | Every new key mirrored |
| Component specs EN + HE | Two new spec files |

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 1 sprint 13 story 2
```

**Notes for next agent:**

1. Implement types + en/es/he first, then wire both forms.
2. Delete `genderLabel()`; use `copy.gender`.
3. `genderRequiredError(copy.gender.PREFER_NOT_TO_SAY)` at call site.
4. Keep API error passthrough (`e.message`) for save/load failures.
5. Do not touch match-preferences-form or profile page.
6. Agent 2 adds both spec files + full suite gate.
