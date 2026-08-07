# Handoff: Agent 3 — PM — Story 2

**Agent:** 3 pm  
**Story:** [README.md — STORY 2: LLM Extraction Guidance](../../README.md)  
**Sprint:** sprint-expansion-09-interest-taxonomy  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

- **Story 2 closed as Done (engineering gate).**
- LLM interest guidance for `biking` / `camping` / `nature` (+ full 19-tag SoT list); pipeline preserves `rawInterests` via canonical allowlist.
- Not compatibility signals. Full pipeline: architect → dev → CR → pm. **Agent 4 skipped.**
- **Expansion-09 progress: 2/4 stories done.**

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Guidance module from SoT | Done | `expansion-09-interest-guidance.ts` |
| Three domain INTERESTS prompts | Done | self / partner / relationship |
| Title-Case Nature/Running examples removed | Done | Specs + CR |
| `rawInterests` preserve + allowlist | Done | normalize + validateAndClean |
| Mocked EN + HE fixtures | Done | Specs (live → Story 4) |
| Coexistence hiking+camping+nature | Done | Spec |
| No keyword invent from profile text | Done | CR |
| Overlap preferred + i18n | Deferred | Story 3 |
| Unit tests pass | Done | **22** (PM re-check) |
| CR approved | Done | agent-2-cr.md **approved** |
| Code committed | Pending user | Uncommitted in working tree |

---

## Acceptance criteria

| AC | Status | Notes |
|----|--------|-------|
| LLM-only extraction | ✅ | This path; legacy enrichment/HG keyword paths untouched |
| Null/omit when unclear | ✅ | Empty → no `rawInterests`; non-canonical dropped |
| Coexistence hiking+camping+nature | ✅ | |
| Hebrew fixtures | ✅ mocked | Live LLM agreement → Story 4 |

**Engineering AC for Story 2: met.**

---

## Sprint Expansion-09 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Canonical Taxonomy | **Done** |
| 2 | LLM Extraction Guidance | **Done** |
| 3 | Interest Overlap Chips & i18n | Planned |
| 4 | Testing & Validation | Planned |

**Sprint status:** In progress (2/4).

---

## Artifacts updated

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-09-interest-guidance.ts` | Guidance block |
| `dating-api/src/extraction/extraction.service.ts` | Prompts + validateAndClean |
| `dating-api/src/extraction/extraction-normalization.ts` | Parse + allowlist helpers |
| Specs | Expansion-09 + normalization interest |
| `README.md` (sprint-expansion-09) | Story 2 marked Done |
| `handoffs/STORY_02_llm_extraction_guidance/agent-3-pm.md` | This file |

---

## Decisions preserved

- Interest tags ≠ scored signals.
- Prompt examples are semantic aids only — no keyword matchers.
- Post-LLM allowlist cleanup OK; synonym invent in code forbidden.
- Agent 4 skipped.
- Preferred overlap + i18n deferred to Story 3.

Suggested commit (Stories 1–2 or Story 2 alone):

```
feat(extraction): LLM interest guidance for biking, camping, nature

Story 2 — canonical tag prompt + preserve rawInterests via allowlist.
```

---

## Tests / verification

- [x] Expansion-09 / interest normalize / taxonomy — **22** (PM re-check)
- [x] Typecheck — **pass** (CR)
- [x] Agent 4 — **skipped**
- [x] CR — **approved**

---

## Deferred / follow-up

| Item | Owner | When |
|------|-------|------|
| Preferred overlap tags + i18n EN/HE/ES | Story 3 | Next |
| Live fixtures / regression / rollout gate | Story 4 | After Story 3 |
| Optional max-10 cap unit assert | Optional | Low priority |
| Legacy enrichment `biking`→`cycling` keyword path | Story 4 note | Awareness only |
| Git commit | User | When requested |

---

## Open questions / blockers

- None blocking Story 3.
- Story 3: add three to `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` + EN/HE/ES; max-2 picker still works.

---

## Next story

```text
--agent 0 expansion 09 story 3
```

**Notes:** Mandatory `LLM_FIRST_PRINCIPLE.md`. Interest tags remain separate from compatibility signals.
