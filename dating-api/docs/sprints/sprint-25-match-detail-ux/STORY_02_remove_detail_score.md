# Story 2: Remove match score from detail

**Sprint:** 25  
**Status:** Done  
**Depends on:** —

---

## Why

Warm long why + “Match score · 55” fights itself. The why already explains the match — the number is report-card chrome.

---

## What

**As a** user  
**I want** the detail page to lead with the why, not a score  
**So that** the page feels like dating, not a ranking report.

### Acceptance criteria

- [x] Match detail page **does not render** match score (remove, not hide behind a narrative condition).
- [x] List / other surfaces may still show score (unchanged).
- [x] API still returns `matchScore` (no backend contract change required).
- [x] UI tests that asserted `match-detail-score` are updated / removed.

### Out of scope

- Removing score from match list cards.
- Changing how score is computed.

## Suggested touchpoints

- `dating-ui/.../me-matches/[id]/page.tsx`
- `page.spec.tsx`
