# Handoff: Agent 1 — Implement — Sprint 33 Story 4

**Agent:** 1 implement  
**Story:** Kill redundant routes  
**Sprint:** sprint-33-ux-navigation  
**Date:** 2026-08-01  
**Status:** complete  

**Skip Agent 4:** yes  

---

## Summary

Implemented Agent 0 lock: middleware dating redirects, deleted hub + legacy matches pages, colocated onboarding index client, pointed post-login / hub links at Matches.

---

## Changes

| Path | Change |
|------|--------|
| `src/middleware.ts` | After auth gate: `/dating` → me-matches; `/dating/matches` → me-matches; `/dating/matches/:id` → me-matches/:id |
| `src/middleware.spec.ts` | Three auth’d redirect tests; prod matches path expects redirect |
| `app/dating/page.tsx`, `dating-page-client.tsx`, `page.spec.tsx` | **deleted** |
| `app/dating/matches/**` | **deleted** |
| `components/onboarding-index-redirect.tsx` | **deleted** |
| `app/(authenticated)/onboarding/onboarding-index-client.tsx` | **added** (same smart resume via `onboardingResumePath`) |
| `app/(authenticated)/onboarding/page.tsx` | uses colocated client |
| `public-landing-client.tsx` | `DEFAULT_AFTER_LOGIN` → `/dating/me-matches` |
| `app/(authenticated)/app/page.tsx` | redirect → me-matches |
| `onboarding-basic-form.tsx` | continue-later link → me-matches |
| `app/dating/_lib/types.ts` | comment path update only |

Unauthenticated `/dating` still lands on `/` with `next=/dating`; after login middleware then redirects to me-matches (no profile fetch in middleware).

---

## Tests

```text
npx vitest run src/middleware.spec.ts
# 27 passed
```

---

## Agent 2 next

```
--agent 2 sprint 33 story 4
```

Review against `STORY_04_kill_redundant_routes.md` + this handoff. Confirm no remaining imports of deleted files and AC met.
