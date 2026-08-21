# Story 01 — Enrichment on Main + Hygiene

**Sprint:** 63  
**Effort:** 0.5–1 day  
**Risk:** ⚡ LOW  
**Status:** Done

---

## Objective

1. Ensure Sprint 57 enrichment decompose is **on main** (thin facade + keyword modules), not stranded on `feature/sprint-57-story-3`.
2. Apply 30-minute hygiene from the validation scan.

---

## Tasks

### A. Enrichment merge verify

```bash
# On main — if enrichment-v2 still ~800+ LOC:
git branch -a | rg "sprint-57"
# Rebase feature/sprint-57-story-3 onto main, resolve vs Sprint 60 (v3/v4 already gone)
# Merge to main
```

**Success:** `enrichment-v2.ts` ≤ ~200 LOC facade OR keyword modules exist and facade is thin; enrichment parity specs green.

If already merged: document “done” and skip to hygiene.

### B. Hygiene (same PR or follow-up)

1. Remove `RedisCacheService` from module **exports** if no product importer (keep internal `useExisting` for ports).
2. Delete `me-conversations-*-batch.ts` re-export shims; update imports to repository helpers.
3. Optional: rename `enrichment-v3.phrases.spec.ts` / `v4` to “extension coverage” names (aliases deleted).

---

## Success

- [x] Enrichment structure correct on branch tip (thin facade + keyword modules; Sprint 60 no-v3/v4 kept) — merge tip to main to finish “on main”
- [x] Deprecated export / batch shims cleaned
- [x] Tests green (Agent 1: 156; Agent 2 wiring: 66)

---

## Follow-up

- Optional phrase-spec rename (v3/v4 → extension coverage) — deferred
- Merge `feature/sprint-63-story-1` (or later sprint tip) to main so enrichment is no longer fat on main

---

## Shipped

`feature/sprint-63-story-1` @ `7b43d85`

- `c9986c1` — feat: land enrichment keyword modules + hygiene
- `d73b3e3` — test: guard enrichment merge hygiene wiring
- `7b43d85` — chore: close sprint 63 story 1

**Pipeline:** `-1 → 0 → 1 → 2 → 3` (Agent 4 N/A)
