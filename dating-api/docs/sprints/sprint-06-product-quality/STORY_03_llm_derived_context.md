# Story 3: LLM-derived context fields

**Sprint:** 6  
**Status:** Not started  
**Depends on:** —

---

## Why

`deriveContextFromProfileTexts()` uses fragile keyword regex to infer `occupationClass`, `visibilityNeed`, and `lifeStage`. These feed dealbreaker rules (unpredictability, visibility mismatch, life stage gap). A nurse on rotating shifts might not match `/shift|night shift/` patterns. LLM extraction is already the source of truth for signals — extend it for context fields.

---

## What

**As a** match engine  
**I want** occupation class, visibility need, and life stage extracted by the LLM during profile analysis  
**So that** dealbreaker context is accurate and maintainable

### Acceptance criteria

- [ ] **Schema extension** — `evaluationJson` (or structured extraction output) includes:
  - `occupationClass`: enum (`STANDARD` | `SHIFT_UNPREDICTABLE` | `TRAVEL_HEAVY` | null)
  - `visibilityNeed`: number 0–10
  - `lifeStage`: number 0–10
- [ ] **Extraction prompt updated** — LLM asked to infer these from profile text with definitions
- [ ] **Zod validation** — new fields validated on persist; invalid → fallback defaults (5 for numeric, null for class)
- [ ] **deriveContext reads LLM output first** — `deriveContextFromProfileTexts()` becomes fallback only when LLM fields absent (backward compat for old evaluations)
- [ ] **Dealbreakers unchanged in structure** — `computeDealbreakers()` still receives `DerivedContext`; source of truth shifts upstream
- [ ] **Backfill optional** — script or note for re-analyzing existing profiles (not blocking)
- [ ] **Tests** — unit tests for new schema; integration test that analyzed profile populates context fields

### Out of scope (this story)

- Removing regex fallback entirely (can be Story 3 follow-up after backfill)
- New dealbreaker rules
- UI display of occupation class

---

## Technical notes (guidance, not prescriptive)

See `handoffs/STORY_03_llm_derived_context/agent-0-architect.md` after architect run.

Key files:
- `dating-api/src/extraction/` — prompt + persistence
- `dating-api/src/domain/deriveContext.ts` — fallback regex (keep temporarily)
- `dating-api/src/domain/dealbreakers.ts` — consumer (no change expected)
- `dating-api/src/evaluate/` — may need to pass context into match pipeline

Enum values must match existing dealbreaker expectations:
- `SHIFT_UNPREDICTABLE`, `TRAVEL_HEAVY` (already used in dealbreakers.ts rule #2)

---

## Definition of done

- [ ] LLM extracts three context fields on new analyses
- [ ] Match pipeline uses LLM fields when present
- [ ] Regex fallback works for legacy evaluations
- [ ] Tests pass
- [ ] Extraction prompt documented

---

## Manual smoke

1. Submit profile mentioning "night shift nurse" → `occupationClass: SHIFT_UNPREDICTABLE` from LLM  
2. Submit profile mentioning "keep to myself, private life" → `visibilityNeed` low (~2)  
3. Old profile without new fields → regex fallback still produces context

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Remove regex fallback | after backfill |
| Batch re-analyze existing profiles | ops script |
