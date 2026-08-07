# Handoff: Agent 3 — PM — Story 2

**Agent:** 3 pm  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-06-adventure-novelty  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

- **Story 2 closed as Done (engineering gate).**
- LLM semantic extraction for **`adventureNovelty`** in self-domain pipeline (prompt migration from `noveltyVsRoutine`).
- Disambiguated from `lifestylePace` / `domesticComfort` / interest tags via PROTECTED + SIGNAL RULES; Exp-03/04/05 PROTECTED refs renamed.
- Full pipeline: architect → dev → CR → pm. **Agent 4 skipped.**
- **Expansion-06 progress: 2/5 stories done.**

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Semantic LLM prompt defined | Done | `expansion-06-signal-definitions.ts` |
| Wired into extraction pipeline | Done | `SELF_EXTRACTOR_PROMPT` in `extraction.service.ts` |
| Prompt key migrated | Done | ALLOWED KEYS + SIGNAL RULES use `adventureNovelty` |
| Legacy alias retained | Done | `KEY_ALIASES.noveltyVsRoutine` |
| Domain allowlist synced | Done | Self **22** (Story 1); Expansion-06 self-only |
| Adjacent SIGNAL RULES upgraded | Done | `lifestylePace` mentions novelty-vs-routine |
| No hardcoded patterns | Done | CR verified; no text-inference rules |
| Unit tests pass | Done | Expansion-06 **5/5**; extracted-signals **31/31** |
| Shadow mode preserved | Done | Key not in `COMPATIBILITY_SIGNAL_KEYS` |
| Partner unchanged for Expansion-06 | Done | CR verified |
| Live LLM quality validation | Deferred | Story 5 (>85% + conflation checks) |
| Code committed | Pending user | Uncommitted in working tree |

---

## Acceptance criteria (as-built vs README)

| README AC | Status | Notes |
|-----------|--------|-------|
| LLM-only / semantic inference | ✅ | Prompt block + unit tests (mocked LLM) |
| Distinguish from lifestylePace + travel tag | ✅ | PROTECTED + SIGNAL RULES |
| File: evaluate-layer prompts | ⏭️ | **Architect override** — extraction path used |
| Scale 0–10 | ⏭️ | **Use 1–10** per extraction stack |
| Live sample validation | ⏭️ | Story 5 |

**Engineering AC for Story 2: met** (live validation explicitly deferred).

---

## Sprint Expansion-06 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Schema & Infrastructure | **Done** |
| 2 | LLM Extraction Prompts | **Done** |
| 3 | Tension Rules | Planned |
| 4 | User-Facing Chips & i18n | Planned |
| 5 | Testing & Validation | Planned |

**Sprint status:** In progress (2/5).

**Milestone context:** Final expansion signal wired for extraction in shadow; still not scored.

---

## Artifacts updated

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-06-signal-definitions.ts` | New semantic prompt block |
| `dating-api/src/extraction/extraction.service.ts` | Self prompt wiring + SIGNAL RULES migrate |
| `dating-api/src/extraction/expansion-0{3,4,5}-signal-definitions.ts` | PROTECTED rename to `adventureNovelty` |
| `dating-api/src/extraction/extraction.service.spec.ts` | Expansion-06 tests |
| `README.md` (sprint-expansion-06) | Story 2 marked Done + as-built notes |
| `handoffs/STORY_02_llm_extraction_prompts/agent-3-pm.md` | This file |

---

## Decisions preserved

- Shadow-only — no scoring/chips/tension until later stories / promote
- Self domain for Expansion-06 rich framing; partner “adventurous → lifestylePace” left as-is (CR minor)
- Keep `KEY_ALIASES.noveltyVsRoutine` permanently
- Interest tags remain orthogonal
- Stories 1–2 uncommitted; commit when user requests

Suggested commit (Stories 1+2 together):

```
feat(extraction): adventureNovelty shadow key + LLM prompts

Expansion-06 Stories 1–2 — rename noveltyVsRoutine, alias, self-domain extraction; no scoring impact.
```

---

## Tests / verification

- [x] Expansion-06 unit tests — **5/5**
- [x] Shape specs — **31/31**
- [x] Typecheck — **pass**
- [x] Agent 4 E2E — **skipped**
- [x] CR — **approved** (agent 2)

---

## Deferred / follow-up

| Item | Owner | When |
|------|-------|------|
| Tension `novelty_routine_clash` (penalty 4, ≥8 vs ≤3) + `EnrichedSignals` | Story 3 | Next |
| Shadow overlay chip + i18n | Story 4 | After Story 3 |
| Live LLM ≥85% + conflation vs pace/domestic | Story 5 | After Story 4 |
| Partner prompt “adventurous → lifestylePace” correlation watch | Story 5 | Optional note |
| Git commit | User | When requested |

---

## Open questions / blockers

- None blocking Story 3 start.

---

## Next story

```text
--agent 0 expansion 06 story 3
```

**Notes:** Mandatory read `LLM_FIRST_PRINCIPLE.md` not required for tension (deterministic rules), but keep shadow mode — extend `EnrichedSignals` + `tension-rules.ts` only; do **not** promote to `COMPATIBILITY_SIGNAL_KEYS`. Mirror Expansion-05 Story 3 overlay/friction pattern for shadow keys.
