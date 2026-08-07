# Handoff: Agent 1 — Dev — Story 1

**Agent:** 1 dev  
**Story:** [README.md — STORY 1: Schema & Infrastructure](../../README.md)  
**Sprint:** sprint-expansion-05-activity-domestic  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Appended **`physicalActivityLevel`** + **`domesticComfort`** to `SHADOW_SIGNAL_KEYS` only (both net-new), with distinction comments.
- Bumped `MAX_EVIDENCE_ITEMS` **32 → 34** (15 shadow / 30 total extraction keys).
- Added Expansion-05 shadow-mode regression block in specs.
- No scoring, friction, chips, prompts, Prisma, or UI changes.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-signals.interface.ts` | +`physicalActivityLevel`, +`domesticComfort`; `MAX_EVIDENCE_ITEMS = 34`; Expansion-05 distinction comments |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Counts 15/30/34; Expansion-05 membership + no-scoring regression |
| `handoffs/STORY_01_schema_infrastructure/agent-1-dev.md` | This handoff |

---

## Counts (as-built)

| Metric | Before → After |
|--------|----------------|
| `SHADOW_SIGNAL_KEYS.length` | 13 → **15** |
| `EXTRACTION_SIGNAL_KEYS.length` | 28 → **30** |
| `MAX_EVIDENCE_ITEMS` | 32 → **34** |
| `COMPATIBILITY_SIGNAL_KEYS.length` | 15 (unchanged) |

---

## Tests / verification

- [x] `npx jest src/extraction/extracted-signals.spec.ts --runInBand` — **26/26 pass**
- [x] `npm run typecheck` — **pass**

---

## Open questions / blockers

- None blocking agent 2 CR.

---

## Next agent

```text
--agent 2 expansion 05 story 1
```

**Notes:** Story 2 adds LLM prompts via `expansion-05-signal-definitions.ts` for both keys (self-domain). Must PROTECT against conflation with `healthBodyConsciousness`, `socialBattery`, `lifestylePace`, `physicalPriority`.
