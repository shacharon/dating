# Handoff: Agent 3 — PM — Story 3

**Agent:** 3 pm  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-05-activity-domestic  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

- **Story 3 closed as Done (engineering gate).**
- Added `activity_level_gap` + `domestic_out_mismatch` tension rules with explainability chip labels.
- Full pipeline: architect → dev → CR → pm. **Agent 4 skipped.**
- **Expansion-05 progress: 3/5 stories done.**

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Tension rules in `tension-rules.ts` | Done | Both rules after Expansion-04 `creative_mismatch` |
| `EnrichedSignals` extended | Done | `physicalActivityLevel`, `domesticComfort` |
| Tension chip labels | Done | Exact README strings in `TENSION_CHIP_BY_ID` |
| Thresholds / penalties | Done | Both ≥8 vs ≤3, penalty **3**; CR verified |
| Null guard (legacy profiles) | Done | Rules skip when either side null |
| Compatibility scoring unchanged | Done | Keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Unit tests pass | Done | Friction **9/9**; explainability **3/3** |
| Code committed | Pending user | Uncommitted in working tree |

---

## Acceptance criteria

| AC | Status | Notes |
|----|--------|-------|
| Rules fire when thresholds met | ✅ | 9 friction unit tests incl. ≤3 boundary |
| Penalties apply via friction | ✅ | Friction → `finalScore` when both have shadow values |
| Chip labels display | ✅ | API `explainability.tensionChip` (English) |
| Each rule alone surfaces chip | ✅ | Penalty 3 ≥ friction gate |
| Positive chips / i18n | ⏭️ | Story 4 |

**Engineering AC for Story 3: 3/3**

---

## Sprint Expansion-05 progress

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
| `dating-api/src/engine/tension-rules.ts` | Rules + interface |
| `dating-api/src/matches/match-explainability.ts` | Chip labels |
| `dating-api/src/engine/compute-friction.spec.ts` | Expansion-05 tests |
| `dating-api/src/matches/match-explainability.spec.ts` | Chip resolution tests |
| `README.md` (sprint-expansion-05) | Story 3 marked Done |
| `handoffs/STORY_03_tension_rules/agent-3-pm.md` | This file |

---

## Decisions preserved

- Shadow compatibility keys unchanged — friction-only partial rollout
- Tension chips English-only in API (consistent with existing)
- Expansion-01–04 tension rules unchanged
- Stories 1–3 uncommitted; single commit recommended when user requests

Suggested commit (Stories 1–3):

```
feat(expansion-05): shadow physicalActivityLevel + domesticComfort — extract and tension

Stories 1–3 — allowlist, LLM self-domain extraction, activity_level_gap / domestic_out_mismatch friction; no compatibility scoring yet.
```

---

## Tests / verification

- [x] Expansion-05 friction — **9/9**
- [x] Explainability chips — **3/3**
- [x] Typecheck — **pass**
- [x] Agent 4 E2E — **skipped** (N/A)
- [x] CR — **approved** (agent 2)

---

## Deferred / follow-up

| Item | Owner | When |
|------|-------|------|
| Positive chips + i18n EN/HE/ES | Story 4 | Next |
| Match-engine E2E + live LLM validation | Story 5 | After Story 4 |
| Git commit | User | When requested |

---

## Open questions / blockers

- None blocking Story 4 start.
- Story 4: shadow overlay `expansion-05-explainability.ts` — chips `Activity level match` / `Home/out balance`; domain `lifestyle` both; merge in `assemble-result.ts` like Expansion-01–04.

---

## Next story

```text
--agent 0 expansion 05 story 4
```

**Notes:** Positive chips while shadow — overlay module only; do **not** add to `POSITIVE_CHIP_BY_SIGNAL` on `SignalKey`. Evidence strings from sprint README.
