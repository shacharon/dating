# Handoff: Agent 1 — Implement — Sprint 35 Story 3 Frontend

**Agent:** 1 implement  
**Story:** Bind profile quality meter to API  
**Sprint:** sprint-35-profile-consolidation  
**Date:** 2026-08-01  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [STORY_03_profile_quality_frontend.md](../../STORY_03_profile_quality_frontend.md)

---

## Summary

Hub meter now loads `GET /api/v1/me/profile/quality`. Compact chrome kept (emerald bar, ≤2 i18n chips, Improve CTA). Hub `qualityRefreshKey` bumps after basic/story save and photo upload/delete. No dating-api changes.

---

## Files

| Path | Change |
|------|--------|
| `src/lib/profile-quality-api.ts` | **new** — fetch + `qualitySuggestionChips` |
| `src/lib/profile-quality-api.spec.ts` | **new** |
| `src/components/profile/profile-quality-meter.tsx` | API bind; drop draft/client score |
| `src/components/profile/profile-quality-meter.spec.tsx` | **new** |
| `src/app/(authenticated)/profile/profile-hub-client.tsx` | `refreshKey` + Edit callback |
| `src/app/(authenticated)/profile/page.spec.tsx` | mock quality API |
| `src/components/profile/profile-edit-tab.tsx` | `onProfileMutated` |
| `src/components/onboarding-basic-form.tsx` | `onSaved` |
| `src/components/onboarding-texts-form.tsx` | `onSaved` |
| `src/components/profile-photo-section.tsx` | `onMutated` |

---

## Specs run

```
npx vitest run src/lib/profile-quality-api.spec.ts \
  src/components/profile/profile-quality-meter.spec.tsx \
  "src/app/(authenticated)/profile/page.spec.tsx"
```

**10 passed.**

---

## Agent 2 notes

1. Confirm meter never falls back to client equal-weight on error.  
2. Confirm chips use API order + `suggestionHref`.  
3. Confirm refresh only after successful mutations.

**Next command:**

```
--agent 2 sprint 35 story 3 frontend
```
