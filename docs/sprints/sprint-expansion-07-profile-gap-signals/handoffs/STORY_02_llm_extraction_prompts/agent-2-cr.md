# Handoff: Agent 2 — Code review — Story 2

**Agent:** 2 code-review  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)  
**Verdict:** **approved** (no code changes required)

---

## Summary

- Reviewed Story 2 against architect handoff and LLM-first principle — **aligned**.
- Self + partner semantic blocks in extraction path; Story 1 metadata preserved; single-call pipeline unchanged.
- `DOMAIN_ALLOWED.self` **27**, `.partner` **13**, relationship unchanged; scored set still **15**.
- Adjacent SIGNAL RULES upgraded (spirituality, physicalAffectionStyle, traditionalism, physicalPriority); FAMILY LANGUAGE RULE soft-updated for ritual → `religiousObservance`.
- No regex / evaluate / text-inference / scoring / tension drift.

---

## Architect CR checklist

- [x] **Zero** regex/keyword/if-else scoring for Exp-07 keys
- [x] No changes to `extraction-text-inference.ts` / `text-inference.ts` for these keys
- [x] Prompt blocks in extraction path (not `evaluate-llm-prompts.ts`)
- [x] No separate LLM calls added
- [x] Self + partner ALLOWED KEYS include all five; relationship unchanged
- [x] `DOMAIN_ALLOWED.self === 27`, `.partner === 13`
- [x] Scale 1–10; null on weak evidence; out-of-range stripped (OOR `11` → null test)
- [x] PROTECTED distinctions present (intimacy / support set / religiousObservance; Hebrew emotional תמיכה noted)
- [x] spirituality / physicalAffectionStyle / traditionalism / physicalPriority lines upgraded where locked
- [x] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [x] Story 1 metadata exports preserved (weights/domains/chip labels)
- [x] Unit tests pass — CR re-run **20** Expansion-07-matching tests; typecheck **pass**

---

## Issues

| Severity | Finding | Action |
|----------|---------|--------|
| Critical | None | — |
| Major | None | — |
| Minor | `RELATIONSHIP_EXTRACTOR_PROMPT` still says traditionalism includes “religion” and spirituality “religious bond” | **Intentional** — architect locked relationship out of scope; Story 5 may watch correlation |
| Minor | Architect §8 listed separate high/low for provider/recipient — present; null coverage is on casual + religious only (not every key) | Acceptable — matches “minimum” table spirit; Profile-C covers support triad |

---

## Review notes

- Generosity≠high-provider and emotional-תמיכה disambiguation present in self block — good.
- Partner block correctly frames desired-partner traits; partner smoke test for `religiousObservance` present.
- Exp-01–06 definition files untouched — correct.
- Absent from `compatibility-score.ts`, `tension-rules.ts`, `match-explainability.ts` — correct Story 2 scope.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-07-signal-definitions.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction.service.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction.service.spec.ts` | Agent 1 (unchanged by CR) |
| `handoffs/STORY_02_llm_extraction_prompts/agent-2-cr.md` | This handoff |

---

## Runtime topology

N/A

---

## Tests / verification

- [x] `npx jest … -t "Expansion-07"` — **20 passed** (CR re-run)
- [x] `npx tsc --noEmit -p tsconfig.json` — **pass**
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
--agent 3 expansion 07 story 2
```

**Notes:** PM closes Story 2, then Story 3 (tension rules + `EnrichedSignals`). Keep shadow / no scoring. Live Hebrew fixtures remain Story 5.
