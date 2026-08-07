# Handoff: Agent 2 — Code review — Story 2

**Agent:** 2 code-review  
**Story:** [README.md — STORY 2: LLM Extraction Guidance](../../README.md)  
**Sprint:** sprint-expansion-09-interest-taxonomy  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)  
**Verdict:** **approved** (no code changes required)

---

## Summary

- Reviewed Story 2 against architect handoff — **aligned**.
- Guidance module uses `INTEREST_CANONICAL_TAGS` SoT; wired into all three domain `INTERESTS:` sections.
- Obsolete Title-Case `Nature` / `Running` examples removed.
- Pipeline preserves LLM interests → `rawInterests` with canonical allowlist (case/underscore only).
- No preferred-overlap / i18n / HG / enrichment / signal-key drift.

---

## Architect CR checklist

- [x] Guidance module uses `INTEREST_CANONICAL_TAGS` SoT (no hand-duplicated 19-list)
- [x] All three domain prompts updated; obsolete Nature/Running Title-Case examples gone
- [x] No regex/keyword interest invent from profile text
- [x] `rawInterests` populated + allowlist-filtered; max 10; case-normalized
- [x] Specs cover EN tags, coexistence, HE mocked texts, non-canonical drop, prompt contains guidance
- [x] No preferred-overlap / i18n / HG / enrichment / signal-key drift
- [x] Specs pass — CR re-run **22** pass; typecheck **pass**

---

## Issues

| Severity | Finding | Action |
|----------|---------|--------|
| Critical | None | — |
| Major | None | — |
| Minor | No dedicated unit assert for the max-10 interest cap (`MAX_RAW_INTERESTS`) | Optional follow-up; code path is correct |
| Minor | Pre-existing enrichment-v2 maps pattern `biking` → value `cycling` | Out of scope Story 2 (LLM-first lock); Story 4 may note legacy keyword paths |

---

## Review notes

- `EXPANSION_09_INTEREST_GUIDANCE_BLOCK` interpolates `INTEREST_CANONICAL_TAGS_PROMPT_LIST` — single SoT, no drift risk.
- `parseRawInterestArray` prefers `rawInterests` then falls back to `interests` — matches architect lock.
- `normalizeRawInterestTags` does not invent synonyms (`cycling`→`biking`) — correct LLM-first separation.
- `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` still **8** — correct Story 3 deferral.
- Story 1 CR minor (`"I like nature" -> "Nature"`) is resolved.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-09-interest-guidance.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction.service.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction-normalization.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction.service.spec.ts` | Agent 1 (unchanged by CR) |
| `dating-api/src/extraction/extraction-normalization.interest.spec.ts` | Agent 1 (unchanged by CR) |
| `handoffs/STORY_02_llm_extraction_guidance/agent-2-cr.md` | This handoff |

---

## Runtime topology

N/A

---

## Tests / verification

- [x] Jest Expansion-09 / interest normalize / taxonomy — **22** pass
- [x] `npm run typecheck` — **pass**
- [x] Browser Network smoke: **N/A**

---

## E2E verification

N/A — Agent 4 skipped

---

## Open questions / blockers

- None for Story 2 close.
- Story 3: preferred overlap tags + EN/HE/ES.
- Story 4: live fixtures; legacy keyword interest paths awareness.

---

## Next agent

```text
--agent 3 expansion 09 story 2
```

**Notes:** PM closes Story 2, then Story 3 (overlap chips & i18n). Keep tags separate from scored signals.
