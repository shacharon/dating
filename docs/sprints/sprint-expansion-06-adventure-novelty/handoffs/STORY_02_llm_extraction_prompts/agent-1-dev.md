# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 dev  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-06-adventure-novelty  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Created **`expansion-06-signal-definitions.ts`** with LLM-first `adventureNovelty` semantic block (PROTECTED vs pace / domestic / tags / etc.).
- Wired into `SELF_EXTRACTOR_PROMPT` after Expansion-05.
- Migrated prompt ALLOWED KEYS + SIGNAL RULES: `noveltyVsRoutine` → `adventureNovelty`; upgraded `lifestylePace` rule (tempo ≠ novelty).
- Renamed PROTECTED distinction refs in Expansion-03/04/05 definition files.
- Added Expansion-06 mock-LLM unit tests (canonical + alias + null + OOR).
- `DOMAIN_ALLOWED.self` unchanged (Story 1). Alias kept. No scoring / tension / evaluate / regex.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-06-signal-definitions.ts` | **Created** — `EXPANSION_06_SELF_SHADOW_SIGNAL_BLOCK` |
| `dating-api/src/extraction/extraction.service.ts` | Import + inject block; ALLOWED KEYS / SIGNAL RULES migrate + lifestylePace upgrade |
| `dating-api/src/extraction/expansion-03-signal-definitions.ts` | PROTECTED: `adventureNovelty` |
| `dating-api/src/extraction/expansion-04-signal-definitions.ts` | PROTECTED: `adventureNovelty` (×2) |
| `dating-api/src/extraction/expansion-05-signal-definitions.ts` | PROTECTED: `adventureNovelty` (×2) |
| `dating-api/src/extraction/extraction.service.spec.ts` | `describe('Expansion-06 shadow signals')` — 5 tests |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | This handoff |

---

## Verification notes

- Self allowlist still **22** with `adventureNovelty` (Story 1).
- `KEY_ALIASES.noveltyVsRoutine` still maps to `adventureNovelty`.
- Prompt strings no longer contain `noveltyVsRoutine` (only alias + JSDoc + intentional mock inputs).

---

## Tests / verification

- [x] `npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-06"` — **5/5 pass**
- [x] `npx jest src/extraction/extracted-signals.spec.ts --runInBand` — **31/31 pass**
- [x] Full `extraction.service.spec.ts` — **61/61 pass**
- [x] `npm run typecheck` — **pass**

---

## Open questions / blockers

- None blocking agent 2 CR.

---

## Next agent

```text
--agent 2 expansion 06 story 2
```

**Notes:** Story 3 adds `novelty_routine_clash` tension (penalty 4). Keep alias permanently. Live LLM gate is Story 5.
