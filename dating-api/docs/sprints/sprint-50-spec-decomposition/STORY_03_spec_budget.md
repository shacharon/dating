# Story 03 — Spec budget + CI guidance

**Sprint 50 · Status: Done**  
**Priority:** P1  
**Estimated effort:** 0.5 day  
**Repo:** `dating-api`  
**Extra agents:** none (docs + warn-only script)

---

## Objective

Document LOC budget / ownership rules for new specs in sprint README or `docs/`. Optional: lightweight CI warning script (Architect decides — do not block builds unless team agrees).

## Acceptance criteria

- [x] Written budget rule exists and is linked from Round 2 master cmds — [`SPEC_BUDGET.md`](../../SPEC_BUDGET.md) + link in [`ROUND2_AGENT_COMMANDS.md`](../ROUND2_AGENT_COMMANDS.md)

## Definition of Done

- [x] Schema / HTTP API / UI / production services: N/A
- [x] `dating-api/docs/SPEC_BUDGET.md` (soft 400 / 900 / 1200 + ownership + grandfather)
- [x] Warn-only `npm run check:spec-budget` (exit 0; not a CI fail gate)
- [x] Agent 2 CR approved
- [x] Agents 2.5 / 3.5 / 4 / 5: N/A
- [x] Agent 3 PM close

## Deferred

- Façade / other soft-over shrinks (policy documents residuals; no re-split this story)
- Failing CI gate for spec budget — requires explicit team agreement later
- Minor grandfather LOC approx vs script count for list-cache (905 vs ~809 note)

## Commits

- `100be74` — docs: add spec LOC budget + warn-only check
- (this) — chore: close sprint 50 story 3
