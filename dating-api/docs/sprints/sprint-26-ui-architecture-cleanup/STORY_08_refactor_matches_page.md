# Story 8: Refactor matches page — decision engine / size

**Priority:** P1  
**Estimated effort:** 2 days  
**Agent:** `generalPurpose`  
**Dependencies:** Story 5 (matches-api)

---

## Problem

`dating-ui/src/app/matches/matches-page-client.tsx` (~700 lines) runs decision-engine logic and hard-coded English copy in the browser. Internal tool, but oversized and mixed concerns.

---

## Goal

- Extract decision/insight presentation helpers out of the page
- Prefer client-only extraction + i18n OR thin wrappers around existing `lib/decision-*` modules
- Do **not** invent a new production API unless clearly needed; internal tool can keep client engine if marked as such
- Page <400 lines

---

## Acceptance Criteria

- [ ] Decision/insight UI helpers extracted from page
- [ ] Hard-coded cue strings use i18n OR a clear `lib/` constants module with comment "internal tools only"
- [ ] Page <400 lines
- [ ] `/matches` still works
- [ ] No behavior change for scoring outcomes
- [ ] Commit follows convention

---

## Agent instructions

1. Read `matches-page-client.tsx` and `lib/decision-*`
2. Decide: keep engine in `lib/` (already there) — extract page-local mapping/UI into smaller modules
3. Split large JSX sections into colocated components under `app/matches/`
4. Run tests
5. Commit:

```
refactor(ui): thin internal matches page

Extract decision display helpers and split oversized matches-page-client.
Keep decision engine in lib/. No scoring behavior change.

Sprint 26 Story 8
```
