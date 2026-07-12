# Story 1: Landing + language settings

**Sprint:** 12  
**Status:** Done  
**Depends on:** Story 0  
**Pipeline:** agent 0 → 1 → 2 → 3 complete (2026-06-06)

---

## What

- Public landing uses `getCopy()` (not hardcoded Hebrew)
- `/settings/language` — EN / ES / HE picker + description
- `LocaleDocumentSync` sets `<html lang dir>` on change
- Authenticated shell: RTL wrapper when `he`

---

## Definition of done

- [x] Landing English by default
- [x] Hebrew selectable; RTL applies
- [x] No `TODO` on language settings page
- [x] UI tests **335/335** pass (landing, settings, shell locale specs)
