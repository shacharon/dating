# Story 5: App shell + shared hooks

**Sprint:** 12  
**Status:** Done  
**Depends on:** Story 0  
**Pipeline:** agent 0 → 1 → 2 → 3 complete (2026-06-06)

---

## What

- `useAppLocale()` hook — single locale listener for pages
- App shell API error / retry strings on i18n
- Session loading strings (already on `common.*`)
- Main nav labels + conversations unread aria (`nav.*`)

---

## Out of scope

- `NavAuth` menu copy / dropdown RTL — Stories 8 / 9
- Per-route page copy — Stories 1–4
- `lastError` from auth — raw API message when present

---

## Definition of done

- [x] Hook exported from `@/lib/i18n`
- [x] Shell error state uses copy, not hardcoded English
- [x] Session loading strings on `common.*`
- [x] Shell + hook tested (348/348 full suite)
