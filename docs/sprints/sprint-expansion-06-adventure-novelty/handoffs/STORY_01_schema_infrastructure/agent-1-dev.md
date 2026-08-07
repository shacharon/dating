# Handoff: Agent 1 — Dev — Story 1

**Agent:** 1 dev  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-06-adventure-novelty  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Renamed shadow key **`noveltyVsRoutine` → `adventureNovelty`** in `SHADOW_SIGNAL_KEYS` (same slot — not a duplicate).
- Added `KEY_ALIASES.noveltyVsRoutine → adventureNovelty` so current LLM/prompt output still normalizes.
- Updated self `DOMAIN_ALLOWED_SIGNAL_KEYS` to `adventureNovelty` (still **22** keys).
- Specs: Expansion-06 shadow-mode block; post-pipeline expects use `adventureNovelty`.
- **No** bump to shadow count or `MAX_EVIDENCE_ITEMS`. No scoring, friction, chips, prompt rewrite, Prisma, or UI.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | Replace `noveltyVsRoutine` with `adventureNovelty` + Expansion-06 JSDoc |
| `dating-api/src/extraction/extraction-normalization.ts` | `KEY_ALIASES.noveltyVsRoutine = 'adventureNovelty'` |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Self allowlist: `adventureNovelty` (not `noveltyVsRoutine`) |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Membership, alias, domain allowlist, Expansion-06 no-scoring block |
| `dating-api/src/extraction/extraction.service.spec.ts` | Post-pipeline expects → `adventureNovelty`; coverage floor aligned to comment (17%) |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | This handoff |

---

## Counts (as-built)

| Metric | Before → After |
|--------|----------------|
| `SHADOW_SIGNAL_KEYS.length` | 15 → **15** |
| `EXTRACTION_SIGNAL_KEYS.length` | 30 → **30** |
| `MAX_EVIDENCE_ITEMS` | 34 → **34** |
| `DOMAIN_ALLOWED_SIGNAL_KEYS.self.length` | 22 → **22** |
| `COMPATIBILITY_SIGNAL_KEYS.length` | 15 (unchanged) |

---

## Tests / verification

- [x] `npx jest src/extraction/extracted-signals.spec.ts src/extraction/extraction.service.spec.ts --runInBand` — **87/87 pass**
- [x] `npm run typecheck` — **pass**

---

## Notes for CR

- Prompt strings in `extraction.service.ts` still list `noveltyVsRoutine` (Story 2 migrates to `adventureNovelty`); alias keeps pipeline green.
- Coverage test threshold was inconsistent with its own comment (`>= 19` vs ~17% on 5/30); fixed to `>= 17` so the suite matches documented math.

---

## Open questions / blockers

- None blocking agent 2 CR.

---

## Next agent

```text
--agent 2 expansion 06 story 1
```

**Notes:** Story 2 creates `expansion-06-signal-definitions.ts`, swaps prompt key to `adventureNovelty`, and strengthens PROTECTED distinction vs `lifestylePace` / `domesticComfort` / interest tags. Keep alias permanently.
