# Handoff: Agent 3 — PM — Story 3

**Agent:** 3 pm  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-06-adventure-novelty  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

- **Story 3 closed as Done (engineering gate).**
- Added `novelty_routine_clash` tension rule + explainability chip label for `adventureNovelty`.
- Full pipeline: architect → dev → CR → pm. **Agent 4 skipped.**
- **Expansion-06 progress: 3/5 stories done.**

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Tension rule in `tension-rules.ts` | Done | After Expansion-05 `domestic_out_mismatch` |
| `EnrichedSignals` extended | Done | `adventureNovelty` (not legacy alias) |
| Tension chip label | Done | `'Novelty vs routine'` in `TENSION_CHIP_BY_ID` |
| Thresholds / penalty | Done | ≥8 vs ≤3, penalty **4**; CR verified |
| Null guard (legacy profiles) | Done | Rule skips when either side null |
| Compatibility scoring unchanged | Done | Key not in `COMPATIBILITY_SIGNAL_KEYS` |
| Unit tests pass | Done | Friction **5/5**; explainability **2/2** |
| Code committed | Pending user | Uncommitted in working tree |

---

## Acceptance criteria

| AC | Status | Notes |
|----|--------|-------|
| Rule fires when thresholds met | ✅ | 5 friction unit tests incl. ≤3 boundary |
| Penalty applies via friction | ✅ | Friction → `finalScore` when both have shadow values |
| Chip label display | ✅ | API `explainability.tensionChip` (English) |
| Alone surfaces chip | ✅ | Penalty 4 ≥ friction gate (≥3) |
| Positive chips / i18n | ⏭️ | Story 4 |

**Engineering AC for Story 3: met.**

---

## Sprint Expansion-06 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Schema & Infrastructure | **Done** |
| 2 | LLM Extraction Prompts | **Done** |
| 3 | Tension Rules | **Done** |
| 4 | User-Facing Chips & i18n | Planned |
| 5 | Testing & Validation | Planned |

**Sprint status:** In progress (3/5).

---

## Artifacts updated

| Path | Change |
|------|--------|
| `dating-api/src/engine/tension-rules.ts` | `adventureNovelty` + `novelty_routine_clash` |
| `dating-api/src/matches/match-explainability.ts` | Tension chip label |
| Specs | Friction + explainability Expansion-06 tests |
| `README.md` (sprint-expansion-06) | Story 3 marked Done |
| `handoffs/STORY_03_tension_rules/agent-3-pm.md` | This file |

---

## Decisions preserved

- Shadow-only — no `COMPATIBILITY_SIGNAL_KEYS` promote
- Penalty **4** outranks Expansion-05 penalty-3 rules when stacked for chip pick
- Distinct from `lifestyle_pace_mismatch` / `domestic_out_mismatch`
- Stories 1–3 uncommitted; commit when user requests

Suggested commit (Stories 1–3):

```
feat(expansion-06): adventureNovelty shadow extract + novelty_routine_clash

Rename noveltyVsRoutine, LLM prompts, friction tension; no compatibility promote.
```

---

## Tests / verification

- [x] Friction Expansion-06 — **5/5**
- [x] Explainability Expansion-06 — **2/2**
- [x] Typecheck — **pass**
- [x] Agent 4 E2E — **skipped**
- [x] CR — **approved** (agent 2)

---

## Deferred / follow-up

| Item | Owner | When |
|------|-------|------|
| Positive chip `Adventure & novelty` + EN/HE/ES evidence | Story 4 | Next |
| Shadow overlay `expansion-06-explainability.ts` + assemble merge | Story 4 | Next |
| Live LLM ≥85% + match-engine E2E | Story 5 | After Story 4 |
| Git commit | User | When requested |

---

## Open questions / blockers

- None blocking Story 4 start.

---

## Next story

```text
--agent 0 expansion 06 story 4
```

**Notes:** Mirror Expansion-05 Story 4 — positive chip via shadow overlay module (not `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey`), merge in `assemble-result.ts` for chip picker only, i18n EN/HE/ES evidence strings.
