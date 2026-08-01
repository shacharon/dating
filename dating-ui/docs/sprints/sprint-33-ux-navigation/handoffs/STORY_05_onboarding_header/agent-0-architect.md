# Handoff: Agent 0 — Architect — Sprint 33 Story 5

**Agent:** 0 architect  
**Story:** Fixed onboarding progress header  
**Sprint:** sprint-33-ux-navigation  
**Date:** 2026-08-01  
**Status:** complete  

**Mode:** Design lock + low-fi ASCII (no Figma). **Skip Agent 4**.

---

## Summary

Dedicated fixed onboarding chrome: **hide AppNav** on `/onboarding*`, 2-step stepper (**Basic / Texts** only — no fake Photos), Exit with confirm vs Skip for now without. Leave → me-matches (edit → profile).

Full lock: [STORY_05_onboarding_header.md](../STORY_05_onboarding_header.md)

---

## Artifacts (Agent 1)

| Path | Change |
|------|--------|
| `onboarding/layout.tsx` | **create** |
| `components/onboarding/{header,stepper,exit-dialog}` | **create** |
| `authenticated-app-shell.tsx` | hide AppNav + `pb-20` on onboarding |
| `onboarding-basic-form.tsx` | remove Continue later |
| `lib/i18n/*` | new `onboarding` header/dialog keys |
| specs | stepper / dialog / header |

---

## Decisions (do not reverse)

1. Hide AppNav during onboarding (required).
2. **Two** steps only — Photos deferred.
3. No auto-save on Exit/Skip; dialog copy must admit unsaved loss.
4. Skip hidden in `?edit=1`.
5. i18n via `getCopy` / `copy.onboarding`, not next-intl.
6. Skip Agent 4.

---

## Agent 1 brief

1. Read `STORY_05_onboarding_header.md`
2. Implement layout + components + shell hide + i18n + remove Continue later
3. Add tests; verify mobile scroll doesn’t lose header

**Next command:**

```
--agent 1 sprint 33 story 5
```
