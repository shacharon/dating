# Handoff: Agent 2 — Code review — Story 2

**Agent:** 2 code-review  
**Story:** [STORY_02_photo_gate_profile_completeness.md](../../STORY_02_photo_gate_profile_completeness.md)  
**Sprint:** sprint-09-product-mvp  
**Date:** 2026-06-06  
**Status:** complete  
**Verdict:** approved (minor test hardening applied)

---

## Summary

- Reviewed Agent 1 implementation against `agent-0-architect.md` — **aligned**: shared photo gate helper, list/submit/detail/visibility gates, `no_photo` contract, analytics on blocked paths only, UI redirect + banner + checklist + onboarding copy.
- Applied **test hardening**: assert `match.list_viewed` not emitted on `no_photo`; `getById` 404 when viewer photo-less; onboarding `requiredForMatching` component spec.
- Story-focused suites: **293/293** API (photo-gate + matches + profile + HTTP integration); **248/248** UI (+1 CR spec).

---

## Review notes

| Area | Finding | Severity |
|------|---------|----------|
| Architect alignment | Gate order `no_profile` → `not_analyzed` → `no_photo` | OK |
| Shared helper | `me-profile-photo-gate.ts` used at all call sites | OK |
| List gate | `not_ready(no_photo)` before eval/candidate work | OK |
| Submit gate | **422** `photo_required` + `ME_PROFILE_PHOTO_REQUIRED` | OK |
| Defense in depth | `getById` + `assertMatchCandidateVisible` mirror gate | OK |
| Analytics | `profile.photo_gate_blocked` on list/submit block only | OK |
| Sprint 7 rule | No `match.list_viewed` on `not_ready` | OK (+ test added) |
| UI redirect | `no_photo` → `/dating/profile` (both load paths) | OK |
| Profile UX | `PhotoGateBanner`, `ProfileCompletenessHints`, `#profile-photos` | OK |
| Onboarding | `requiredForMatching` copy on basic form | OK (+ spec) |
| i18n | `photoGate`, `profileCompleteness` en/es | OK |
| Docs | Contract + funnel updated | OK |
| Duplicate photo fetch | Banner + hints each call `listMyProfilePhotos` | Nit — acceptable per architect |
| Manual browser smoke | submit 422 / delete last photo | Deferred — operator |

---

## Fixes applied

| Path | Change |
|------|--------|
| `dating-api/src/me-profile/me-matches.service.spec.ts` | Assert `MATCH_LIST_VIEWED` not fired on `no_photo`; add `getById` no-photo test |
| `dating-ui/src/components/profile-photo-section.spec.tsx` | **created** — `requiredForMatching` hint visible |

No production code changes required.

---

## Tests / verification

- [x] `npm test -- --testPathPatterns=me-profile-photo-gate\|me-matches.service\|me-profile.service\|me-profile-http.integration` → **293/293** pass
- [x] Full UI suite → **248/248** pass
- [x] Story CR specs — photo-gate banner, completeness hints, me-matches redirect, profile-photo hint
- [ ] Manual smoke — pending operator (story steps 1–3)

### Runtime verification

| Check | Result |
|-------|--------|
| Photo gate before scoring | Unit test — eval query skipped on `no_photo` |
| Submit blocked without photo | Unit + HTTP integration |
| Analytics surface values | Unit assertions `match_list` / `submit` |
| UI redirect | Page spec |
| Profile banner | Component spec |

---

## Acceptance criteria (engineering gate)

| AC | Status |
|----|--------|
| Photo gate — `not_ready(no_photo)` on list | Done + tested |
| Submit gate — 422 `photo_required` | Done + tested |
| Onboarding nudge — required for matching copy | Done + tested |
| Profile banner — add photo to see matches | Done + tested |
| Completeness hints — non-blocking checklist | Done + tested |
| Analytics — `profile.photo_gate_blocked` | Done + tested |
| API + UI tests | Done |
| Contract docs updated | Done |

---

## Open questions / blockers

- None.

Optional follow-up (not blocking): coalesce duplicate `listMyProfilePhotos` on profile page into shared hook — product polish only.

---

## Next agent

```text
--agent 3 sprint 9 story 2
```

**Notes for PM closeout:**

1. Mark story AC checkboxes + sprint README progress (**5/6** after closeout).
2. Manual smoke still pending for Stories 1–5 and this story.
3. No migration — document legacy analyzed users without photos get `no_photo` until upload.
