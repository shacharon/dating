# Story 03 — Enrichment keyword manifest + thin facade

**Sprint 57 · Status: Planned**  
**Priority:** P0  
**Estimated effort:** 1–2 days  
**Repo:** `dating-api`  
**Extra agents:** Agent 4 optional (evaluate / enrichment parity spot-check)  
**Depends on:** Story 02

---

## Objective

Introduce `enrichment-keyword-manifest.ts` (or equivalent) that lists mapper modules / join helpers — same OCP idea as Sprint 51 `expansion-manifest`. Thin `enrichment-v2` facade (or rename) only orchestrates manifest joins.

Document: **manifest is for structure registration only**; vocabulary still requires Sprint 52 RFC.

## Acceptance criteria

- [ ] Manifest drives composition; no giant procedural body left in facade
- [ ] Facade target ≤ ~200 LOC (soft)
- [ ] Evaluate / enrichment callers unchanged
- [ ] Short note in `KEYWORD_ENGINE_FREEZE.md` or inventory: “structural split done; freeze still applies”

## Definition of Done

- [ ] Manifest + thin facade + specs
- [ ] Agent 2 approved; Agent 4 if run
- [ ] Agent 3 PM close

## Suggested commit

```
refactor(enrichment): wire enrichment keyword modules via manifest

Sprint 57 Story 3
```
