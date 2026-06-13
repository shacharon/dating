# Story 1: Like button — heart icon with translated label

**Sprint:** 13  
**Status:** Done  
**Depends on:** Sprint 12 Story 3 (match detail i18n)  
**Pipeline:** agent 0 → 1 → 2 → 3 complete (2026-06-06)

---

## What

**As a** user browsing a match  
**I want** a heart on the Like button  
**So that** the primary positive action is recognizable at a glance in any language

### Acceptance criteria

- [x] Match detail Like button shows a **decorative** ❤️ before the existing translated label
- [x] Accessible name remains **`copy.matches.detail.like`** only (EN / ES / HE) — emoji `aria-hidden`
- [x] Pass, Block, Report, Undo, and status lines unchanged (text only)
- [x] Like / undo / mutual-match flows unchanged (no API changes)
- [x] UI tests pass; detail spec still finds Like by translated label

---

## Out of scope

- Heart on list “Liked” badge or celebration modal
- 👎 on Pass or icons on Block / Report
- New i18n copy keys (unless CR finds an accessibility gap)
- Backend or match-action API changes

---

## Definition of done (engineering)

- [x] `me-matches/[id]/page.tsx` — Like button uses feedback-strip emoji pattern
- [x] `page.spec.tsx` — heart presence + role query by label (30/30 detail spec)
- [x] Full `npm test` green (361/361)
