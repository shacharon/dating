# Story 05 — Cutover + deprecate request rebuild

**Sprint 31 · Status: Done (Agent 1 Dev complete → Agent 2 CR)**  
**Priority:** P0  
**Estimated effort:** 0.5–1 day  
**Dependencies:** Story 04 Done

**Handoff:** [`handoffs/STORY_05_cutover_deprecate_rebuild/agent-1-dev.md`](./handoffs/STORY_05_cutover_deprecate_rebuild/agent-1-dev.md)

---

## Objective

Make materialization the **default** read path; stop using request-path `buildFullRankedList` as the primary miss strategy; document retirement of the Sprint 27 browse cap as fairness policy; keep a guarded escape hatch if Architect allows.

## Why

Leaving dual paths forever invites regressions and “cap still defines who exists.” Cutover makes the sprint’s DoD real.

## Scope / tasks

1. Architect locks: default flag on; escape hatch; cap docs; backfill ops. ✅  
2. Backfill strategy: rate-limited enqueue script + `OPS_CUTOVER.md`. ✅  
3. Metrics: keep existing list/rebuild metrics (no new alert wiring required). ✅  
4. Update Sprint 27 / SCALE notes cross-links; `.env.example`. ✅  
5. Specs: default path; escape hatch. ✅

### Architect locks (do not reverse)

| Decision | Lock |
|----------|------|
| Default | Unset → **materialized on** |
| Escape hatch | `MATCH_LIST_MATERIALIZED=0`/`false`/`no` → legacy Redis+rebuild |
| Code delete | **No** — keep `buildFullRankedList` for rebuild/page/legacy |
| List cap | Legacy escape only; not browse fairness |
| Rebuild cap | Still job membership bound; ops may raise |
| Backfill | Doc + sequential enqueue script (`backfill` reason) |

## Acceptance criteria

- [x] Default list path does not O(N)-rebuild on GET  
- [x] Cap stopgap no longer defines browse membership  
- [x] Backfill/ops steps documented  
- [ ] Sprint-level acceptance checklist can be checked _(Agent 3)_

## Commit message

```
feat(matches): cut over match list to materialized ranks by default

Sprint 31 Story 5
```
