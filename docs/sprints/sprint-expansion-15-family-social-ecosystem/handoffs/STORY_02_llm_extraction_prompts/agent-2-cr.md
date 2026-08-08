# Handoff: Agent 2 — Code review — Story 2

**Agent:** 2 code-review  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-15-family-social-ecosystem  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)  
**Verdict:** **approved** (no code changes required)

---

## Summary

- Reviewed Story 2 against architect handoff and `LLM_FIRST_PRINCIPLE.md` — **aligned**.
- Self + partner semantic blocks in extraction path; Story 1 metadata preserved (domains `relationship` / `social` / `social`); single-call pipeline unchanged.
- `DOMAIN_ALLOWED.self` **45**, `.partner` **31**, relationship unchanged; scored set still **15**.
- Adjacent upgrades for `independence` / `socialBattery` (self) and `traditionalism` / `socialBattery` (partner family-involvement carve-out).
- `friendCoupleBalance` polarity locked in blocks + SIGNAL RULES (low = friends-first, high = couple-centric).
- No regex / evaluate / text-inference / scoring / tension / Exp-09 / Phase 6 promote-all drift.

---

## Architect CR checklist

- [x] **Zero** regex/keyword/if-else scoring for Exp-15 keys
- [x] No changes to text-inference files for these keys
- [x] Prompt blocks in extraction path (not `evaluate-llm-prompts.ts`)
- [x] No separate LLM calls added (single `completeJSON` per domain)
- [x] Self + partner ALLOWED KEYS include all three keys; relationship unchanged
- [x] `DOMAIN_ALLOWED.self === 45`, `.partner === 31`
- [x] Scale 1–10; null on weak evidence; out-of-range stripped (OOR `11` → null test)
- [x] **`friendCoupleBalance` polarity:** low = friends-first, high = couple-centric (not inverted)
- [x] PROTECTED distinctions present (vs `traditionalism` / `socialBattery` / `independence`)
- [x] Adjacent SIGNAL RULES upgraded (independence / socialBattery self; traditionalism / socialBattery partner)
- [x] Partner `traditionalism` no longer owns family-of-origin enmeshment alone
- [x] Keys still shadow-only (not in `COMPATIBILITY_SIGNAL_KEYS`)
- [x] Story 1 metadata exports preserved (weights/tiers/domains/chip labels)
- [x] Expansion-09 interest artifacts untouched
- [x] Unit tests pass — CR re-run Expansion-15 **13/13**; extracted-signals **77**; Exp-10…14 rollout **30**; typecheck **pass**

---

## Issues

| Severity | Finding | Action |
|----------|---------|--------|
| Critical | None | — |
| Major | None | — |
| Minor | Partner `familyEnmeshment` smoke uses “family not deeply involved” fixture text with mocked score `8` (architect smoke score, not polarity assert) | No change — mocks do not score from text; optional future clarity only |

---

## Review notes

- Hebrew strings appear only as prompt meaning examples / test comments — not keyword matchers.
- Partner block correctly frames desired-partner traits; partner smokes for all three Exp-15 keys present.
- Self/partner block injection after Exp-14 — correct order.
- Self + partner HARD SEMANTIC GUARD notes for Exp-15 — helpful, not keyword scorers.
- Partner FAMILY LANGUAGE RULE clarified: marriage/kids → traditionalism; day-to-day family-of-origin involvement → familyEnmeshment when explicit — correct.
- Absent from `compatibility-score.ts`, tension rules, evaluate layer, text-inference — correct Story 2 scope.
- Relationship prompt ALLOWED KEYS unchanged (no Exp-15) — correct.
- Self still omits `traditionalism`; partner still omits `independence` — correctly not “fixed” per architect.
- Live />85% / Hebrew fixtures / Phase 6 rollout correctly deferred to Story 5.
- Meta chips remain `Family closeness` / `Friends & couple balance` / `Alone time needs` (Story 4 browse chips deferred).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-15-signal-definitions.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction.service.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction-strict-validation.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction.service.spec.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/expansion-10`…`14-rollout.spec.ts` | DOMAIN lengths 45/31 |
| `handoffs/STORY_02_llm_extraction_prompts/agent-2-cr.md` | This handoff |

---

## Runtime topology

N/A

---

## Tests / verification

- [x] `npx jest … -t "Expansion-15"` — **13 passed** (CR re-run)
- [x] `extracted-signals` — **77/77** (CR re-run)
- [x] Exp-10/11/12/13/14 rollout — **30/30** (CR re-run)
- [x] `npm run typecheck` — **pass**
- [x] Browser Network smoke: **N/A**

---

## E2E verification

N/A — Agent 4 skipped

---

## Open questions / blockers

- None for Story 2 close.
- Story 3 owns tension rules (`family_enmeshment_gap`, `friend_couple_balance_gap`, `alone_time_need_gap`).

---

## Next agent

```text
--agent 3 expansion 15 story 2
```

**Notes:** PM should mark Story 2 Done in sprint README (as-built: DOMAIN 45/31; live deferred). Do not commit unless user asks.
