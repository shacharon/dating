# Handoff: Agent 3 — PM — Story 2

**Agent:** 3 pm  
**Story:** [README.md — STORY 2: LLM Extraction Prompts](../../README.md)  
**Sprint:** sprint-expansion-13-growth-self-awareness  
**Date:** 2026-08-08  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

- **Story 2 closed as Done (engineering gate).**
- LLM semantic prompts for `growthMindset` / `selfAwareness` on self + partner; `DOMAIN_ALLOWED` **39** / **25**.
- Adjacent SIGNAL RULE upgrades (vulnerability / directness / regulation / empathy). Shadow only — not scored. Agent 4 skipped.
- **Expansion-13 progress: 2/5 stories done.**

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Self + partner LLM blocks | Done | `expansion-13-signal-definitions.ts` |
| Wired into `extraction.service.ts` | Done | ALLOWED KEYS + SIGNAL RULES + blocks |
| Adjacent upgrades (vulnerability / directness / regulation / empathy) | Done | Self SIGNAL RULES |
| `DOMAIN_ALLOWED` self **39** / partner **25** | Done | Specs |
| LLM-only; no keyword/regex scoring | Done | CR approved |
| Null when unclear / OOR stripped | Done | Prompt + unit tests |
| Mocked unit tests (high/low/null + partner) | Done | **9/9** Expansion-13 |
| Hebrew live / >85% | Deferred | Story 5 |
| Onboarding UI copy | Deferred | Story 4 |
| Tension / chips / scoring promote | Deferred | Stories 3–5 |
| CR approved | Done | agent-2-cr.md **approved** |
| Code committed | Pending user | Uncommitted in working tree |

---

## Acceptance criteria

| AC | Status | Notes |
|----|--------|-------|
| LLM-only; null when unclear | ✅ | |
| NO hardcoded patterns | ✅ | |
| >85% agreement on validation set | ⏳ | Story 5 gate (explicitly deferred) |

**Engineering AC for Story 2: met.** Product live-validation AC deferred to Story 5.

---

## Sprint Expansion-13 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Schema & Infrastructure | **Done** |
| 2 | LLM Extraction Prompts | **Done** |
| 3 | Tension Rules | Planned |
| 4 | User-Facing Chips & i18n | Planned |
| 5 | Testing, Validation & Regression | Planned |

**Sprint status:** In progress (2/5).

---

## Artifacts updated

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-13-signal-definitions.ts` | SELF/PARTNER LLM blocks |
| `dating-api/src/extraction/extraction.service.ts` | Wire + SIGNAL RULES |
| `dating-api/src/extraction/extraction-strict-validation.ts` | DOMAIN_ALLOWED 39/25 |
| `dating-api/src/extraction/extraction.service.spec.ts` | Exp-13 mocked tests |
| `README.md` (sprint-expansion-13) | Story 2 marked Done |
| `handoffs/STORY_02_llm_extraction_prompts/agent-3-pm.md` | This file |

---

## Decisions preserved

- Shadow-first — extractable but not scored.
- Growth ≠ vulnerability/directness; self-awareness ≠ regulation/empathy.
- Domain `personal` remains metadata-only until Story 4 / promote.
- Agent 4 skipped.
- Live />85% / Hebrew fixtures → Story 5.

Suggested commit (Stories 1–2 if committing together):

```
feat(extraction): Expansion-13 growthMindset and selfAwareness shadow extraction

Stories 1–2 — shadow allowlist + metadata; self+partner LLM prompts; no scoring.
```

---

## Tests / verification

- [x] Expansion-13 extraction.service — **9/9** (CR)
- [x] extracted-signals + rollout DOMAIN asserts — **pass** (CR)
- [x] Typecheck — **pass** (CR)
- [x] Agent 4 — **skipped**
- [x] CR — **approved**

---

## Deferred / follow-up

| Item | Owner | When |
|------|-------|------|
| Tension rules + English chips | Story 3 | Next |
| Positive chips + i18n + onboarding + `personal` diversity | Story 4 | After Story 3 |
| Fixtures / >85% / promote gate | Story 5 | After Story 4 |
| Git commit | User | When requested |

---

## Open questions / blockers

- None blocking Story 3.
- Story 3: `growth_mindset_gap`, `both_low_self_awareness` — keep shadow (friction without scored promote).

---

## Next story

```text
--agent 0 expansion 13 story 3
```

**Notes:** Mandatory `LLM_FIRST_PRINCIPLE.md` still applies. Do not invent Exp-08 work.
