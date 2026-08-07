# Handoff: Agent 1 — Dev — Story 3

**Agent:** 1 dev  
**Story:** [README.md — STORY 3: Tension Rules](../../README.md)  
**Sprint:** sprint-expansion-10-conflict-recovery  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Extended `EnrichedSignals` with `repairSkills` + `forgivenessStyle`.
- Appended three shadow tension rules after `chronotype_clash`: `repair_skills_gap` (5), `both_low_repair` (6), `forgiveness_style_gap` (4).
- Added three English `TENSION_CHIP_BY_ID` labels.
- Unit tests cover fire / reverse / null / below / boundaries + both-low exclusivity vs gap.
- Shadow only — no scoring promote / positive chips / i18n. Agent 4 skipped.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/engine/tension-rules.ts` | `EnrichedSignals` +2 fields; three rules |
| `dating-api/src/matches/match-explainability.ts` | Three `TENSION_CHIP_BY_ID` entries |
| `dating-api/src/engine/compute-friction.spec.ts` | `describe('Expansion-10 shadow tension rules')` — 15 tests |
| `dating-api/src/matches/match-explainability.spec.ts` | Label map + three chip smokes |
| `handoffs/STORY_03_tension_rules/agent-1-dev.md` | This file |

---

## Architect locks followed

- [x] Exact ids / penalties / predicates / explains from README
- [x] Null guards on all three rules
- [x] Both-low fires `both_low_repair` without `repair_skills_gap`
- [x] Chip labels exact: Different repair styles / Conflict recovery risk / Different forgiveness pace
- [x] No `COMPATIBILITY_SIGNAL_KEYS` / positive-chip / i18n / extraction drift
- [x] No conflictStyle tension rule invented

---

## Tests / verification

```bash
cd dating-api
npx jest src/engine/compute-friction.spec.ts --runInBand -t "Expansion-10"
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-10|both_low_repair|repair_skills_gap|forgiveness_style_gap"
npm run typecheck
```

| Check | Result |
|-------|--------|
| Expansion-10 friction specs | **15/15** pass |
| Expansion-10 explainability specs | **4** pass (map + 3 smokes) |
| `npm run typecheck` | **pass** |

---

## Suggested commit

```
feat(matching): Expansion-10 repairSkills and forgivenessStyle shadow tension rules

Story 3 — three friction rules + English tension chip labels; no scoring promote.
```

---

## Open questions / blockers

- None for Story 3 CR.
- Story 4: positive chips + i18n + onboarding. Story 5: live/>85%/promote.

---

## Next agent

```text
--agent 2 expansion 10 story 3
```

**Notes:** CR should verify exact penalties (5/6/4), both-low exclusivity, and chip label strings.
