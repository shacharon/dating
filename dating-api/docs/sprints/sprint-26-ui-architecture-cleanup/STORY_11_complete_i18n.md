# Story 11: Complete i18n for error boundaries and remaining product surfaces

**Priority:** P1  
**Estimated effort:** 1–2 days  
**Agent:** `generalPurpose`  
**Dependencies:** Story 4 (error boundaries exist)

---

## Problem

Hard-coded English remains in:
- Error/fallback UI (if any still missing i18n)
- `nav-auth.tsx` aria-labels
- Photo section microcopy ("uploading", "Empty", etc.)
- Feedback form / admin (admin may stay English if marked internal-only)

---

## Goal

All **user-facing product** strings use `useAppLocale` / `getCopy`. Internal admin tools: either i18n or explicit "English only / internal" comment in README of that route.

---

## Acceptance Criteria

- [ ] Product error boundaries fully i18n'd (verify Story 4 keys)
- [ ] nav-auth aria-labels from i18n
- [ ] profile-photo-section microcopy i18n'd
- [ ] feedback form: i18n or removed if mock (coordinate with Story 13)
- [ ] Keys in en + he (+ es if schema requires)
- [ ] Commit follows convention

---

## Agent instructions

1. Grep hard-coded English in `components/` and `app/dating/`
2. Add keys to i18n schema + locale files
3. Wire components
4. Skip deep admin i18n unless quick; mark internal
5. Commit:

```
feat(ui): complete product i18n for remaining surfaces

Wire nav, photo section, and remaining product copy to i18n.
Admin/internal tools documented as English-only where deferred.

Sprint 26 Story 11
```
