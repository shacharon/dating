# Story 02 — Extract Shared Text-Match Utilities

**Sprint:** 60  
**Effort:** 1 day  
**Risk:** ⚡ LOW (pure extraction, no logic changes)  
**Status:** Done

---

## Objective

Consolidate duplicate HG keyword text-matching helpers into one shared utility module.

**Delivered:** `escapeRegExp` + lightweight `isNegatedBefore` shared across four HG extractors.

**Architect scope note:** Enrichment-v2 keeps a **different** negation helper (wider window + broader tokens) — intentionally not unified (Sprint 52 keyword freeze). `scanPhrases` deferred (no caller).

---

## Delivered

```
dating-api/src/shared/text-match.utils.ts
dating-api/src/shared/text-match.utils.spec.ts
```

Wired:

- `holy-grail-matching/interest-tags-text.extract.ts`
- `holy-grail-matching/lifestyle-signals-text.extract.ts`
- `holy-grail-matching/personality-traits-text.extract.ts`
- `holy-grail-matching/dealbreaker-signals-text.extract.ts` (re-exports `isNegatedBefore` for barrel)

---

## Acceptance criteria

- [x] `shared/text-match.utils.ts` + unit tests
- [x] Four HG extractors use shared helpers (no local copies)
- [x] Keyword / enrichment specs green; enrichment negation unchanged
- [x] Dealbreaker/barrel `isNegatedBefore` export preserved

## Definition of Done

- [x] Agent 2 approved; Agent 3 PM close (Agent 4 N/A)

## Close

- Branch tip: `feature/sprint-60-story-2` @ `679d9f9`+
- Pipeline: `-1 → 0 → 1 → 2 → 3`
