# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 dev  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-05-activity-domestic  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Created `expansion-05-signal-definitions.ts` with semantic blocks for `physicalActivityLevel` + `domesticComfort`.
- Wired into `SELF_EXTRACTOR_PROMPT` only (ALLOWED KEYS + SIGNAL RULES + Expansion-05 block after Expansion-04).
- Upgraded SIGNAL RULES for `healthBodyConsciousness` and `lifestylePace` to reduce conflation.
- Extended `DOMAIN_ALLOWED_SIGNAL_KEYS.self` to **22** keys (self-domain only).
- Added 6 mocked-LLM unit tests. Shadow mode unchanged — no scoring.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-05-signal-definitions.ts` | **Created** — Expansion-05 self shadow prompt block |
| `dating-api/src/extraction/extraction.service.ts` | Import + ALLOWED KEYS + SIGNAL RULES upgrades + Expansion-05 block |
| `dating-api/src/extraction/extraction-strict-validation.ts` | `self` allowlist +2 keys → 22 |
| `dating-api/src/extraction/extraction.service.spec.ts` | Expansion-05 describe (6 tests); stale signal-count comment → 30/15 |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | This handoff |

---

## As-built locks confirmed

| Lock | Status |
|------|--------|
| Scale 1–10 or null | ✅ |
| Self-domain only (not partner/relationship) | ✅ |
| No regex / text-inference | ✅ |
| No evaluate-layer extraction | ✅ |
| PROTECTED vs wellness / looks / socialBattery / lifestylePace / tags | ✅ |
| Expansion-01–04 definition files untouched | ✅ |
| Still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`) | ✅ |

---

## Tests / verification

- [x] `npx jest extraction.service.spec.ts -t "Expansion-05"` — **6/6 pass**
- [x] `npx jest extracted-signals.spec.ts` — **26/26 pass**
- [x] `npm run typecheck` — **pass**

---

## Open questions / blockers

- None blocking agent 2 CR.

---

## Next agent

```text
--agent 2 expansion 05 story 2
```

**Notes:** Verify SIGNAL RULES upgrades for adjacent official keys, 22-key self allowlist, PROTECTED lines, zero regex scoring.
