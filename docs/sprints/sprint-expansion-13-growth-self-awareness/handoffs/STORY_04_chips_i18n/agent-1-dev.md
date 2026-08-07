# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-13-growth-self-awareness  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Created `expansion-13-explainability.ts`: synthetic both-high growth (≥7) → `Grows together` (`growthGrowsTogether`); synthetic both-high awareness (≥7) → `Self-awareness match` (`selfAwarenessMatch`). Domain **`personal`** for both.
- Assembled after Exp-12; `_13` resolution in `match-explainability.ts`.
- `CHIP_EVIDENCE_KEYS` **35 → 37**; EN/HE/ES evidence + Phase 6 onboarding writing prompts.
- Both-low / gap / below-7 does **not** emit either positive. Shadow only — no scoring promote.
- Agent 4 skipped.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-13-explainability.ts` | **Created** |
| `dating-api/src/matches/expansion-13-explainability.spec.ts` | **Created** — 15 tests |
| `dating-api/src/matches/match-explainability.ts` | `_13` resolution |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Merge after Exp-12 |
| `dating-api/src/matches/match-explanation-traits.ts` | CHIP_TO_TRAIT ×2 |
| `dating-api/src/matches/match-explainability.spec.ts` | Positive chip smokes |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Trait smokes |
| `dating-ui/.../chip-evidence.ts` + spec | Length **37** |
| `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts` | Evidence + prompts |
| `dating-ui/.../match-why-section.spec.tsx` | Exp-13 describe |

---

## Architect locks followed

- [x] Both chips synthetic both-high (≥7); both-low / gap / mid → no positive
- [x] No standalone `growthMindset` / `selfAwareness` pairScore chip keys
- [x] Assembled after Exp-12; no Exp-08 stub
- [x] Labels/domains exact (`personal` / `personal`)
- [x] Meta chips `Openness to growth` / `Self-awareness` not used as browse positives
- [x] Onboarding prompts EN/HE/ES; no new schema
- [x] No promote / keyword chip scoring / tension i18n / scored `SIGNAL_DOMAIN` extend

---

## Tests / verification

| Check | Result |
|-------|--------|
| Backend Exp-13 explainability filter | **22** pass |
| `npm run typecheck` (api) | **pass** |
| UI chip-evidence + match-why Exp-13 filter | **9** pass |

---

## Explicit Non-Goals (this story)

- No tension i18n
- No scoring promote / `COMPATIBILITY_SIGNAL_KEYS`
- No Exp-08 chips
- No live />85% (Story 5)

---

## Next agent

```text
--agent 2 expansion 13 story 4
```

**Notes:** CR checklist in architect handoff. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-13 growth and self-awareness positive chips and i18n

Story 4 — shadow overlay chips + EN/HE/ES evidence + onboarding writing prompts.
```
