# Handoff: Agent 0 — Architect — Sprint 33 Story 4

**Agent:** 0 architect  
**Story:** Kill redundant routes  
**Sprint:** sprint-33-ux-navigation  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Middleware redirects for dating hub + legacy matches; slim onboarding index (keep smart resume). **Skip Agent 4**.

---

## Summary

- Delete dating hub UI + legacy `/dating/matches*` redirect pages.
- Middleware: `/dating`, `/dating/matches`, `/dating/matches/:id` → me-matches paths.
- **Do not** fetch profile in middleware.
- Keep `/onboarding` smart resume; delete standalone `onboarding-index-redirect.tsx` by colocating/inlining.
- Default after login + exact `/dating` links → `/dating/me-matches`.

Full lock: [STORY_04_kill_redundant_routes.md](../STORY_04_kill_redundant_routes.md)

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `middleware.ts` (+ spec) | dating redirects |
| `app/dating/page.tsx`, `dating-page-client.tsx`, `page.spec.tsx` | **delete** |
| `app/dating/matches/**` | **delete** |
| `components/onboarding-index-redirect.tsx` | **delete** (inline/colocate) |
| `(authenticated)/onboarding/page.tsx` | keep route + resume logic |
| `public-landing-client.tsx`, `app/page.tsx`, forms | default links |
| Grep cleanup for `href="/dating"` | update |

---

## Decisions (do not reverse)

1. Static dating redirects in middleware only.
2. Preserve `onboardingResumePath` behavior.
3. Skip Agent 4.

---

## Agent 1 brief

1. Read `STORY_04_kill_redundant_routes.md`
2. Implement deletes + middleware + link updates + tests
3. Grep for deleted imports / exact `/dating` hrefs

**Next command:**

```
--agent 1 sprint 33 story 4
```
