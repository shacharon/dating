# Story 3: LLM-derived context fields

**Sprint:** 6  
**Status:** **Done** (engineering gate — 2026-06-03)  
**Closeout order:** 7 (largest; do after 6.2 + 6.4)  
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

- [x] **Schema extension** — `evaluationJson` includes `derivedContext` v1:
  - `occupationClass`: enum (`STANDARD` | `SHIFT_UNPREDICTABLE` | `TRAVEL_HEAVY` | null)
  - `visibilityNeed`: number 0–10
  - `lifeStage`: number 0–10
- [x] **Extraction prompt updated** — `DERIVED_CONTEXT_SYSTEM_PROMPT` in `evaluate-llm-prompts.ts`
- [x] **Zod validation** — `LlmDerivedContextRawSchema` + `sanitizeDerivedContextForPersist`; invalid → defaults (5 / null)
- [x] **deriveContext reads LLM output first** — `resolveDerivedContext()`; regex fallback when v1 absent
- [x] **Dealbreakers unchanged in structure** — `computeDealbreakers()` unchanged
- [x] **Backfill optional** — re-analyze via existing analyze path (not blocking)
- [x] **Tests** — sanitize, deriveContext, evaluate.service, match-engine specs

### Out of scope (this story)

- Removing regex fallback entirely (can be Story 3 follow-up after backfill)
- New dealbreaker rules
- UI display of occupation class

---

## Shipped (engineering)

| Deliverable | Detail |
|-------------|--------|
| `EvaluateBatchResult.derivedContext` | v1 sidecar on `evaluationJson` |
| `inferDerivedContext()` | LLM call in `evaluateBatch` (purpose `evaluate-derived-context`) |
| `resolveDerivedContext()` | LLM-first; `deriveContextFromProfileTexts` legacy fallback |
| `match-engine.ts` | Uses `resolveDerivedContext(evaluation, texts)` |
| Docs | `match-engine-overview.md` source-order bullet |

**Backward compat:** Legacy evaluations without `derivedContext` use regex at compare time until re-analyze.

---

## Definition of done

- [x] LLM extracts three context fields on new analyses
- [x] Match pipeline uses LLM fields when present
- [x] Regex fallback works for legacy evaluations
- [x] Tests pass (**1298/1298**)
- [x] Prompt documented in `evaluate-llm-prompts.ts`

---

## Agent run

```text
--agent 0 sprint 6 story 3   ✅
--agent 1 sprint 6 story 3   ✅
--agent 2 sprint 6 story 3   ✅
--agent 3 sprint 6 story 3   ✅
```

Handoffs: `handoffs/STORY_03_llm_derived_context/agent-*.md`

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
| Batch re-analyze existing profiles | operator (existing analyze endpoint) |
