# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-11-stress-security  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Created `expansion-11-explainability.ts`: standalone `stressResponse` → `Support under pressure`; synthetic both-low jealousy → `Secure & trusting`.
- Assembled after Exp-10; `_11` resolution in `match-explainability.ts`.
- `CHIP_EVIDENCE_KEYS` **31 → 33**; EN/HE/ES evidence + onboarding writing prompts.
- Both-high jealousy does **not** emit a positive chip. Shadow only — no scoring promote.
- Agent 4 skipped.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-11-explainability.ts` | **Created** |
| `dating-api/src/matches/expansion-11-explainability.spec.ts` | **Created** — 10 tests |
| `dating-api/src/matches/match-explainability.ts` | `_11` resolution |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Merge after Exp-10 |
| `dating-api/src/matches/match-explanation-traits.ts` | CHIP_TO_TRAIT ×2 |
| `dating-api/src/matches/match-explainability.spec.ts` | Positive chip smokes |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Trait smokes |
| `dating-ui/.../chip-evidence.ts` + spec | Length **33** |
| `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts` | Evidence + prompts |
| `dating-ui/.../match-why-section.spec.tsx` | Exp-11 describe |

---

## Architect locks followed

- [x] Synthetic both-low jealousy; both-high → no positive chip
- [x] Assembled after Exp-10; no Exp-08 stub
- [x] Labels/domains exact (`emotional`)
- [x] Onboarding prompts EN/HE/ES; no new schema
- [x] No promote / keyword chip scoring

---

## Tests / verification

| Check | Result |
|-------|--------|
| `expansion-11-explainability.spec.ts` | **10/10** |
| match-explainability Exp-11 filter | **6** pass |
| match-explanation-traits Exp-11 | **2** pass |
| `npm run typecheck` (api) | **pass** |
| UI chip-evidence | **10/10** |
| UI match-why Exp-11 | **3** pass |

---

## Explicit Non-Goals (this story)

- No tension i18n
- No scoring promote / `Trust & security` positive chip invent
- No Exp-08 chips
- No live />85% (Story 5)

---

## Next agent

```text
--agent 2 expansion 11 story 4
```

**Notes:** CR checklist in architect handoff. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-11 stress and security positive chips and i18n

Story 4 — shadow overlay chips + EN/HE/ES evidence + onboarding writing prompts.
```
