# Handoff: Agent 1 — Senior dev — Story 2

**Agent:** 1 dev  
**Story:** [STORY_02_onboarding_forms_i18n.md](../../STORY_02_onboarding_forms_i18n.md)  
**Sprint:** sprint-13-product-ux-polish  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- Wired **`onboarding-basic-form.tsx`** and **`onboarding-texts-form.tsx`** to `useAppLocale()` / `getCopy(locale)`.
- Added root **`copy.gender`** (5 enum labels) and extended **`copy.onboarding`** with shared chrome + `basicForm` / `textsForm` namespaces in `types.ts`, `en.ts`, `he.ts`, `es.ts`.
- Removed local `genderLabel()` helper; gender select + partner checkboxes use `copy.gender`.
- Client validation errors localized; API errors still pass through `e.message` when present.
- **No API / Prisma changes.** `matchPreferences.partnerGender` unchanged per architect scope.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/i18n/types.ts` | updated — `gender` + extended `onboarding` |
| `dating-ui/src/lib/i18n/en.ts` | updated — full EN copy |
| `dating-ui/src/lib/i18n/es.ts` | updated — full ES copy |
| `dating-ui/src/lib/i18n/he.ts` | updated — full HE copy (partner gender labels match existing `matchPreferences.partnerGender`) |
| `dating-ui/src/components/onboarding-basic-form.tsx` | updated — `useAppLocale`, all chrome from copy |
| `dating-ui/src/components/onboarding-texts-form.tsx` | updated — `useAppLocale`, all chrome from copy |
| `dating-ui/src/components/onboarding-basic-form.spec.tsx` | **not created** — agent 2 |
| `dating-ui/src/components/onboarding-texts-form.spec.tsx` | **not created** — agent 2 |

**Verify-only (unchanged):** `onboarding-page-heading.tsx`, `profile-photo-section.tsx`

---

## Decisions (followed from architect)

- `useAppLocale()` in both forms (not inline locale listener)
- `genderRequiredError(copy.gender.PREFER_NOT_TO_SAY)` at validation call site
- Shared buttons (`saveProgress`, `continueLater`, `savedFlash`) under `copy.onboarding`
- Out of scope items left untouched

---

## Runtime topology

| Item | Value |
|------|--------|
| REST | Unchanged — `GET/PATCH /api/v1/me/profile`, create, submit |
| Locale | `useAppLocale()` → `localStorage` + `APP_LOCALE_CHANGE_EVENT` |
| Browser Network smoke | **Deferred** — UI-only string swap; same profile endpoints |
| `prisma migrate deploy` | **N/A** |

---

## Tests / verification

- [x] `cd dating-ui && npm test -- src/lib/i18n/index.spec.ts` — 7/7 pass
- [x] Full `npm test` — **361/361 pass** (no regressions; new form specs still pending agent 2)
- [ ] `onboarding-basic-form.spec.tsx` / `onboarding-texts-form.spec.tsx` — agent 2
- [x] `prisma migrate deploy`: N/A

**Manual smoke (deferred to operator / agent 2):**

1. HE locale → `/onboarding/basic` → section title, labels, gender options, buttons in Hebrew
2. Continue to texts → intro + field labels Hebrew
3. Switch ES mid-flow → form chrome updates without reload
4. Trigger partner-gender validation → localized error

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 13 story 2
```

**Notes for next agent:**

1. Add **`onboarding-basic-form.spec.tsx`** and **`onboarding-texts-form.spec.tsx`** per architect minimum coverage (EN labels + HE via `APP_LOCALE_STORAGE_KEY`, partner validation alert).
2. Mock `fetchMyProfile`, `patchMyProfile`, `createMyProfile` (basic), `useAuth` (basic), `useRouter` as needed — follow `match-preferences-form.spec.tsx`.
3. Hoist mocks; use `.getAttribute()` not `toHaveAttribute`.
4. Full suite gate should become **361 + new tests** after specs land.
5. Consider adding `data-testid` on continue/save buttons if role queries are awkward — optional, prefer label/role queries first.
