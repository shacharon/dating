# Handoff: Agent 3 — PM — Story 2

**Agent:** 3 pm  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-04-intellectual-creative  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

- **Story 2 closed as Done (engineering gate).**
- LLM semantic extraction: refined **`intellectualCuriosity`** (relationship-need framing) + new **`creativeExpression`** in self-domain pipeline.
- Full pipeline: architect → dev → CR → pm. **Agent 4 skipped.**
- **Expansion-04 progress: 2/5 stories done.**

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Semantic LLM prompt defined | Done | `expansion-04-signal-definitions.ts` (both keys) |
| Wired into extraction pipeline | Done | `SELF_EXTRACTOR_PROMPT` in `extraction.service.ts` |
| Domain allowlist synced | Done | `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (20 keys); `creativeExpression` self-only |
| `intellectualCuriosity` not duplicated | Done | Refined in block + SIGNAL RULES; already in allowlists |
| No hardcoded patterns | Done | CR verified; no text-inference rules |
| Unit tests pass | Done | Expansion-04 **6/6**; extracted-signals **23/23** |
| Shadow mode preserved | Done | Keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Partner unchanged for `creativeExpression` | Done | CR verified |
| Live LLM quality validation | Deferred | Story 5 (>85% + interest-tag coexistence) |
| Code committed | Pending user | Uncommitted in working tree |

---

## Acceptance criteria (as-built vs README)

| README AC | Status | Notes |
|-----------|--------|-------|
| LLM-only / semantic inference | ✅ | Prompt block + unit tests (mocked LLM) |
| NO keyword matching ("artist" alone ≠ high) | ✅ | PROTECTED + SIGNAL RULES; no code heuristics |
| Distinguish smart/job vs need | ✅ | In Expansion-04 block for both keys |
| File: evaluate-layer prompts | ⏭️ | **Architect override** — extraction path used |
| Scale 0–10 | ⏭️ | **Use 1–10** per extraction stack |
| Live sample validation | ⏭️ | Story 5 |

**Engineering AC for Story 2: met** (live validation explicitly deferred).

---

## Sprint Expansion-04 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Schema & Infrastructure | **Done** |
| 2 | LLM Extraction Prompts | **Done** |
| 3 | Tension Rules | Planned |
| 4 | User-Facing Chips & i18n | Planned |
| 5 | Testing & Validation | Planned |

**Sprint status:** In progress (2/5).

---

## Artifacts updated

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-04-signal-definitions.ts` | New semantic prompt block |
| `dating-api/src/extraction/extraction.service.ts` | Self prompt wiring |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Domain allowlist |
| `dating-api/src/extraction/extraction.service.spec.ts` | Expansion-04 tests; overlap comment |
| `README.md` (sprint-expansion-04) | Story 2 marked Done; as-built notes |
| `handoffs/STORY_02_llm_extraction_prompts/agent-3-pm.md` | This file |

---

## Decisions preserved

- Shadow-only — no scoring/chips/tension until promote story
- Self domain for Expansion-04 rich framing; partner thin `intellectualCuriosity` left as-is
- Expansion-01/02/03 extraction definition files unchanged
- Interest tags remain orthogonal (Story 5 coexistence assert)
- Stories 1–2 uncommitted; commit when user requests

Suggested commit (Stories 1+2 together):

```
feat(extraction): shadow allowlist + LLM prompts for intellectualCuriosity + creativeExpression

Expansion-04 Stories 1–2 — creativeExpression allowlist + self-domain semantic extraction; intellectualCuriosity relationship-need refine; no scoring impact.
```

---

## Tests / verification

- [x] Expansion-04 unit tests — **6/6**
- [x] extracted-signals specs — **23/23**
- [x] Typecheck — **pass**
- [x] Agent 4 E2E — **skipped** (N/A)
- [x] CR — **approved**

---

## Deferred / follow-up

| Item | Owner | When |
|------|-------|------|
| Tension rules `intellectual_gap` (penalty 4) + `creative_mismatch` (penalty 2) + `EnrichedSignals` | Story 3 | Next |
| Shadow overlay chips + i18n (`Mental stimulation`, `Creative expression`) | Story 4 | After Story 3 |
| Live LLM validation + interest-tag coexistence | Story 5 | Before promote |
| Partner `intellectualCuriosity` thin line (optional refine) | Future | Optional |
| Git commit | User | When requested |

---

## Open questions / blockers

- None blocking Story 3 start.
- **Correlation risk:** `intellectualCuriosity` vs `emotionalDepth` / `noveltyVsRoutine`; `creativeExpression` vs hobby tags — Story 5 matrix.

---

## Next story

```text
--agent 0 expansion 04 story 3
```

**Notes:** Story 3 adds `intellectual_gap` (≥8 vs ≤3, penalty 4) and `creative_mismatch` (≥8 vs ≤2, penalty 2) — fires only when both sides have non-null values; friction can affect `finalScore` when rules fire, but keys stay out of `COMPATIBILITY_SIGNAL_KEYS`. Mirror Expansion-01/02/03 Story 3 pattern.
