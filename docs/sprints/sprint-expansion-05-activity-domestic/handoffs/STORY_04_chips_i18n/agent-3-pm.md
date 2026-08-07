# Handoff: Agent 3 — PM — Story 4

**Agent:** 3 pm  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-05-activity-domestic  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

- **Story 4 closed as Done (engineering gate).**
- Added display-only shadow positive chips **`Activity level match`** + **`Home/out balance`** via `expansion-05-explainability.ts` overlay.
- i18n evidence in EN/HE/ES + `CHIP_TO_TRAIT` for match detail/list surfaces.
- Full pipeline: architect → dev → CR → pm. **Agent 4 skipped.**
- **Expansion-05 progress: 4/5 stories done.**

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Shadow chip overlay module | Done | `expansion-05-explainability.ts` |
| Chip picker wired | Done | `assemble-result.ts` concat Expansion-01–05 for explainability only |
| Chip labels locked | Done | `Activity level match`, `Home/out balance` |
| Domains | Done | both `lifestyle` |
| `CHIP_TO_TRAIT` entries | Done | group `Lifestyle match` for both |
| i18n EN/HE/ES | Done | `en.ts`, `he.ts`, `es.ts` + `CHIP_EVIDENCE_KEYS` (23 keys) |
| Compatibility scoring unchanged | Done | Keys not in `COMPATIBILITY_SIGNAL_KEYS`; alignments DTO official-only |
| Expansion-01–04 overlay unchanged | Done | CR verified |
| Unit tests pass | Done | Backend **7/7** Expansion-05 filter; UI **20/20** |
| Visual QA (browse UI) | Deferred | Story 5 — needs live profiles with extracted shadow values |
| Code committed | Pending user | Uncommitted in working tree |

---

## Acceptance criteria

| AC | Status | Notes |
|----|--------|-------|
| Positive chips when both profiles high on shadow signals | ✅ | `pickPositiveChips` + shadow breakdown unit tests |
| Chip labels exact | ✅ | Match sprint README / architect lock |
| i18n all 3 locales | ✅ | `chip-evidence.spec.ts` validates coverage |
| Domains both `lifestyle` | ✅ | README lock |
| Browse UI visual QA | ⏭️ | Story 5 — manual smoke with real extracted profiles |
| README `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey` | ⏭️ | **Architect override** — shadow overlay until promote story |

**Engineering AC for Story 4: 4/4** (visual QA explicitly deferred to Story 5).

---

## Sprint Expansion-05 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Schema & Infrastructure | **Done** |
| 2 | LLM Extraction Prompts | **Done** |
| 3 | Tension Rules | **Done** |
| 4 | User-Facing Chips & i18n | **Done** |
| 5 | Testing & Validation | Planned |

**Sprint status:** In progress (4/5).

**Phase 2 context:** After Story 5, Expansion-05 shadow signals (`physicalActivityLevel`, `domesticComfort`) will be validated end-to-end; promote remains a future sprint.

---

## Artifacts updated

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-05-explainability.ts` | Shadow map + breakdown builder |
| `dating-api/src/matches/expansion-05-explainability.spec.ts` | Unit tests |
| `dating-api/src/matches/match-explainability.ts` | Expansion-05 shadow label/domain resolution |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat shadow breakdown merge |
| `dating-api/src/matches/match-explanation-traits.ts` | `CHIP_TO_TRAIT` entries |
| `dating-api/src/matches/match-explainability.spec.ts` | Shadow chip test |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Trait mapping tests |
| `dating-ui/src/app/dating/me-matches/chip-evidence.ts` | +2 keys |
| `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts` | chipEvidence |
| `dating-ui/src/app/dating/me-matches/match-why-section.spec.tsx` | EN + HE UI tests |
| `README.md` (sprint-expansion-05) | Story 4 marked Done |
| `handoffs/STORY_04_chips_i18n/agent-3-pm.md` | This file |

---

## Decisions preserved

- Shadow mode intact — no promote to `COMPATIBILITY_SIGNAL_KEYS` or scoring weights
- Display-only chips via overlay; official `alignments` API unchanged
- Expansion-01–04 overlay unchanged
- Both domains `lifestyle` (README lock)
- Stories 1–4 uncommitted; single commit recommended when user requests

Suggested commit (Stories 1–4):

```
feat(expansion-05): shadow activity/domestic signals — extract, friction, chips

Stories 1–4 — allowlist, LLM extraction, tension rules, positive chips + i18n; no scoring promote.
```

---

## Tests / verification

- [x] Backend Expansion-05 chips — **7/7**
- [x] UI chip-evidence + why-section — **20/20**
- [x] Typecheck — **pass**
- [x] Agent 4 E2E — **skipped**
- [x] CR — **approved** (agent 2)

---

## Deferred / follow-up

| Item | Owner | When |
|------|-------|------|
| Match-engine E2E + live LLM validation | Story 5 | Next |
| Browse UI visual QA | Operator | After re-analyze |
| Conflation regression vs wellness / socialBattery / lifestylePace | Story 5 | Next |
| Git commit | User | When requested |

---

## Open questions / blockers

- None blocking Story 5 start.
- Story 5 pattern: mirror Expansion-04 Story 5 (`compare()` E2E, optional live LLM script, UI tension chip passthrough). No Phase 1 EQ gate.

---

## Next story

```text
--agent 0 expansion 05 story 5
```

**Notes:** Final Expansion-05 story. After Story 5 PM sign-off, sprint engineering is complete in shadow mode. Next roadmap sprint: Expansion-06 (Adventure & Novelty).
