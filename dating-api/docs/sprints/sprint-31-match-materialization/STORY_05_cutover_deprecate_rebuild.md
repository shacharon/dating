# Story 05 — Cutover + deprecate request rebuild

**Sprint 31 · Status: PLANNED**  
**Priority:** P0  
**Estimated effort:** 0.5–1 day  
**Dependencies:** Story 04 read path

---

## Objective

Make materialization the **default** read path; stop using request-path `buildFullRankedList` as the primary miss strategy; document retirement of the Sprint 27 browse cap as fairness policy; keep a guarded escape hatch if Architect allows.

## Why

Leaving dual paths forever invites regressions and “cap still defines who exists.” Cutover makes the sprint’s DoD real.

## Scope / tasks

1. Architect locks: default flag on; whether `buildFullRankedList` remains for admin/debug/backfill only; remove or narrow `MATCH_LIST_CANDIDATE_CAP` docs (job-internal batch bound OK).  
2. Backfill strategy: one-shot script or “rebuild all analyzable viewers” job (rate-limited) — document ops steps.  
3. Metrics: list latency under materialization; rebuild lag; optional alert hooks.  
4. Update Sprint 27 / SCALE notes cross-links; `.env.example`.  
5. Specs: default path; escape hatch if any.

## Acceptance criteria

- [ ] Default list path does not O(N)-rebuild on GET  
- [ ] Cap stopgap no longer defines browse membership  
- [ ] Backfill/ops steps documented  
- [ ] Sprint-level acceptance checklist can be checked

## Commit message

```
feat(matches): cut over match list to materialized ranks by default

Sprint 31 Story 5
```
