# Handoff: Agent 2 — Code review — Story 2

**Agent:** 2 code-review  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-06-adventure-novelty  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)  
**Verdict:** **approved** (no code changes required)

---

## Summary

- Reviewed Story 2 against architect handoff and LLM-first principle — **aligned**.
- Semantic block in extraction path (`expansion-06-signal-definitions.ts` → `SELF_EXTRACTOR_PROMPT`); single-call pipeline preserved.
- Prompt migrated: ALLOWED KEYS + SIGNAL RULES use `adventureNovelty`; `lifestylePace` disambiguates novelty-vs-routine; Exp-03/04/05 PROTECTED refs renamed.
- Alias `noveltyVsRoutine` → `adventureNovelty` retained; self allowlist **22**; key not on partner; shadow-only; no regex/evaluate/scoring drift.

---

## Architect CR checklist

- [x] **Zero** regex/keyword/if-else scoring for `adventureNovelty`
- [x] No changes to `extraction-text-inference.ts` / `text-inference.ts` for this key
- [x] Prompt block in extraction path (not `evaluate-llm-prompts.ts`)
- [x] No separate LLM calls added
- [x] ALLOWED KEYS / SIGNAL RULES use `adventureNovelty` (no `noveltyVsRoutine` in prompt strings)
- [x] `KEY_ALIASES.noveltyVsRoutine` still present
- [x] `DOMAIN_ALLOWED_SIGNAL_KEYS.self` still **22** with `adventureNovelty`; key **not** on partner
- [x] Scale 1–10 enforced; null on weak evidence (OOR `11` → null test)
- [x] PROTECTED / distinct-from lines present (vs lifestylePace, domesticComfort, interest tags, etc.)
- [x] `lifestylePace` SIGNAL RULES mentions novelty-vs-routine distinction
- [x] Exp-03/04/05 PROTECTED lines updated to `adventureNovelty`
- [x] Key still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [x] Unit tests pass (incl. alias path) — CR re-run **5/5** Expansion-06 + **31/31** shape specs

---

## Issues

| Severity | Finding | Action |
|----------|---------|--------|
| Critical | None | — |
| Major | None | — |
| Minor | Partner/relationship prompts still map “adventurous/high-action” → `lifestylePace` | Pre-existing; architect locked partner prompts out of scope. Story 5 may watch self vs partner correlation; no Story 2 change |

---

## Review notes

- `noveltyVsRoutine` remains only in: `KEY_ALIASES`, JSDoc, and intentional mock LLM inputs for alias regression — correct.
- Five Expansion-06 tests cover high, low, legacy alias, null, and out-of-range — matches architect §8.
- No tension / explainability / compatibility edits — correct Story 2 scope.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-06-signal-definitions.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction.service.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/expansion-0{3,4,5}-signal-definitions.ts` | Agent 1 PROTECTED renames (unchanged by CR) |
| `dating-api/src/extraction/extraction.service.spec.ts` | Agent 1 (unchanged by CR) |
| `handoffs/STORY_02_llm_extraction_prompts/agent-2-cr.md` | This handoff |

---

## Runtime topology

N/A

---

## Tests / verification

- [x] Expansion-06 filter — **5/5 pass** (CR re-run)
- [x] `extracted-signals.spec.ts` — **31/31 pass** (CR re-run)
- [x] Typecheck — **pass** (agent 1)
- [x] Browser Network smoke: **N/A**

---

## E2E verification

N/A

---

## Open questions / blockers

- None for Story 2 close.

---

## Next agent

```text
--agent 3 expansion 06 story 2
```

**Notes:** PM closes Story 2, then Story 3 (`novelty_routine_clash`, penalty 4). Keep alias permanently. Live LLM ≥85% is Story 5.
