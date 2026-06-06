# Story 4: Consolidate overallScore → finalScore

**Sprint:** 5  
**Status:** **Done** (engineering gate — 2026-06-03)  
**Closeout order:** 6  
**Depends on:** — (run after 5.3 if same PR touches match DTOs)

---

## Why

Match results exposed both `overallScore` and `finalScore` (and persisted `overall`), creating ambiguity for API consumers and UI. Headline score is now **`finalScore` only**.

---

## What

**As a** API consumer / UI developer  
**I want** one canonical score field on match results (`finalScore`)  
**So that** there is no ambiguity about which number to display

### Acceptance criteria

- [x] **Match result type** — `CompareResultDto` uses `finalScore` only; `overallScore` removed
- [x] **API DTOs** — list/detail expose `finalScore`; no duplicate `overall` on wire
- [x] **UI** — match cards and detail read `finalScore` only
- [x] **Preserve compatibility sub-score** — `computeCompatibility().overallScore` unchanged
- [x] **Tests updated** — engine, service, `match-score.util` specs
- [x] **Scripts** — recompute, explainability, diagnostics use resolver on read
- [x] **No silent behavior change** — same numeric scores; field rename only

### Out of scope (this story)

- Renaming `computeCompatibility().overallScore` (different layer)
- Changing scoring formulas

---

## Shipped (engineering)

| Deliverable | Detail |
|-------------|--------|
| `match-score.util.ts` | `resolveEngineFinalScore()` — legacy `overall` read only |
| `match-engine.ts` | No `overallScore` on compare; guards use `finalScore: null` |
| `match.types.ts` | No `overall` on record/list/index DTOs |
| UI | `MatchListItemApi.finalScore` required; admin/POC pages updated |
| Docs | `match-engine-overview.md` §6 |

**Breaking:** API payloads no longer include `overall` or `overallScore` for headline score.

---

## Definition of done

- [x] Grep: match-result `overallScore` only in compatibility layer
- [x] Docs updated (`match-engine-overview.md`)
- [x] UI displays `finalScore`
- [x] **1284/1284** tests pass
- [x] Release note in PM handoff

---

## Agent run

```text
--agent 0 sprint 5 story 4   ✅
--agent 1 sprint 5 story 4   ✅
--agent 2 sprint 5 story 4   ✅
--agent 3 sprint 5 story 4   ✅
```

Handoffs: `handoffs/STORY_04_consolidate_final_score/agent-*.md`

---

## Manual smoke

1. Match list → score matches API `finalScore`  
2. Match detail → same score  
3. Compare JSON → values unchanged, only field names

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Rename compatibility sub-score | optional future cleanup |
| Bulk rewrite stored JSON to drop `overall` keys | operator (resolver handles read) |
