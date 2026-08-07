# Handoff: Agent 3 — PM — Story 2

**Agent:** 3 pm  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-08-education-integrity-lifestyle  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

- **Story 2 closed as Done (engineering gate).**
- LLM semantic extraction for all four Expansion-08 signals on **self + partner** domains.
- `DOMAIN_ALLOWED` self **31** / partner **17**; relationship unchanged; scored set still **15**.
- Full pipeline: architect → dev → CR → pm. **Agent 4 skipped.**
- **Expansion-08 progress: 2/5 stories done.**

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Semantic LLM prompts defined | Done | Self + partner blocks in `expansion-08-signal-definitions.ts` |
| Wired into extraction pipeline | Done | `SELF_EXTRACTOR_PROMPT` + `PARTNER_EXTRACTOR_PROMPT` |
| Domain allowlists synced | Done | Self **31**, partner **17** |
| Adjacent SIGNAL RULES upgraded | Done | directness, intellectualCuriosity, lifestylePace, ambition, physicalPriority |
| Ethical null rules | Done | Race/ethnicity + anatomy-only in prompt blocks |
| No hardcoded patterns | Done | CR verified; no text-inference rules |
| Unit tests pass | Done | Expansion-08 filter **14** (PM re-check); CR **19** matching |
| Shadow mode preserved | Done | Keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Story 1 metadata preserved | Done | Weights/tiers/domains/chip labels intact |
| Category storage schema | Deferred | Score alone for v1; Story 3 if clash needs it |
| Live Hebrew / >85% validation | Deferred | Story 5 |
| Code committed | Pending user | Uncommitted in working tree |

---

## Acceptance criteria (as-built vs README)

| README AC | Status | Notes |
|-----------|--------|-------|
| LLM-only / null when unclear | ✅ | Prompt blocks + mocked unit tests |
| Racist / anatomy-only → null | ✅ | Prompt ethical lock; live fixtures Story 5 |
| NO hardcoded patterns | ✅ | CR verified |
| Hebrew regression fixtures | ⏭️ | **Architect override** — Story 5 |
| >85% agreement | ⏭️ | Story 5 |
| Category metadata storage | ⏭️ | **Architect override** — score alone for v1 |
| Evaluate-layer prompts | ⏭️ | **Architect override** — extraction path used |
| Scale 0–10 elsewhere | ⏭️ | **Use 1–10** per extraction stack |

**Engineering AC for Story 2: met** (live validation explicitly deferred).

---

## Sprint Expansion-08 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Schema & Infrastructure | **Done** |
| 2 | LLM Extraction Prompts | **Done** |
| 3 | Tension Rules | Planned |
| 4 | User-Facing Chips & i18n | Planned |
| 5 | Testing, Validation & Hebrew Regression | Planned |

**Sprint status:** In progress (2/5).

**Milestone context:** Expansion-08 signals extractable in shadow (self + partner); still not scored. Promote remains optional at Story 5 / later.

---

## Artifacts updated

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-08-signal-definitions.ts` | Self + partner LLM blocks |
| `dating-api/src/extraction/extraction.service.ts` | Self + partner wiring |
| `dating-api/src/extraction/extraction-strict-validation.ts` | DOMAIN_ALLOWED sync |
| `dating-api/src/extraction/extraction.service.spec.ts` | Expansion-08 mock tests |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Domain length + allowlist |
| `README.md` (sprint-expansion-08) | Story 2 marked Done + as-built notes |
| `handoffs/STORY_02_llm_extraction_prompts/agent-3-pm.md` | This file |

---

## Decisions preserved

- Shadow-first — do **not** add Exp-08 keys to `COMPATIBILITY_SIGNAL_KEYS` until explicit promote.
- Scale **1–10 or null**.
- Self **and** partner domains; relationship unchanged.
- Score-only for `physicalTypePreference` in v1 (no category schema).
- Ethical: race/ethnicity and sexual-anatomy preferences never scored.
- Agent 4 skipped.

Suggested commit (Expansion-08 Story 2):

```
feat(extraction): LLM semantic prompts for Expansion-08 education/integrity/lifestyle signals

Story 2 — self+partner shadow extraction; no scoring impact.
```

---

## Tests / verification

- [x] Expansion-08 extraction.service tests — **14/14** (PM re-check)
- [x] Expansion-08 matching specs — **19** (CR)
- [x] Typecheck — **pass** (CR)
- [x] Agent 4 E2E — **skipped**
- [x] CR — **approved** (agent 2)

---

## Deferred / follow-up

| Item | Owner | When |
|------|-------|------|
| Tension rules + `EnrichedSignals` (3 rules + category-gated physical-type clash) | Story 3 | Next |
| Shadow overlay chips + i18n EN/HE/ES | Story 4 | After Story 3 |
| Live Hebrew fixtures + >85% + optional promote | Story 5 | After Story 4 |
| Structured physical-type category storage | Story 3 | If clash needs it |
| Git commit | User | When requested |

---

## Open questions / blockers

- None blocking Story 3 start.
- Story 3: implement `education_level_gap`, `honesty_integrity_gap`, `chronotype_clash` fully; soft-skip `physical_type_specificity_clash` without categories.

---

## Next story

```text
--agent 0 expansion 08 story 3
```

**Notes:** Mandatory read `LLM_FIRST_PRINCIPLE.md`. Keep shadow / no scoring. Tension rules only — no promote.
