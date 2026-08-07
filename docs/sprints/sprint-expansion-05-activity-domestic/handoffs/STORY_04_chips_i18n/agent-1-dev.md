# Handoff: Agent 1 — Dev — Story 4

**Agent:** 1 dev  
**Story:** [README.md — STORY 4: User-Facing Chips & i18n](../../README.md)  
**Sprint:** sprint-expansion-05-activity-domestic  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Created `expansion-05-explainability.ts` shadow overlay for **`Activity level match`** + **`Home/out balance`** (both domain `lifestyle`).
- Merged into chip picker via `assemble-result.ts`; wired label/domain resolution in `match-explainability.ts`.
- Added `CHIP_TO_TRAIT` + i18n EN/HE/ES + `CHIP_EVIDENCE_KEYS` (23).
- Shadow scoring unchanged — display only.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/matches/expansion-05-explainability.ts` | **Created** — shadow map + breakdown |
| `dating-api/src/matches/expansion-05-explainability.spec.ts` | **Created** |
| `dating-api/src/matches/match-explainability.ts` | Expansion-05 resolution |
| `dating-api/src/matches/compare-stages/assemble-result.ts` | Concat Expansion-05 breakdown |
| `dating-api/src/matches/match-explanation-traits.ts` | `CHIP_TO_TRAIT` entries |
| `dating-api/src/matches/match-explainability.spec.ts` | Expansion-05 chip test |
| `dating-api/src/matches/match-explanation-traits.spec.ts` | Trait mapping tests |
| `dating-ui/.../chip-evidence.ts` | +2 keys (23 total) |
| `dating-ui/src/lib/i18n/en.ts`, `he.ts`, `es.ts` | chipEvidence |
| `dating-ui/.../match-why-section.spec.tsx` | EN + HE UI tests |
| `handoffs/STORY_04_chips_i18n/agent-1-dev.md` | This handoff |

---

## As-built locks confirmed

| Lock | Status |
|------|--------|
| Chip labels exact | ✅ |
| Domains both `lifestyle` | ✅ |
| No `COMPATIBILITY_SIGNAL_KEYS` / `POSITIVE_CHIP_BY_SIGNAL` on SignalKey | ✅ |
| Alignments DTO not fed shadow breakdown | ✅ |
| Expansion-01–04 overlay unchanged | ✅ |
| i18n EN/HE/ES | ✅ |

---

## Tests / verification

- [x] Backend Expansion-05 filter — **7/7 pass**
- [x] `npm run typecheck` — **pass**
- [x] UI `chip-evidence` + `match-why-section` — **20/20 pass** (vitest teardown `window is not defined` warnings — pre-existing)

---

## Open questions / blockers

- None blocking agent 2 CR.
- Browse visual QA deferred to Story 5 / operator.

---

## Next agent

```text
--agent 2 expansion 05 story 4
```

**Notes:** Verify labels, lifestyle domains, chip-picker-only merge, i18n sync, Expansion-01–04 untouched.
