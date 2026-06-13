# Story 7: Language picker on public landing

**Sprint:** 12 (follow-up)  
**Status:** Done  
**Depends on:** Story 1  
**Pipeline:** agent 0 → 1 → 2 → 3 complete (2026-06-06)

---

## What

**As a** new visitor (no session cookie)  
**I want** to choose language on `/` before signing in  
**So that** the landing and later app match my language without digging into settings

### Acceptance criteria

- [x] Language selector visible on public landing when Google CTA is shown
- [x] Default **English** for first visit (no stored locale)
- [x] Choice persists via `localStorage` + updates page copy + `dir` immediately
- [x] Settings → Language still works for logged-in users

---

## Out of scope

- Polished marketing copy on landing (separate content task)
- Refactor settings page to use shared `LanguagePicker` component

---

## Definition of done (engineering)

- [x] `LanguagePicker` component + landing mount
- [x] Picker visibility + locale change tested (351/351 full suite)
