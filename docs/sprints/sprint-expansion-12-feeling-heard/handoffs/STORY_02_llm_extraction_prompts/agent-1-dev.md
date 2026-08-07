# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 dev  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-12-feeling-heard  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Extended `expansion-12-signal-definitions.ts` with self + partner LLM semantic blocks (Story 1 metadata preserved).
- Wired into `extraction.service.ts` after Exp-11; ALLOWED KEYS + SIGNAL RULES; upgraded empathy / directness / emotionalDepth / physicalAffectionStyle.
- Synced `DOMAIN_ALLOWED` self **37** / partner **23**.
- Mocked unit tests for high/low/null + OOR + partner smoke (**9**).
- Shadow only — **no** scoring / tension / chips / live LLM.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-12-signal-definitions.ts` | Extended — SELF/PARTNER blocks |
| `dating-api/src/extraction/extraction.service.ts` | Import + wire + SIGNAL RULES + adjacent upgrades |
| `dating-api/src/extraction/extraction-strict-validation.ts` | DOMAIN_ALLOWED 37/23 |
| `dating-api/src/extraction/extraction.service.spec.ts` | Exp-12 describe (**9** tests) |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Domain lengths + Exp-12 DOMAIN membership |
| `dating-api/src/extraction/expansion-10-rollout.spec.ts` | Domain lengths 37/23 |
| `dating-api/src/extraction/expansion-11-rollout.spec.ts` | Domain lengths 37/23 |

---

## Architect locks followed

- [x] Extend Story 1 metadata file (not recreate)
- [x] Self + partner; relationship unchanged
- [x] Adjacent SIGNAL RULE upgrades (empathy / directness / depth / physical affection)
- [x] No regex / text-inference / evaluate-layer
- [x] No scoring promote
- [x] Live />85% deferred to Story 5

---

## Tests / verification

| Check | Result |
|-------|--------|
| `extraction.service.spec -t Expansion-12` | **9/9** |
| `extracted-signals` + Exp-10/11 rollout | **71/71** |
| `npm run typecheck` | **pass** |

---

## Explicit Non-Goals (this story)

- No tension rules (Story 3)
- No chips / i18n / onboarding copy (Story 4)
- No live Hebrew fixtures / >85% (Story 5)
- No promote to scoring

---

## Next agent

```text
--agent 2 expansion 12 story 2
```

**Notes:** CR checklist in architect handoff. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM semantic prompts for Expansion-12 listeningPresence and emotionalExpression

Story 2 — self+partner shadow extraction; adjacent SIGNAL RULE upgrades; no scoring impact.
```
