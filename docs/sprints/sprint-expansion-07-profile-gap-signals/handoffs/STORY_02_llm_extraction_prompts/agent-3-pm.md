# Handoff: Agent 3 — PM — Story 2

**Agent:** 3 pm  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

- **Story 2 closed as Done (engineering gate).**
- LLM semantic extraction for all five Profile Gap signals on **self + partner** domains.
- `DOMAIN_ALLOWED` self **27** / partner **13**; relationship unchanged; scored set still **15**.
- Full pipeline: architect → dev → CR → pm. **Agent 4 skipped.**
- **Expansion-07 progress: 2/5 stories done.**

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Semantic LLM prompts defined | Done | Self + partner blocks in `expansion-07-signal-definitions.ts` |
| Wired into extraction pipeline | Done | `SELF_EXTRACTOR_PROMPT` + `PARTNER_EXTRACTOR_PROMPT` |
| Domain allowlists synced | Done | Self **27**, partner **13** |
| Adjacent SIGNAL RULES upgraded | Done | spirituality, physicalAffectionStyle, traditionalism, physicalPriority |
| No hardcoded patterns | Done | CR verified; no text-inference rules |
| Unit tests pass | Done | Expansion-07 filter **20** (CR); shape Exp-07 **5** (PM re-check) |
| Shadow mode preserved | Done | Keys not in `COMPATIBILITY_SIGNAL_KEYS` |
| Story 1 metadata preserved | Done | Weights/domains/chip labels intact |
| Live Hebrew / >85% validation | Deferred | Story 5 |
| Code committed | Pending user | Uncommitted in working tree |

---

## Acceptance criteria (as-built vs README)

| README AC | Status | Notes |
|-----------|--------|-------|
| LLM-only / null when unclear | ✅ | Prompt blocks + mocked unit tests |
| NO hardcoded patterns | ✅ | CR verified |
| Hebrew regression fixtures | ⏭️ | **Architect override** — Story 5 |
| Provider/recipient pair fixtures | ⏭️ | Story 5 (with tension) |
| >85% agreement | ⏭️ | Story 5 |
| Evaluate-layer prompts | ⏭️ | **Architect override** — extraction path used |
| Scale 0–10 elsewhere | ⏭️ | **Use 1–10** per extraction stack |

**Engineering AC for Story 2: met** (live validation explicitly deferred).

---

## Sprint Expansion-07 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Schema & Infrastructure | **Done** |
| 2 | LLM Extraction Prompts | **Done** |
| 3 | Tension Rules | Planned |
| 4 | User-Facing Chips & i18n (+ interest overlap) | Planned |
| 5 | Testing & Validation | Planned |

**Sprint status:** In progress (2/5).

**Milestone context:** Profile-gap signals extractable in shadow (self + partner); still not scored. Promote remains optional at Story 5 / later.

---

## Artifacts updated

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-07-signal-definitions.ts` | Self + partner LLM blocks |
| `dating-api/src/extraction/extraction.service.ts` | Self + partner wiring |
| `dating-api/src/extraction/extraction-strict-validation.ts` | DOMAIN_ALLOWED sync |
| `dating-api/src/extraction/extraction.service.spec.ts` | Expansion-07 mock tests |
| `dating-api/src/extraction/extracted-signals.spec.ts` | Domain length + allowlist |
| `README.md` (sprint-expansion-07) | Story 2 marked Done + as-built notes |
| `handoffs/STORY_02_llm_extraction_prompts/agent-3-pm.md` | This file |

---

## Decisions preserved

- Shadow-only — no scoring / chips / tension until Stories 3–4 / promote
- Self **and** partner rich framing (unlike Exp-06 self-only)
- Relationship domain unchanged (religion wording there is pre-existing; Story 5 may watch)
- Hebrew emotional תמיכה ≠ financial support — prompt PROTECTED only
- Generosity alone ≠ high provider (3–5 mid, not 9–10)
- Stories 1–2 uncommitted; commit when user requests

Suggested commit (Stories 1+2 together):

```
feat(extraction): Expansion-07 profile-gap shadow keys + LLM prompts

Stories 1–2 — five shadow signals, self+partner extraction; no scoring impact.
```

---

## Tests / verification

- [x] Expansion-07 unit tests — **20** (CR)
- [x] Shape Exp-07 asserts — **5** (PM re-check)
- [x] Typecheck — **pass** (CR)
- [x] Agent 4 E2E — **skipped**
- [x] CR — **approved** (agent 2)

---

## Deferred / follow-up

| Item | Owner | When |
|------|-------|------|
| Five tension rules + `EnrichedSignals` (previewed Story 1) | Story 3 | Next |
| Shadow overlay chips + pair support chips + interest overlap + i18n | Story 4 | After Story 3 |
| Live Hebrew fixtures + >85% + pair support fixtures | Story 5 | After Story 4 |
| Relationship prompt religion wording correlation watch | Story 5 | Optional note |
| Git commit | User | When requested |

---

## Open questions / blockers

- None blocking Story 3 start.

---

## Next story

```text
--agent 0 expansion 07 story 3
```

**Notes:** Tension rules are deterministic (not LLM extraction). Keep shadow mode — extend `EnrichedSignals` + `tension-rules.ts` only; do **not** promote to `COMPATIBILITY_SIGNAL_KEYS`. Mirror Expansion-05/06 Story 3 overlay/friction pattern for shadow keys. Previewed rules: `casual_intimacy_clash` (6), `support_exchange_mismatch` (6), `support_both_provider` (4), `support_both_recipient` (4), `religious_observance_gap` (5).
