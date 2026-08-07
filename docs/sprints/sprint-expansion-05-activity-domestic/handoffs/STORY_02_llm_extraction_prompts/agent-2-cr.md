# Handoff: Agent 2 — Code review — Story 2

**Agent:** 2 code-review  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-05-activity-domestic  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)  
**Verdict:** **approved** (no code changes required)

---

## Summary

- Reviewed Story 2 against architect handoff and LLM-first principle — **aligned**.
- Semantic definitions in extraction path (`expansion-05-signal-definitions.ts` → `SELF_EXTRACTOR_PROMPT`); single-call pipeline preserved.
- Both keys added self-only; SIGNAL RULES upgraded for `healthBodyConsciousness` + `lifestylePace`; PROTECTED lines cover wellness / looks / socialBattery / pace / tags.
- No regex/text-inference rules; keys remain shadow-only; partner allowlist unchanged.

---

## Architect CR checklist

- [x] **Zero** regex/keyword/if-else scoring for Expansion-05 keys
- [x] No changes to `extraction-text-inference.ts` / `text-inference.ts` for these keys
- [x] Prompt block in extraction path (not `evaluate-llm-prompts.ts`)
- [x] No separate LLM calls added
- [x] `DOMAIN_ALLOWED_SIGNAL_KEYS.self` synced (**22** keys); Expansion-05 keys **not** on partner
- [x] Scale 1–10 enforced; null on weak evidence (out-of-range `11` → null test)
- [x] PROTECTED / distinct-from lines present (vs healthBodyConsciousness, physicalPriority, socialBattery, lifestylePace, interest tags)
- [x] SIGNAL RULES upgrades for `healthBodyConsciousness` + `lifestylePace` present
- [x] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [x] Expansion-01–04 prompts/tests unchanged
- [x] Unit tests pass

---

## Issues

| Severity | Finding | Action |
|----------|---------|--------|
| Critical | None | — |
| Major | None | — |
| Minor | Partner/relationship prompts still map “quiet home” → `lifestylePace` only | By design — Expansion-05 rich framing is **self only**; residual partner-domain conflation risk noted for Story 5 / future |
| Minor | Coverage overlap comment now says 30 signals | Updated by agent 1; fine |

---

## Review notes

- `physicalActivityLevel` / `domesticComfort` absent from `compatibility-score.ts`, evaluate layer, and text-inference — correct Story 2 scope.
- Self ALLOWED KEYS + `DOMAIN_ALLOWED_SIGNAL_KEYS.self` both include the new keys (22); partner/relationship arrays unchanged.
- Expansion-05 block injected after Expansion-04; prior expansion definition files untouched.
- Six mock-LLM tests cover high/low both signals, null-when-absent, and out-of-range strip.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-05-signal-definitions.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction.service.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction.service.spec.ts` | Agent 1 (unchanged by CR) |
| `handoffs/STORY_02_llm_extraction_prompts/agent-2-cr.md` | This handoff |

---

## Runtime topology

N/A

---

## Tests / verification

- [x] `npx jest extraction.service.spec.ts -t "Expansion-05"` — **6/6 pass**
- [x] `DOMAIN_ALLOWED_SIGNAL_KEYS.self.length === 22`; partner lacks Expansion-05 keys
- [x] Browser Network smoke: **N/A**

---

## E2E verification

N/A — Agent 4 skipped.

---

## Open questions / blockers

- None blocking agent 3 PM sign-off.
- Story 5 should watch live LLM conflation with wellness / socialBattery / lifestylePace.

---

## Next agent

```text
--agent 3 expansion 05 story 2
```

**Notes:** Story 2 closes LLM extraction wiring. Next: tension rules (`activity_level_gap`, `domestic_out_mismatch`) in Story 3.
