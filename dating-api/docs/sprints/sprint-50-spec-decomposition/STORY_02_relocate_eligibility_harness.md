# Story 02 — Relocate eligibility harness

**Sprint 50 · Status: Done**  
**Priority:** P0  
**Estimated effort:** 1 day  
**Repo:** `dating-api`  
**Depends:** Story 01 preferred (met)  
**Extra agents:** none (test-support relocate)

---

## Objective

Move `me-matches-eligibility-harness.ts` (~1.2k LOC) out of production compile into test support (Architect locks path). Update imports; ensure Agent 4 / e2e paths still resolve.

## Acceptance criteria

- [x] Harness not imported by production runtime modules — `*.spec-support.ts` + build exclude; grep clean
- [x] E2E / eligibility stories still runnable — 8 consumers import new path; **parity with parent tip** (13 fail / 12 pass — pre-existing)

## Definition of Done

- [x] Schema / HTTP API / UI / production match services: N/A
- [x] Renamed to `me-matches-eligibility.spec-support.ts`; no old-path stub
- [x] 8 e2e integration specs updated; skills path refs updated
- [x] `tsconfig.build.json` excludes `**/*.spec-support.ts`
- [x] Agents 2.5 / 3.5 / 4 / 5: N/A
- [x] Agent 2 CR approved; Agent 3 PM close

## Deferred

- Pre-existing e2e baseline reds (13 failures on Story 01 tip) — **out of scope**; not introduced by relocate
- Spec LOC budget / façade soft ≤400 → [Story 03](./STORY_03_spec_budget.md)

## Commits

- `d2f7a29` — test(me-matches): relocate eligibility harness to spec-support
- (this) — chore: close sprint 50 story 2
