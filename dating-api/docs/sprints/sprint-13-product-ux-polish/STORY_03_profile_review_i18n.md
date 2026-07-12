# Story 3: Profile review page i18n

**Sprint:** 13  
**Status:** Done  
**Depends on:** Sprint 12, Story 2 (`copy.gender`)  
**Pipeline:** agent 0 → 1 → 2 → 3 complete (2026-06-06)

---

## What

Wire **`/dating/profile`** review page to `getCopy(locale)` — page chrome, field labels, CTAs, and gender display.

### Surfaces

- `dating-ui/src/app/dating/profile/page.tsx`

### Verify-only (already i18n)

- `NotificationPreferencesSection`
- `PhotoGateBanner`
- `ProfileCompletenessHints`
- `ProfilePhotoSection`

### Out of scope

- Next.js page metadata / `document.title`
- API error message localization
- Refactoring embedded child components
- API / Prisma changes

---

## Acceptance criteria

- [x] All visible chrome in `page.tsx` uses i18n (no hardcoded English user-facing strings)
- [x] New `profile.viewPage.*` keys in `types.ts`; `en.ts` / `he.ts` / `es.ts` complete
- [x] Reuse existing keys where identical: `common.loading`, `onboarding.loadFailed`, `matchPreferences.goToOnboarding`, `profile.matchPreferencesLink` + `matchPreferencesLinkHelp`, onboarding field labels, `copy.gender`
- [x] Match preferences link text built from `profile.matchPreferencesLink` (via `matchPreferencesLinkCta`)
- [x] Page uses `useAppLocale()`; locale changes update chrome without full page reload
- [x] API errors still show `e.message` when present; generic load fallback localized
- [x] New `profile/page.spec.tsx` — EN + HE assertions
- [x] Full `npm test` passes (**370/370**)

**Handoffs:** [agent-0-architect.md](./handoffs/STORY_03_profile_review_i18n/agent-0-architect.md) · [agent-1-dev.md](./handoffs/STORY_03_profile_review_i18n/agent-1-dev.md) · [agent-2-cr.md](./handoffs/STORY_03_profile_review_i18n/agent-2-cr.md) · [agent-3-pm.md](./handoffs/STORY_03_profile_review_i18n/agent-3-pm.md)

---

## Definition of done (engineering)

- [x] `profile.viewPage` in `types.ts` + en/he/es
- [x] `page.tsx` — `useAppLocale()`, all four render branches, `copy.gender`
- [x] `profile/page.spec.tsx` — **2/2** pass
- [x] Full `npm test` green (**370/370**)
- [ ] Operator manual smoke — HE `/dating/profile`, sprint checklist item 4
