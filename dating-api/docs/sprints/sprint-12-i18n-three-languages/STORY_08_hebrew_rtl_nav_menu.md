# Story 8: Hebrew RTL — account menu alignment

**Sprint:** 12 (follow-up)  
**Status:** Done  
**Depends on:** Story 0  
**Pipeline:** agent 0 → 1 → 2 → 3 complete (2026-06-06)

---

## What

**As a** Hebrew user  
**I want** the avatar dropdown menu text aligned to the right  
**So that** the menu reads naturally in RTL

### Acceptance criteria

- [x] Account menu uses `dir=rtl` when locale is `he`
- [x] Menu items use logical `text-start` (not hardcoded `text-left`)
- [x] EN/ES menus unchanged (LTR)

---

## Out of scope

- Menu copy / localization — Story 1 (`nav.*`, `navAuth.*`)
- Shell passes `locale` to `NavAuth` — Story 5
- Avatar button corner placement (`absolute right-0`)

---

## Definition of done (engineering)

- [x] `NavAuth` dropdown `dir={getLocaleDirection(locale)}`
- [x] Menu items use `text-start` (no `text-left` / `text-right`)
- [x] RTL/LTR covered in `nav-auth.spec.tsx` (355/355 full suite)
