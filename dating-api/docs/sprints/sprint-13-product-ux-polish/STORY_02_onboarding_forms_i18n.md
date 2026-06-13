# Story 2: Onboarding forms i18n

**Sprint:** 13  
**Status:** Done  
**Depends on:** Sprint 12  
**Pipeline:** agent 0 → 1 → 2 → 3 complete (2026-06-06)

---

## What

Wire **onboarding basic + story forms** to `getCopy(locale)` — field labels, placeholders, buttons, validation messages, and shared gender enum labels.

### Surfaces

- `onboarding-basic-form.tsx`
- `onboarding-texts-form.tsx`

### Verify-only (already i18n)

- `onboarding-page-heading.tsx`
- `ProfilePhotoSection` (embedded in basic form)

### Out of scope

- `onboarding-index-redirect.tsx` loading text
- Profile review page (Story 3)
- Refactoring `match-preferences-form` to shared `gender` namespace
- API / Prisma changes

---

## Acceptance criteria

- [x] All visible chrome in both forms uses i18n (no hardcoded English user-facing strings)
- [x] Root `copy.gender` covers all five `MeProfileGender` values; basic form uses it for select + partner checkboxes
- [x] `onboarding.basicForm.*` and `onboarding.textsForm.*` keys in `types.ts`; `en.ts` / `he.ts` / `es.ts` complete
- [x] Forms use `useAppLocale()`; locale changes update chrome without full page reload
- [x] Client validation errors localized; API errors still show `e.message` when present (Sprint 12 pattern)
- [x] New component specs: `onboarding-basic-form.spec.tsx`, `onboarding-texts-form.spec.tsx` — EN + HE assertions
- [x] Full `npm test` passes (**368/368**)

**Handoffs:** [agent-0-architect.md](./handoffs/STORY_02_onboarding_forms_i18n/agent-0-architect.md) · [agent-1-dev.md](./handoffs/STORY_02_onboarding_forms_i18n/agent-1-dev.md) · [agent-2-cr.md](./handoffs/STORY_02_onboarding_forms_i18n/agent-2-cr.md) · [agent-3-pm.md](./handoffs/STORY_02_onboarding_forms_i18n/agent-3-pm.md)

---

## Definition of done (engineering)

- [x] `types.ts` + `en.ts` / `he.ts` / `es.ts` — `gender` + extended `onboarding.*`
- [x] Both form components wired via `useAppLocale()`
- [x] `onboarding-basic-form.spec.tsx` (4 tests) + `onboarding-texts-form.spec.tsx` (3 tests)
- [x] Full `npm test` green (**368/368**)
- [ ] Operator manual smoke — HE/ES onboarding chrome (sprint checklist item 4)
