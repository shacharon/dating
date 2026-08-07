# Handoff: Agent 0 — Architect — Extra Story 2

**Agent:** 0 architect  
**Story:** Expansion-07 Extra Story 2 — LLM Extraction Prompts (Provider / Recipient delta)  
**Sprint:** sprint-expansion-07-profile-gap-signals  
**Track:** Extra — Provider / Recipient Support (`EXPANSION_AGENT_COMMANDS.md`)  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [Extra Story 1 agent-3-pm.md](../EXTRA_STORY_01_schema_infrastructure/agent-3-pm.md), main [Story 2 agent-3-pm.md](../STORY_02_llm_extraction_prompts/agent-3-pm.md)  
**Mode:** **Audit / no-op.** Extra Story 2 would add LLM self/partner semantics for `supportProviderOrientation` + `supportRecipientOrientation` on a 3-signal base. This repo already shipped them in **main Story 2**.

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Extra Story 2 = LLM prompt delta for the two directional support keys only.
- **As-built audit:** Both keys are in `EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK` + `EXPANSION_07_PARTNER_SHADOW_SIGNAL_BLOCK`, wired into `SELF_EXTRACTOR_PROMPT` / `PARTNER_EXTRACTOR_PROMPT`, listed in ALLOWED KEYS + SIGNAL RULES, and in `DOMAIN_ALLOWED` self **27** / partner **13**.
- Unit coverage already includes high/low provider & recipient + Profile-C support set.
- Extra Story 2 **requires no code changes**. Agent 1 = **verify-only**.
- Do **not** add a parallel Extra prompt module, keyword matchers, or evaluate-layer prompts.
- Shadow / **no promote** remains locked.
- Agent 4 **skipped**.

---

## Extra Story 2 intent

| Deliverable (if 3-signal base) | This repo |
|--------------------------------|-----------|
| Semantic definitions for provider/recipient | ✅ in Exp-07 self + partner blocks |
| Wire into extraction.service ALLOWED KEYS + RULES | ✅ |
| Sync `DOMAIN_ALLOWED` | ✅ self 27 / partner 13 |
| PROTECTED vs exchange / financialMindset / emotional תמיכה | ✅ in prompts |
| Mocked extraction unit tests | ✅ Expansion-07 describe |
| Live LLM ≥85% | ✅ main Story 5 (not Extra 2 scope) |

---

## Baseline audit (do not reverse / do not re-edit)

| Fact | Detail |
|------|--------|
| Self block | `EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK` documents give vs receive + PROTECTED |
| Partner block | `EXPANSION_07_PARTNER_SHADOW_SIGNAL_BLOCK` documents partner-who-provides / receives |
| Self ALLOWED KEYS | Includes both Extra keys (among Exp-07 five) |
| Partner ALLOWED KEYS | Includes both Extra keys |
| Self SIGNAL RULES | `supportProviderOrientation` / `supportRecipientOrientation` one-liners |
| Partner SIGNAL RULES | Partner-facing give/receive one-liners |
| `DOMAIN_ALLOWED.self` / `.partner` | Contains both Extra keys |
| Scale | **1–10 or null** (extraction stack) |
| Scored set | Still **15** |
| `evaluate-llm-prompts.ts` | Must stay untouched for Extra |
| `extraction-text-inference.ts` | No Extra keyword rules |

### Evidence pointers

| Check | Location |
|-------|----------|
| Prompt body | `expansion-07-signal-definitions.ts` (~lines 83–92 self; ~128–129 partner) |
| Wiring | `extraction.service.ts` imports + ALLOWED KEYS + SIGNAL RULES + `${EXPANSION_07_*_BLOCK}` |
| Allowlist | `extraction-strict-validation.ts` self + partner arrays |
| Tests | `extraction.service.spec.ts` → `describe('Expansion-07 shadow signals')` |

---

## README / commands reconciliation (locked)

