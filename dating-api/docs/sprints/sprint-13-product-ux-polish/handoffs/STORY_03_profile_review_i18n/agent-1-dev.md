# Handoff: Agent 1 — Senior dev — Story 3

**Agent:** 1 dev  
**Story:** [STORY_03_profile_review_i18n.md](../../STORY_03_profile_review_i18n.md)  
**Sprint:** sprint-13-product-ux-polish  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- Wired **`/dating/profile/page.tsx`** to `useAppLocale()` per architect handoff.
- Added **`profile.viewPage.*`** (10 keys) in `types.ts`, `en.ts`, `he.ts`, `es.ts`.
- Removed local **`genderDisplay()`**; gender + partner list use **`copy.gender`** via `formatPartnerGenders()`.
- Reused existing keys: `common.loading`, `onboarding.loadFailed`, `matchPreferences.goToOnboarding`, `profile.matchPreferencesLink` + help, onboarding basic/texts field labels.
- All four render branches (loading / error / no-profile / review) localized.
- **No API / Prisma changes.**

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-ui/src/lib/i18n/types.ts` | updated — `profile.viewPage` |
| `dating-ui/src/lib/i18n/en.ts` | updated |
| `dating-ui/src/lib/i18n/es.ts` | updated |
| `dating-ui/src/lib/i18n/he.ts` | updated |
| `dating-ui/src/app/dating/profile/page.tsx` | updated — full i18n wire-up |
| `dating-ui/src/app/dating/profile/page.spec.tsx` | **not created** — agent 2 |

**Verify-only (unchanged):** `NotificationPreferencesSection`, `PhotoGateBanner`, `ProfileCompletenessHints`, `ProfilePhotoSection`

---

## Decisions (followed from architect)

- `matchPreferencesLinkCta(copy.profile.matchPreferencesLink)` for prefs link text
- Match prefs help uses `copy.profile.matchPreferencesLinkHelp` (not old hardcoded variant)
- `data-testid="profile-match-preferences-link"` preserved
- Empty values use `vp.emptyValue`

---

## Runtime topology

| Item | Value |
|------|--------|
| REST | Unchanged — `resolveEditableProfile()` → `GET /api/v1/me/profile` |
| Locale | `useAppLocale()` |
| Browser Network smoke | **Deferred** — UI-only |
| `prisma migrate deploy` | **N/A** |

---

## Tests / verification

- [x] `cd dating-ui && npm test -- src/lib/i18n/index.spec.ts` — 7/7 pass
- [x] Full `npm test` — **368/368 pass** (no regressions; profile spec pending agent 2)
- [ ] `profile/page.spec.tsx` — agent 2
- [x] `prisma migrate deploy`: N/A

**Manual smoke (deferred):**

1. HE `/dating/profile` → title, labels, CTAs, gender display
2. Match prefs link localized label + arrow
3. No-profile state → localized body + go-to-onboarding

---

## Open questions / blockers

- None.

---

## Next agent

```text
--agent 2 sprint 13 story 3
```

**Notes for next agent:**

1. Add **`profile/page.spec.tsx`** per architect minimum (EN titleReview, subtitle, nickname label, match prefs link; HE titleReview + findMatchesLink).
2. Mock `resolveEditableProfile`; stub `listMyProfilePhotos` / notification fetches if needed.
3. Full suite gate should become **368 + new tests**.
4. Last story in Sprint 13 — PM close after CR.
