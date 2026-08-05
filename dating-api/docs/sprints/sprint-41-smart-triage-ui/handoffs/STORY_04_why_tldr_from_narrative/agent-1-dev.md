# Handoff: Agent 1 — Senior Dev — Sprint 41 Story 4

**Agent:** 1 senior-dev  
**Story:** [STORY_04_why_tldr_from_narrative.md](../../STORY_04_why_tldr_from_narrative.md)  
**Architect:** [agent-0-architect.md](./agent-0-architect.md)  
**Sprint:** sprint-41-smart-triage-ui  
**Date:** 2026-08-05  
**Status:** complete  

---

## Summary

Browse WHY is now a **short extract of the same cached `matchNarrative`**, not coach templates. List exposes `whyTldr`. HIGH misses may eager-generate (max 3). UI one-liner / why body / compact list line read `whyTldr` only.

---

## Implemented

### Backend
| Change | Path |
|--------|------|
| `buildNarrativeTldr` (1–2 sentences, ≤160) | `match-narrative-tldr.ts` + spec |
| `MatchNarrativeCache.narrativeTldr` | schema + migration `20260805140000_match_narrative_tldr` |
| Cache find/upsert + legacy backfill | `match-narrative-cache.service.ts` |
| List `whyTldr` + HIGH eager ≤3 + scrub list `primaryTakeaway` | `me-matches.service.ts` (`attachWhyTldrsToListItems`, `resolveMatchNarrativeEntry`) |
| List Redis cache version bump | `MATCH_LIST_CACHE_VERSION` **1 → 2** |
| Null-safe `withRecommendationPlaces` | `match-recommendation.ts` |
| Test stubs store TLDR | `match-narrative-test-stubs.ts` |

### Frontend
| Change | Path |
|--------|------|
| `whyTldr` on `MeMatchItemDto` | `me-matches-api.ts` |
| One-liner + why body = `whyTldr` only | `match-display.ts` |
| Compact list line | `match-list-item.tsx` |
| Specs | `match-display.spec.ts`, `match-browse-card.spec.tsx`, `page.spec.tsx` |

---

## Verification

```bash
# api
npx prisma migrate deploy   # apply narrativeTldr column locally
npx prisma generate         # if EPERM, stop API process first
npx jest src/matches/match-narrative/ --runInBand
npx jest src/me-profile/me-matches.service.spec.ts --runInBand
npx jest --no-coverage "me-new-model-e2e-match-narrative.integration" --runInBand

# ui
npx vitest run src/app/dating/me-matches/match-display.spec.ts src/app/dating/me-matches/match-browse-card.spec.tsx src/app/dating/me-matches/page.spec.tsx
```

**Results (this agent):**
- Narrative unit + cache specs: PASS  
- `me-matches.service.spec.ts`: PASS (97)  
- UI me-matches specs above: PASS (34)  
- Narrative integration: detail/cache tests PASS; list test updated for `whyTldr` + forces `MATCH_LIST_MATERIALIZED=0` (harness lacks `matchListRank` mock when materialized on)

---

## Operator smoke

1. Migrate DB + restart API (`prisma migrate deploy` / generate).  
2. Open HIGH match detail → full WHY.  
3. Back to `/dating/me-matches` → same story as short `whyTldr` (or empty until cache/HIGH eager).  
4. Confirm no “say hello” / “thin fit” coach lines on browse.

---

## Out of scope (unchanged)

- Sprint 42 openers  
- Chip / token copy redesign  
- Prompt version bump (still v4; extract is post-process)

---

## Next

```text
--agent 2 sprint 41 story 4
```
