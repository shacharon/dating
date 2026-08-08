# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 dev  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-15-family-social-ecosystem  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Extended `expansion-15-signal-definitions.ts` with self + partner LLM semantic blocks (Story 1 metadata preserved).
- Wired into `extraction.service.ts` after Exp-14; ALLOWED KEYS + SIGNAL RULES; upgraded independence / socialBattery (self) and traditionalism / socialBattery (partner).
- Synced `DOMAIN_ALLOWED` self **45** / partner **31**.
- Mocked unit tests for 3× high/low/null + OOR + partner smoke (**13**).
- Shadow only — **no** scoring / tension / chips / live LLM / Phase 6 promote-all.
- `friendCoupleBalance` polarity locked: low = friends-first, high = couple-centric.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-15-signal-definitions.ts` | Extended — SELF/PARTNER blocks |
| `dating-api/src/extraction/extraction.service.ts` | Import + wire + SIGNAL RULES + adjacent upgrades + HARD SEMANTIC GUARD notes |
| `dating-api/src/extraction/extraction-strict-validation.ts` | DOMAIN_ALLOWED 45/31 |
| `dating-api/src/extraction/extraction.service.spec.ts` | Exp-15 describe (**13** tests) |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Domain lengths + Exp-15 DOMAIN membership |
| `dating-api/src/extraction/expansion-10-rollout.spec.ts` | Domain lengths 45/31 |
| `dating-api/src/extraction/expansion-11-rollout.spec.ts` | Domain lengths 45/31 |
| `dating-api/src/extraction/expansion-12-rollout.spec.ts` | Domain lengths 45/31 |
| `dating-api/src/extraction/expansion-13-rollout.spec.ts` | Domain lengths 45/31 |
| `dating-api/src/extraction/expansion-14-rollout.spec.ts` | Domain lengths 45/31 |

---

## Architect locks followed

- [x] Extend metadata file — do not recreate
- [x] Self + partner; relationship unchanged
- [x] PROTECTED vs traditionalism / socialBattery / independence
- [x] Adjacent SIGNAL RULE upgrades (append, not replace)
- [x] Partner `traditionalism` family-involvement carve-out → familyEnmeshment
- [x] `friendCoupleBalance` polarity: low = friends-first, high = couple-centric
- [x] Zero regex / text-inference / evaluate-layer
- [x] Still shadow-only; scored **15**
- [x] Live />85% deferred to Story 5

---

## Tests / verification

| Check | Result |
|-------|--------|
| `extraction.service.spec.ts -t Expansion-15` | **13/13** |
| `extracted-signals.spec.ts` | **77/77** pass |
| Exp-10/11/12/13/14 rollout | **30/30** pass |
| `npm run typecheck` | **pass** |

---

## Next agent

```text
--agent 2 expansion 15 story 2
```

**Notes:** CR checklist in architect handoff. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for Expansion-15 family social ecosystem signals

Story 2 — self+partner shadow extraction; adjacent SIGNAL RULE upgrades; no scoring impact.
```
