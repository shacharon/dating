# Handoff: Agent 1 — Senior dev — Story 2

**Agent:** 1 senior-dev  
**Story:** [STORY_02_photo_gate_profile_completeness.md](../../STORY_02_photo_gate_profile_completeness.md)  
**Sprint:** sprint-09-product-mvp  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Photo gate (API)** — `GET /api/v1/me/matches` returns `not_ready` + `reason: 'no_photo'` when viewer is `ANALYZED` but has zero `APPROVED` photos; fires `profile.photo_gate_blocked` `{ surface: 'match_list' }`.
- **Submit gate** — `POST /api/v1/me/profile/submit` → **422** `{ error: 'photo_required' }`; analytics `{ surface: 'submit' }`.
- **Defense in depth** — `getById` + `assertMatchCandidateVisible` reject viewers without approved photos (`404`).
- **Shared helper** — `me-profile-photo-gate.ts` (`countApprovedPhotosForProfile`, `viewerHasApprovedPhoto`).
- **UI** — `/dating/me-matches` redirects `no_photo` → `/dating/profile`; `PhotoGateBanner` + `ProfileCompletenessHints` on profile page; onboarding `requiredForMatching` copy on photo section.

---

## Artifacts shipped

| Area | Path |
|------|------|
| Helper | `src/me-profile/me-profile-photo-gate.ts` + spec |
| Matches | `me-matches.service.ts` — list/detail/visibility gates |
| Profile | `me-profile.service.ts` — submit gate |
| Analytics | `PROFILE_PHOTO_GATE_BLOCKED` in `product-analytics.events.ts` |
| Ops | `ME_PROFILE_PHOTO_REQUIRED` in `error-codes.ts` |
| Docs | `MATCH_ENGINE_V1_CONTRACT.md`, `MATCH_ENGINE_DEEP_DIVE.md`, `PRODUCT_FUNNEL.md` |
| UI API types | `me-profile-api.ts` — `reason: 'no_photo'` |
| UI redirect | `me-matches/page.tsx` |
| UI components | `photo-gate-banner.tsx`, `profile-completeness-hints.tsx` |
| UI profile | `profile/page.tsx`, `profile-photo-section.tsx`, `onboarding-basic-form.tsx` |
| i18n | `photoGate`, `profileCompleteness` en + es |

---

## API behavior notes

| Case | Result |
|------|--------|
| List, analyzed, 0 approved photos | **200** `{ status: 'not_ready', reason: 'no_photo' }` |
| Submit, valid gender, 0 approved photos | **422** `{ error: 'photo_required' }` |
| Detail/actions, analyzed, 0 photos | **404** (viewer not ready) |
| List ready path | `match.list_viewed` unchanged; no analytics on other `not_ready` reasons |

Gate order in `list()`: `no_profile` → `not_analyzed` → `no_photo` → scoring.

---

## Tests / verification

- [x] `npm test -- --testPathPatterns=me-profile-photo-gate|me-matches.service|me-profile.service|me-profile-http.integration` → **291/291** pass
- [x] Full UI suite → **247/247** pass (+6 new specs)
- [ ] Manual smoke — operator (story steps 1–3)

---

## Deviations from architect

None.

---

## Open questions / blockers

- None blocking agent 2.

---

## Next agent

```text
--agent 2 sprint 9 story 2
```

**Notes for CR:**

1. Confirm `profile.photo_gate_blocked` fires only on blocked paths (not profile page load).
2. Verify isolation tests include `userProfilePhoto.count` mock (added for new gate).
3. Manual smoke: submit without photo → 422; matches → profile banner.
