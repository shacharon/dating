# Handoff: Agent 2 — Code review — Story 2

**Agent:** 2 code-review  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-11-stress-security  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)  
**Verdict:** **approved** (no code changes required)

---

## Summary

- Reviewed Story 2 against architect handoff and `LLM_FIRST_PRINCIPLE.md` — **aligned**.
- Self + partner semantic blocks in extraction path; Story 1 metadata preserved; single-call pipeline unchanged.
- `DOMAIN_ALLOWED.self` **35**, `.partner` **21**, relationship unchanged; scored set still **15**.
- Polarity (`jealousySecurity` HIGH = jealous) and compatibility axis (`stressResponse`) documented in blocks + SIGNAL RULES.
- Adjacent upgrades for `attachmentSecurity` / `independence` / `emotionalRegulation`.
- No regex / evaluate / text-inference / scoring / tension / Exp-09 drift.

---

## Architect CR checklist

- [x] **Zero** regex/keyword/if-else scoring for Exp-11 keys
- [x] No changes to text-inference files for these keys
- [x] Prompt blocks in extraction path (not `evaluate-llm-prompts.ts`)
- [x] No separate LLM calls added
- [x] Self + partner ALLOWED KEYS include both keys; relationship unchanged
- [x] `DOMAIN_ALLOWED.self === 35`, `.partner === 21`
- [x] Scale 1–10; null on weak evidence; out-of-range stripped (OOR `11` → null test)
- [x] PROTECTED distinctions present (vs `attachmentSecurity` / `emotionalRegulation` / `independence` / Exp-10 repair)
- [x] **`jealousySecurity` polarity** documented (HIGH = jealous)
- [x] **`stressResponse` compatibility axis** documented (neither end better)
- [x] Adjacent SIGNAL RULES upgraded (attachment / independence / emotionalRegulation)
- [x] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [x] Story 1 metadata exports preserved (weights/tiers/domains/chip labels)
- [x] Expansion-09 interest artifacts untouched
- [x] Unit tests pass — CR re-run Expansion-11 **9/9**; extracted-signals + Exp-10 rollout **59/59**; typecheck **pass**

---

## Issues

| Severity | Finding | Action |
|----------|---------|--------|
| Critical | None | — |
| Major | None | — |
| Minor | None | — |

---

## Review notes

- Hebrew strings appear only as prompt meaning examples / test comments — not keyword matchers.
- Partner block correctly frames desired-partner traits; partner smokes for both Exp-11 keys present.
- Self/partner block injection after Exp-10 — correct order.
- Partner HARD SEMANTIC GUARD note for stress/jealousy → Exp-11 keys — helpful, not a keyword scorer.
- Absent from `compatibility-score.ts`, `tension-rules.ts`, evaluate layer, text-inference — correct Story 2 scope.
- Relationship prompt ALLOWED KEYS unchanged (no Exp-11) — correct.
- Live />85% / Hebrew fixtures correctly deferred to Story 5.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-11-signal-definitions.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction.service.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction.service.spec.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/expansion-10-rollout.spec.ts` | DOMAIN lengths 35/21 |
| `handoffs/STORY_02_llm_extraction_prompts/agent-2-cr.md` | This handoff |

---

## Runtime topology

N/A

---

## Tests / verification

- [x] `npx jest … -t "Expansion-11"` — **9 passed** (CR re-run)
- [x] `extracted-signals` + Exp-10 rollout — **59/59** (CR re-run)
- [x] `npm run typecheck` — **pass**
- [x] Browser Network smoke: **N/A**

---

## E2E verification

N/A — Agent 4 skipped

---

## Open questions / blockers

- None for Story 2 close.
- Story 3 owns tension rules (`stress_response_clash`, `jealousy_security_gap`, `both_high_jealousy`).

---

## Next agent

```text
--agent 3 expansion 11 story 2
```

**Notes:** PM should mark Story 2 Done in sprint README (as-built: DOMAIN 35/21; live deferred). Do not commit unless user asks.
