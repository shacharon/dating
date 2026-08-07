# Handoff: Agent 1 — Dev — Story 2

**Agent:** 1 dev  
**Story:** [README.md — STORY 2: LLM Extraction Guidance](../../README.md)  
**Sprint:** sprint-expansion-09-interest-taxonomy  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Added Expansion-09 interest guidance block (SoT from `INTEREST_CANONICAL_TAGS`) and wired it into **self / partner / relationship** `INTERESTS:` sections.
- Removed obsolete Title-Case examples (`Nature` / `Running`).
- Pipeline now preserves LLM `interests` / `rawInterests` → `ExtractedSignals.rawInterests` with canonical allowlist filter (case/underscore normalize only — no synonym invent, no profile-text keyword matching).
- Mocked specs cover EN tags, coexistence, HE fixtures, non-canonical drop, prompt guidance, and not-scored assert.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/expansion-09-interest-guidance.ts` | **Created** — guidance block + prompt list from SoT |
| `dating-api/src/extraction/extraction.service.ts` | Import block; update 3× INTERESTS; `validateAndClean` allowlists `rawInterests` |
| `dating-api/src/extraction/extraction-normalization.ts` | Parse interests/rawInterests; `normalizeRawInterestTags` helper |
| `dating-api/src/extraction/extraction.service.spec.ts` | `describe('Expansion-09 interest tags')` — 11 tests |
| `dating-api/src/extraction/extraction-normalization.interest.spec.ts` | **Created** — parse/allowlist unit asserts |

---

## Counts After Story 2

| Metric | Value |
|--------|-------|
| `INTEREST_CANONICAL_TAGS` | **19** (unchanged) |
| Compatibility scored | **15** (unchanged) |
| `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` | still **8** (Story 3) |

---

## Tests / verification

- [x] `npx jest … -t "Expansion-09|interest rawInterests|INTEREST_CANONICAL"` → **22** passed
- [x] `npm run typecheck` → exit 0
- [x] Browser Network smoke: N/A

---

## Explicit Non-Goals (this story)

- No `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` / UI i18n (Story 3)
- No HG regex / enrichment phrase / explicit-extended-lists expansion
- No live LLM Hebrew gate (Story 4)
- No signal allowlist / scoring changes

---

## Next agent

```text
--agent 2 expansion 09 story 2
```

**Notes:** CR checklist in architect handoff. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): LLM interest guidance for biking, camping, nature

Story 2 — canonical tag prompt + preserve rawInterests via allowlist.
```
