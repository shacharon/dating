# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 dev  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-02-regulation-affection  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

---

## Summary

- Created `expansion-02-signal-definitions.ts` with semantic LLM prompt block for both shadow signals.
- Wired block into `SELF_EXTRACTOR_PROMPT` (ALLOWED KEYS + SIGNAL RULES + injected after Expansion-01 block).
- Synced `DOMAIN_ALLOWED_SIGNAL_KEYS.self` with prompt allowlist (18 keys).
- Added 6 unit tests in `Expansion-02 shadow signals` describe block.
- Fixed stale overlap-test comment (24 → 26 signals).
- No evaluate layer, text-inference regex, scoring, tension, or Expansion-01 definition changes.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-02-signal-definitions.ts` | **Created** — `EXPANSION_02_SELF_SHADOW_SIGNAL_BLOCK` |
| `dating-api/src/extraction/extraction.service.ts` | Import + ALLOWED KEYS + SIGNAL RULES + prompt injection |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Added keys to `DOMAIN_ALLOWED_SIGNAL_KEYS.self` |
| `dating-api/src/extraction/extraction.service.spec.ts` | 6 Expansion-02 tests; overlap comment fix |
| `handoffs/STORY_02_llm_extraction_prompts/agent-1-dev.md` | This handoff |

---

## Decisions honored

- Single LLM call via existing `ExtractionService.extract('self', …)` — no separate per-signal calls
- Self domain only — partner/relationship prompts untouched
- Scale 1–10; out-of-range stripped by `validateAndClean`
- PROTECTED / distinct-from lines preserved in prompt block
- Keys remain shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- `expansion-01-signal-definitions.ts` unchanged

---

## Runtime topology

N/A

---

## Tests / verification

- [x] `npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-02"` — **6/6 pass**
- [x] `npx jest src/extraction/extracted-signals.spec.ts --runInBand` — **17/17 pass**
- [x] `npm run typecheck` — **pass**
- [x] `prisma migrate deploy`: **N/A**
- [x] Browser Network smoke: **N/A**

---

## E2E verification

N/A — Agent 4 skipped.

---

## Open questions / blockers

- None

---

## Next agent

```text
--agent 2 expansion 02 story 2
```

**Notes for next agent:** Verify no regex in text-inference; confirm prompt block not in evaluate-llm-prompts.ts; keys still shadow-only; Expansion-01 prompts/tests unchanged.