| Source | Lock |
|--------|------|
| Extra 2 = add LLM prompts for 2 keys | **Already present** — do not duplicate blocks |
| New `expansion-07-extra-signal-definitions.ts` | **Forbidden** — keep single Exp-07 definitions file |
| Evaluate-layer / regex extraction | **Forbidden** |
| Re-write main Story 2 prompts | **Forbidden** unless real gap (none found) |
| Live Hebrew re-validation | Optional operator; belongs to Story 5 / Extra 5 — not Extra 2 |

---

## Artifacts (agent 1)

| Path | Change |
|------|--------|
| Prompt / extraction / DOMAIN_ALLOWED code | **None** (unless a key is literally missing from prompts — unexpected) |
| `handoffs/EXTRA_STORY_02_llm_extraction_prompts/agent-1-dev.md` | **Create** — verification report |

### Explicitly out of scope

| Path | Why |
|------|-----|
| Re-append ALLOWED KEYS | Duplicate / noise |
| Tension / chips / compare E2E | Extra 3–5 |
| Promote / `COMPATIBILITY_SIGNAL_KEYS` | Forbidden |
| Keyword / regex for תמיכה | Forbidden — LLM-first |
| Relationship-domain Exp-07 keys | Intentional out of scope (main Story 2 lock) |

---

## Decisions (do not reverse)

### 1. Extra Story 2 = verify-only (locked)

Agent 1 must run and document:

```bash
cd dating-api
npx jest src/extraction/extraction.service.spec.ts --runInBand -t "Expansion-07"
npx jest src/extraction/extracted-signals.spec.ts --runInBand -t "Expansion-07"
```

Confirm in handoff (grep or read evidence):

- Both Extra keys appear in self + partner ALLOWED KEYS
- Both appear in `EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK` and partner block
- Both in `DOMAIN_ALLOWED.self` and `.partner`
- High/low provider + recipient unit tests still pass
- Profile-C support-set test still passes
- No new files under `evaluate/` for these keys

### 2. No prompt surgery (locked)

Do **not**:
- Split Extra keys into a second definitions export
- Change scale to 0–10
- Add text-inference fallbacks
- “Strengthen” prompts without a failing live fixture gate (that is Extra/Story 5 operator work)

### 3. Shadow preserved (locked)

Extra keys remain extractable shadow signals — not scored.

### 4. Agent 4

**Skip.**

---

## Definition of Done (Extra Story 2)

| Item | Gate |
|------|------|
| Audit confirms Extra keys in self + partner prompt path | Pass |
| `DOMAIN_ALLOWED` includes both | Pass |
| Expansion-07 extraction unit tests green | Pass |
| No product code changes | Pass |
| `agent-1-dev.md` verification handoff | Pass |
| Agent 2 CR approves no-op | Pass |
| Agent 3 documents Extra Story 2 Done (already shipped) | Pass |

---

## API contracts

No DTO changes.

---

## Runtime topology

N/A

---

## E2E verification

N/A — Agent 4 skipped. Live LLM covered by main Story 5.

---

## Agent 1 instructions

1. **Do not** modify extraction prompts/code unless a key is missing from the prompt path (escalate if so).
2. Run Expansion-07 extraction unit filters; document results.
3. Write `agent-1-dev.md` under `EXTRA_STORY_02_llm_extraction_prompts/` — verification only.
4. Do not commit unless user asks.

---

## Agent 2 CR checklist

- [ ] No duplicate Extra prompt module
- [ ] Both Extra keys in self + partner extraction path
- [ ] `DOMAIN_ALLOWED` includes both; scored set still 15
- [ ] Agent 1 verify-only (or justified gap fix only)
- [ ] No evaluate-layer / regex drift
- [ ] Expansion-07 extraction specs pass

---

## Open questions / blockers

- None. Extra Story 2 closed by audit.
- Extra 3–5 remain optional verify-only.

---

## Next agent

```text
--agent 1 expansion 07 extra story 2
```

**Notes:** Verify-only. LLM-first — do not “fix” emotional-תמיכה confusion with regex; that belongs to prompt/fixture operator loops already handled in main Story 5.
