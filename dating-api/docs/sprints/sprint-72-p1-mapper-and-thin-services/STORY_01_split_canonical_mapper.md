# Story 01 — Split profile-to-canonical.mapper

**Sprint:** 72  
**Effort:** 2–3 days  
**Risk:** ⚡ LOW (move-only)  
**Status:** Optional

---

## Objective

Split `holy-grail-matching/profile-to-canonical.mapper.ts` (704 LOC) by input slice.

---

## Target layout

```
holy-grail-matching/canonical-mapper/
  profile-to-canonical.mapper.ts       # orchestrator ≤150 LOC
  map-ranking-signals.slice.ts
  map-structured-facts.slice.ts
  map-structured-preferences.slice.ts
  map-search-overrides.slice.ts
  map-extraction-arrays.slice.ts
  canonical-mapper.validation.ts       # assertPlainRecord, assertNoExtraKeys
```

Public export path can stay `profile-to-canonical.mapper` via re-export for stable imports.

---

## Tasks

1. Extract validation helpers.
2. Move each `validate*Slice` / map block to its file.
3. Orchestrator calls slices in same order.
4. Update specs; full HG suite green.

---

## Success

- [ ] Orchestrator ≤150 LOC
- [ ] No slice >200 LOC
- [ ] Behavior identical (characterization)

**Pipeline:** `-1 → 0 → 1 → 2 → 3`
