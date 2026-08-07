# Handoff: Agent 1 — Dev — Story 1

**Agent:** 1 dev  
**Story:** [README.md — STORY 1: Canonical Taxonomy](../../README.md)  
**Sprint:** sprint-expansion-09-interest-taxonomy  
**Date:** 2026-08-07  
**Status:** complete  

**Follows:** [agent-0-architect.md](./agent-0-architect.md)

**Mandatory read:** `docs/sprints/LLM_FIRST_PRINCIPLE.md`

---

## Summary

- Added `biking`, `camping`, `nature` to `INTEREST_CANONICAL_TAGS` (**16 → 19**, alphabetical).
- Added matching display labels in `chips-builder.ts`.
- Specs assert membership, set lookup, alphabetical order, and **not** compatibility/extraction signal keys.
- **No** prompt guidance, overlap preferred tags, i18n, or HG regex changes.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/src/extraction/extracted-interests.interface.ts` | Inserted 3 tags alphabetically |
| `dating-api/src/evaluate/chips-builder.ts` | `INTEREST_LABELS` for biking / camping / nature |
| `dating-api/src/extraction/extracted-interests.spec.ts` | **Created** — taxonomy asserts |

---

## Counts After Story 1

| Metric | Value |
|--------|-------|
| `INTEREST_CANONICAL_TAGS` | **19** |
| Compatibility scored | **15** (unchanged) |
| `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` | still **8** (Story 3) |

---

## Tests / verification

- [x] `npx jest src/extraction/extracted-interests.spec.ts --runInBand` → **7/7** passed
- [x] `npm run typecheck` → exit 0
- [x] Browser Network smoke: N/A

---

## Explicit Non-Goals (this story)

- No extraction prompt / LLM guidance (Story 2)
- No `INTEREST_OVERLAP_CHIP_PREFERRED_TAGS` / UI i18n (Story 3)
- No HG regex interest extractors
- No signal allowlist / scoring changes

---

## Next agent

```text
--agent 2 expansion 09 story 1
```

**Notes:** CR checklist in architect handoff. Do not commit unless user asks.

Suggested commit:

```
feat(extraction): add biking, camping, nature to interest taxonomy

Story 1 — canonical tags 16→19; not compatibility signals.
```
