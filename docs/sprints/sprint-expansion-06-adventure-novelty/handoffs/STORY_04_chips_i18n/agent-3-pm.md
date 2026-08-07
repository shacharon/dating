# Handoff: Agent 3 — PM — Story 4

**Agent:** 3 pm  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-06-adventure-novelty  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

- **Story 4 closed as Done (engineering gate).**
- Added display-only shadow positive chip **`Adventure & novelty`** via `expansion-06-explainability.ts` overlay.
- i18n evidence in EN/HE/ES + `CHIP_TO_TRAIT` for match detail/list surfaces.
- Full pipeline: architect → dev → CR → pm. **Agent 4 skipped.**
- **Expansion-06 progress: 4/5 stories done.**

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Shadow chip overlay module | Done | `expansion-06-explainability.ts` |
| Chip picker wired | Done | `assemble-result.ts` concat Expansion-01–06 for explainability only |
| Chip label locked | Done | `Adventure & novelty` |
| Domain | Done | `lifestyle` |
| `CHIP_TO_TRAIT` entry | Done | group `Lifestyle match` |
| i18n EN/HE/ES | Done | `en.ts`, `he.ts`, `es.ts` + `CHIP_EVIDENCE_KEYS` (**24** keys) |
| Compatibility scoring unchanged | Done | Key not in `COMPATIBILITY_SIGNAL_KEYS`; alignments DTO official-only |
| Expansion-01–05 overlay unchanged | Done | CR verified |
| Unit tests pass | Done | Backend Expansion-06 filter **4/4**; UI **23/23** |
| Visual QA (browse UI) | Deferred | Story 5 — needs live profiles with extracted shadow values |
| Full 10-chip i18n audit | Deferred | Story 5 |
| Code committed | Pending user | Uncommitted in working tree |

---

## Acceptance criteria

| AC | Status | Notes |
|----|--------|-------|
| Positive chip when both profiles high on `adventureNovelty` | ✅ | `pickPositiveChips` + shadow breakdown unit tests |
| Chip label exact | ✅ | Match sprint README / architect lock |
| i18n all 3 locales | ✅ | `chip-evidence.spec.ts` validates coverage |
| Domain `lifestyle` | ✅ | README lock |
| Browse UI visual QA | ⏭️ | Story 5 — manual smoke with real extracted profiles |
| README `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | ⏭️ | **Architect override** — shadow overlay until promote story |
| Final audit all 10 expansion chips | ⏭️ | Story 5 |

**Engineering AC for Story 4: met** (visual QA / full i18n audit deferred to Story 5).

---

## Sprint Expansion-06 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Schema & Infrastructure | **Done** |
| 2 | LLM Extraction Prompts | **Done** |
| 3 | Tension Rules | **Done** |
| 4 | User-Facing Chips & i18n | **Done** |
| 5 | Testing & Validation | Planned |

**Sprint status:** In progress (4/5).

**Milestone context:** Final expansion signal (`adventureNovelty`) is extract + friction + display complete in shadow. Story 5 validates end-to-end; promote to scored “25” remains a future explicit promote story.

---

## Artifacts updated

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-06-explainability.ts` | Shadow map + breakdown builder |
| `dating-api/src/matches/expansion-06-explainability.spec.ts` | Unit tests |
| `dating-api/src/matches/match-explainability.ts` | Expansion-06 shadow label/domain resolution |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat Exp-06 shadow breakdown |
| `dating-api/src/matches/match-explanation-traits.ts` | `CHIP_TO_TRAIT` entry |
| Frontend chip-evidence + i18n + why-section specs | Exp-06 chip |
| `README.md` (sprint-expansion-06) | Story 4 marked Done |
| `handoffs/STORY_04_chips_i18n/agent-3-pm.md` | This file |

---

## Decisions preserved

- Shadow-only — no `COMPATIBILITY_SIGNAL_KEYS` promote
- Positive chips via overlay only (not official `POSITIVE_CHIP_BY_SIGNAL`)
- Tension chip remains English API string (`Novelty vs routine`)
- Stories 1–4 uncommitted; commit when user requests

Suggested commit (Stories 1–4):

```
feat(expansion-06): adventureNovelty shadow extract, tension, and chips

Rename noveltyVsRoutine; LLM prompts; novelty_routine_clash; Adventure & novelty overlay; no scoring promote.
```

---

## Tests / verification

- [x] Backend Expansion-06 chip specs — **4/4**
- [x] Frontend chip-evidence + match-why — **23/23**
- [x] CR — **approved** (agent 2)
- [x] Agent 4 E2E — **skipped**

---

## Deferred / follow-up

| Item | Owner | When |
|------|-------|------|
| Live LLM ≥85% + fixtures/validate script | Story 5 | Next |
| Match-engine `compare()` E2E (positive chip + tension + alignments exclusion) | Story 5 | Next |
| Adjacent distinction vs `lifestylePace` / `domesticComfort` | Story 5 | Next |
| Full 10-chip EN/HE/ES i18n audit | Story 5 | Next |
| Browse visual QA | Story 5 / operator | After re-analyze |
| Scoring promote / “25 signals live” | Future promote story | After Story 5 gate |
| Git commit | User | When requested |

---

## Open questions / blockers

- None blocking Story 5 start.

---

## Next story

```text
--agent 0 expansion 06 story 5
```

**Notes:** Mirror Expansion-05 Story 5 — `match-engine.spec.ts` E2E, `validate:expansion-06-extraction` fixtures, UI tension chip test if needed, regression on Exp-01–05. Keep shadow scoring lock. Agent 4 skipped.
