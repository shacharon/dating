# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-10-conflict-recovery  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Created `expansion-10-explainability.ts` with shadow positive chips for `repairSkills` / `forgivenessStyle`.
- Wired shadow breakdown after Exp-07 in `assemble-result.ts`; resolved `_10` in `match-explainability.ts`.
- Added `CHIP_TO_TRAIT`, browse EN/HE/ES evidence, `CHIP_EVIDENCE_KEYS` **29 → 31**.
- Appended Phase 6 onboarding writing prompts to `writingPrompts.aboutMe.questions` (EN/HE/ES).
- Shadow only — no scoring promote. Agent 4 skipped.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-10-explainability.ts` | **Create** |
| `dating-api/src/matches/expansion-10-explainability.spec.ts` | **Create** |
| `dating-api/src/matches/match-explainability.ts` | `_10` resolution |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat Exp-10 breakdown |
| `dating-api/src/matches/match-explanation-traits.ts` | Two `CHIP_TO_TRAIT` entries |
| `dating-api/src/matches/match-explainability.spec.ts` | Exp-10 positive chip smokes |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Trait maps |
| `dating-ui/.../chip-evidence.ts` | Keys **31** |
| `dating-ui/src/lib/i18n/en.ts` / `he.ts` / `es.ts` | chipEvidence + writing prompts |
| `dating-ui/.../chip-evidence.spec.ts` | Exp-10 length/membership |
| `dating-ui/.../match-why-section.spec.tsx` | EN/HE chip + onboarding prompt asserts |
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | This file |

---

## Architect locks followed

- [x] Shadow overlay (not `POSITIVE_CHIP_BY_SIGNAL` / `SignalKey`)
- [x] Exact labels: Conflict recovery / Letting go & moving forward
- [x] Domain `communication` for both
- [x] Assembled after Exp-07; no Exp-08 stub
- [x] EN/HE/ES evidence exact from README
- [x] Onboarding prompts appended; no new schema fields
- [x] Prior expansion explainability files untouched

---

## Tests / verification

```bash
cd dating-api
npx jest src/matches/expansion-10-explainability.spec.ts --runInBand
npx jest src/matches/match-explainability.spec.ts --runInBand -t "Expansion-10|Conflict recovery|Letting go"
npx jest src/matches/match-explanation-traits.spec.ts --runInBand -t "Conflict recovery|Letting go"
npm run typecheck

cd ../dating-ui
npx vitest run src/app/dating/me-matches/chip-evidence.spec.ts
npx vitest run src/app/dating/me-matches/match-why-section.spec.tsx -t "Expansion-10|Conflict recovery|Letting go"
```

| Check | Result |
|-------|--------|
| expansion-10-explainability | **7/7** |
| match-explainability Exp-10 | **3** |
| match-explanation-traits Exp-10 | **2** |
| typecheck | **pass** |
| chip-evidence | **9/9** |
| match-why-section Exp-10 | **3** |

---

## Suggested commit

```
feat(matching): Expansion-10 conflict recovery positive chips and i18n

Story 4 — shadow overlay chips + EN/HE/ES evidence + onboarding writing prompts.
```

---

## Open questions / blockers

- None for Story 4 CR.
- Story 5: live Hebrew/>85%/promote. Exp-08 chips remain separate sprint debt.

---

## Next agent

```text
--agent 2 expansion 10 story 4
```

**Notes:** CR should verify shadow-only overlay, exact i18n strings, and onboarding prompt appends without new fields.
