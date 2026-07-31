# Story 9: Split large onboarding/settings components

**Priority:** P1  
**Estimated effort:** 1–2 days  
**Agent:** `generalPurpose`  
**Dependencies:** None

---

## Problem

Several product components exceed ~300 lines:
- `onboarding-basic-form.tsx`
- `profile-photo-section.tsx`
- `match-preferences-form.tsx`
- `dating/analysis/page.tsx`
- `dating/me-matches/page.tsx`
- Deprecated `onboarding-draft-form.tsx` (delete in Story 13 if unused)

---

## Goal

Split each into smaller sections/components or extract hooks so primary files are <300 lines where practical. Prefer composition over deep abstraction.

---

## Acceptance Criteria

- [ ] Onboarding basic form sections extracted (or clearly <300)
- [ ] Profile photo section split (upload/list/preview)
- [ ] Match preferences form sections extracted
- [ ] Analysis page: polling orchestration in hook if still heavy
- [ ] Me-matches list: lean on `useInfiniteMatches`
- [ ] Existing specs updated/pass
- [ ] No UX regression
- [ ] Commit follows convention

---

## Agent instructions

1. Measure line counts for target files
2. Split one file at a time; commit can be single story commit
3. Keep props simple; reuse existing patterns
4. Run `npm test`
5. Commit:

```
refactor(ui): split large onboarding and settings components

Break oversized forms/sections under 300 lines where practical.
Preserve behavior and existing tests.

Sprint 26 Story 9
```
