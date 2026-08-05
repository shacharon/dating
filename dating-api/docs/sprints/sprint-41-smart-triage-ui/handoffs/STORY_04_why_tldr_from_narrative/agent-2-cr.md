# Handoff: Agent 2 — CR — Sprint 41 Story 4

**Agent:** 2 CR  
**Story:** [STORY_04_why_tldr_from_narrative.md](../../STORY_04_why_tldr_from_narrative.md)  
**Sprint:** sprint-41-smart-triage-ui  
**Date:** 2026-08-05  
**Status:** complete  
**Verdict:** **PASS** (blockers fixed in CR)  
**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md)

---

## Summary

Browse WHY TLDR matches Architect: deterministic extract of cached narrative, list `whyTldr`, HIGH eager ≤3, UI whyTldr-only, prompt still v4. CR fixed materialized **tier-before-eager** ordering and HIGH eager **about-text** parity so list cannot poison the narrative cache with a thinner story. Added attach unit specs. Skip Agent 4.

---

## Architect lock checklist

| Item | Result |
|------|--------|
| TLDR = `buildNarrativeTldr` (not 2nd LLM / coach templates) | **Pass** |
| Persist `narrativeTldr`; list `whyTldr` | **Pass** |
| HIGH eager ≤3; GOOD/OTHER cache-only | **Pass** — after CR: eager uses **displayed** tier post rank overlay |
| whyTldr only from LLM-sourced narrative | **Pass** — fallback → null, no upsert |
| Browse UI whyTldr only | **Pass** |
| Empty whyTldr OK | **Pass** |
| Prompt version still v4 | **Pass** |
| Detail full `matchNarrative` | **Pass** |

---

## Agent 2 review checklist (story)

| Check | Result |
|-------|--------|
| No template coach-copy on browse path | **Pass** — UI + list scrub |
| List does not N+1 LLM for all tiers | **Pass** — GOOD/OTHER find-only; HIGH cap 3 |
| Cache key / eval invalidation | **Pass** |
| UI empty state clean; detail full narrative | **Pass** |

---

## Findings

### Fixed in this CR

| Severity | Finding | Fix |
|----------|---------|-----|
| Blocker | Materialized path attached WHY **before** rank score/tier overlay → could eager-generate for compare-HIGH / display-GOOD | Skip attach on page hydrate; attach in `listFromMaterializedRanks` **after** overlay; align `meta.finalScore` to rank score |
| Blocker | HIGH eager omitted about excerpts → thinner narrative persisted → detail cache-hit mismatch | Batch-fetch candidate about for ≤3 misses; pass `viewerAbout` into `resolveMatchNarrativeEntry` |
| High | Missing list WHY unit coverage | Specs: cache hit, GOOD no generate, HIGH cap 3, fallback null |
| Hygiene | Internal `whyMeta` / viewerAbout could leak into Redis statusMeta | `toPublicListDto()` strips internals before cache/HTTP |

### Accepted / non-blocking

| Severity | Finding | Disposition |
|----------|---------|-------------|
| Note | Sequential per-item cache `find` (not `findMany`) | OK for page ~20; optional follow-up |
| Note | `withRecommendationPlaces` still builds templates then list scrubs | Browse-safe; dead work until recommendation list-aware |
| Note | Operator must `prisma migrate deploy` for `narrativeTldr` | Agent 3 smoke |

### Required fixes for PASS

**None remaining.**

---

## Tests

```bash
npx jest src/me-profile/me-matches.service.spec.ts --runInBand
# attachWhyTldrs + prior narrative tests green

npx jest src/matches/match-narrative/ --runInBand
npx jest --no-coverage "me-new-model-e2e-match-narrative.integration" --runInBand

# ui (Agent 1 already green; re-run if needed)
npx vitest run src/app/dating/me-matches/match-display.spec.ts src/app/dating/me-matches/match-browse-card.spec.tsx src/app/dating/me-matches/page.spec.tsx
```

---

## Agent 3 brief

1. Read this + Agent 0/1 handoffs + story DoD.  
2. `prisma migrate deploy` + restart API.  
3. Smoke: HIGH open detail → full WHY; back to list → same short beat (or empty until cache). GOOD: no line until detail once. No coach copy.  
4. Confirm Sprint 42 openers untouched.

**Next command:**

```text
--agent 3 sprint 41 story 4
```
