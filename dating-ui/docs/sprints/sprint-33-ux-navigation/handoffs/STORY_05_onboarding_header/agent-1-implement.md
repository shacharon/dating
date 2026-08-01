# Handoff: Agent 1 — Implement — Sprint 33 Story 5

**Agent:** 1 implement  
**Story:** Fixed onboarding progress header  
**Sprint:** sprint-33-ux-navigation  
**Date:** 2026-08-01  
**Status:** complete  

**Skip Agent 4:** yes  

---

## Summary

Shipped fixed onboarding chrome per lock: layout + header/stepper/exit dialog, AppNav hidden on `/onboarding*`, Continue later removed from basic form, i18n en/he/es.

---

## Changes

| Path | Change |
|------|--------|
| `app/(authenticated)/onboarding/layout.tsx` | **created** — fixed header + `pt-20` main |
| `components/onboarding/onboarding-header.tsx` | **created** |
| `components/onboarding/onboarding-stepper.tsx` | **created** (2 steps; back-link Basic from Texts only) |
| `components/onboarding/exit-confirmation-dialog.tsx` | **created** |
| `components/onboarding/onboarding-step.ts` | **created** — pathname / fill / navigate helpers |
| `components/onboarding/*.spec.*` | step + dialog + header tests |
| `authenticated-app-shell.tsx` | hide AppNav + `pb-20` on `/onboarding*` |
| `onboarding-basic-form.tsx` | removed Continue later link |
| `lib/i18n/{types,en,he,es}.ts` | `header`, `stepBasic/Texts`, `exitDialog` |

Leave: normal → `/dating/me-matches`; `?edit=1` → `/dating/profile` (Skip hidden).

---

## Tests

```text
npx vitest run src/components/onboarding src/components/onboarding-basic-form.spec.tsx
# 17 passed
```

---

## Agent 2 next

```
--agent 2 sprint 33 story 5
```

Review against `STORY_05_onboarding_header.md`.
