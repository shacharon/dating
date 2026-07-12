# Follow-up: Backfill conflictStyle via re-analysis

**Sprint:** 21 (out of scope)  
**Depends on:** Stories 1–3 shipped

## Why

Existing profiles only get a live `conflictStyle` value when re-analyzed. Until then coverage uses a 15-key denominator with a null slot → slightly lower coverage %.

## What

- Costed batch re-analyze (or targeted cohort) so `sigConflictStyle` / evaluation JSON self signals populate.
- Recompute matches after backfill.
- Measure coverage distribution before/after.

## Not this ticket

- Changing weights (Story 3 locked).
- Deleting HG five-signal ranker (Story 5).
