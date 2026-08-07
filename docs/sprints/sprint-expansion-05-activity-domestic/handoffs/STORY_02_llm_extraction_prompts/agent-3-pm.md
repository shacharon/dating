# Handoff: Agent 3 — PM — Story 2

**Agent:** 3 pm  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-05-activity-domestic  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

- **Story 2 closed as Done (engineering gate).**
- LLM semantic extraction for **`physicalActivityLevel`** + **`domesticComfort`** in self-domain pipeline.
- Disambiguated from wellness / looks / socialBattery / lifestylePace via PROTECTED + SIGNAL RULES upgrades.
- Full pipeline: architect → dev → CR → pm. **Agent 4 skipped.**
- **Expansion-05 progress: 2/5 stories done.**

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Semantic LLM prompt defined | Done | `expansion-05-signal-definitions.ts` (both keys) |
| Wired into extraction pipeline | Done | `SELF_EXTRACTOR_PROMPT` in `extraction.service.ts` |
| Domain allowlist synced | Done | `DOMAIN_ALLOWED_SIGNAL_KEYS.self` (**22** keys); Expansion-05 self-only |
| Adjacent SIGNAL RULES upgraded | Done | `healthBodyConsciousness`, `lifestylePace` |
| No hardcoded patterns | Done | CR verified; no text-inference rules |
| Unit tests pass | Done | Expansion-05 **6/6**; extracted-signals **26/26** |
| Shadow mode preserved | Done | Keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Partner unchanged for Expansion-05 | Done | CR verified |
| Live LLM quality validation | Deferred | Story 5 (>85% + conflation checks) |
| Code committed | Pending user | Uncommitted in working tree |

---

## Acceptance criteria (as-built vs README)

| README AC | Status | Notes |
|-----------|--------|-------|
| LLM-only / semantic inference | ✅ | Prompt block + unit tests (mocked LLM) |
| Not conflated with socialBattery or lifestylePace | ✅ | PROTECTED + SIGNAL RULES |
| Distinct from healthBodyConsciousness | ✅ | PROTECTED + upgraded SIGNAL RULES |
| File: evaluate-layer prompts | ⏭️ | **Architect override** — extraction path used |
| Scale 0–10 | ⏭️ | **Use 1–10** per extraction stack |
| Live sample validation | ⏭️ | Story 5 |

**Engineering AC for Story 2: met** (live validation explicitly deferred).

---

## Sprint Expansion-05 progress

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
| `dating-api/src/extraction/expansion-05-signal-definitions.ts` | New semantic prompt block |
| `dating-api/src/extraction/extraction.service.ts` | Self prompt wiring + adjacent SIGNAL RULES |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Domain allowlist (22) |
| `dating-api/src/extraction/extraction.service.spec.ts` | Expansion-05 tests; overlap comment |
| `README.md` (sprint-expansion-05) | Story 2 marked Done; as-built notes |
| `handoffs/STORY_02_llm_extraction_prompts/agent-3-pm.md` | This file |

---

## Decisions preserved

- Shadow-only — no scoring/chips/tension until promote story
- Self domain for Expansion-05 rich framing; partner “quiet home → lifestylePace” left as-is
- Expansion-01–04 extraction definition files unchanged
- Interest tags remain orthogonal
- Stories 1–2 uncommitted; commit when user requests

Suggested commit (Stories 1+2 together):

```
feat(extraction): shadow allowlist + LLM prompts for physicalActivityLevel + domesticComfort

Expansion-05 Stories 1–2 — allowlist + self-domain semantic extraction; disambiguate wellness/socialBattery/lifestylePace; no scoring impact.
```

---

## Tests / verification

- [x] Expansion-05 extraction tests — **6/6**
- [x] extracted-signals specs — **26/26**
- [x] Typecheck — **pass**
- [x] Agent 4 E2E — **skipped**
- [x] CR — **approved** (agent 2)

---

## Deferred / follow-up

| Item | Owner | When |
|------|-------|------|
| Tension rules + `EnrichedSignals` | Story 3 | Next |
| Shadow overlay chips + i18n | Story 4 | After Story 3 |
| Live LLM validation + conflation regression | Story 5 | After Story 4 |
| Git commit | User | When requested |

---

## Open questions / blockers

- None blocking Story 3 start.
- Story 3 preview (architect Story 1): `activity_level_gap` (penalty 3, ≥8 vs ≤3); `domestic_out_mismatch` (penalty 3, ≥8 vs ≤3).

---

## Next story

```text
--agent 0 expansion 05 story 3
```

**Notes:** Tension rules only — extend `EnrichedSignals`, add rules + `TENSION_CHIP_BY_ID`. Do not promote to scoring. Mirror Expansion-04 Story 3 pattern.
