# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-14-tolerance-intimacy-pacing  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Created `expansion-14-explainability.ts` with three synthetic positive chips:
  - `Patience match` — both `patienceTolerance` ≥ 7
  - `Pace of closeness` — both `intimacyPacing` ≥ 7 or both ≤ 3
  - `Aligned on relationship structure` — both `monogamyAlignment` ≤ 2 or both ≥ 7
- Wired assemble after Exp-13; `_14` resolution in `match-explainability.ts`.
- `CHIP_EVIDENCE_KEYS` **37 → 40**; EN/HE/ES evidence + 3 onboarding writing prompts.
- Domains: `relationship` / `intimacy` / `relationship`. Shadow only — no scoring promote.
- Agent 4 skipped.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-14-explainability.ts` | **Created** |
| `dating-api/src/matches/expansion-14-explainability.spec.ts` | **Created** (**21** tests) |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Merge after Exp-13 |
| `dating-api/src/matches/match-explainability.ts` | `_14` resolution |
| `dating-api/src/matches/match-explanation-traits.ts` | `CHIP_TO_TRAIT` ×3 |
| `dating-api/src/matches/match-explainability.spec.ts` | Positive chip smokes |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Trait maps |
| `dating-ui/.../chip-evidence.ts` | Keys **40** |
| `dating-ui/.../chip-evidence.spec.ts` | Exp-14 assert |
| `dating-ui/src/lib/i18n/{en,he,es}.ts` | Evidence + writing prompts |
| `dating-ui/.../match-why-section.spec.tsx` | Exp-14 UI smokes |

---

## Architect locks followed

- [x] Synthetic chips (not raw extraction-key pairScore)
- [x] Patience both-high only; pacing dual-band; monogamy ≤2/≥7
- [x] Both-critical patience / mono-vs-open do not emit positives
- [x] Assembled after Exp-13; no Exp-08 stub
- [x] EN/HE/ES evidence + onboarding prompts; no new schema
- [x] Still shadow-only; scored **15**

---

## Tests / verification

| Check | Result |
|-------|--------|
| `expansion-14-explainability.spec.ts` | **21/21** |
| `match-explainability.spec.ts` Exp-14 filters | **7/7** |
| `match-explanation-traits.spec.ts` Exp-14 filters | **3/3** |
| `npm run typecheck` (api) | **pass** |
| `chip-evidence.spec.ts` (vitest) | **13/13** |
| `match-why-section.spec.tsx` Exp-14 filters | **5/5** |

---

## Next agent

```text
--agent 2 expansion 14 story 4
```

**Notes:** CR checklist in architect handoff. Do not commit unless user asks.

Suggested commit:

```
feat(matching): Expansion-14 patience pacing monogamy positive chips and i18n

Story 4 — shadow overlay chips + EN/HE/ES evidence + onboarding writing prompts.
```
