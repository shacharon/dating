# Story 01 — Match scoring stage pipeline

**Sprint 40 · Status: Done**  
**Priority:** P1  
**Estimated effort:** 3 days  
**Dependencies:** Sprint 38 Story 01 (constants) strongly preferred  
**Repo:** `dating-api` only  
**Risk:** High (core `compare` / `compareWithStatus`)  
**Handoffs:** [agent-0-architect.md](./handoffs/STORY_01_match_scoring_stages/agent-0-architect.md) · [agent-1-dev.md](./handoffs/STORY_01_match_scoring_stages/agent-1-dev.md) · [agent-2-cr.md](./handoffs/STORY_01_match_scoring_stages/agent-2-cr.md) · [agent-3-pm.md](./handoffs/STORY_01_match_scoring_stages/agent-3-pm.md)

---

## Objective

Refactor deterministic match comparison into named stages (or modules) with a thin pipeline, preserving **identical** `finalScore` / explainability outputs for existing fixtures.

## Why

`match-engine.ts` already has stage-shaped functions but lives in one large file — hard to unit-test stages and review diffs. Audit recommended strategy/pipeline extraction with shadow parity.

## Locked policy (Architect)

| Item | Decision |
|------|----------|
| Layout | `src/matches/compare-stages/` (not vague `stages/`) |
| Public API | Stay on `match-engine.ts` (`compare` / `compareWithStatus` + DTOs) |
| Dual engine / flag | **No** — extract in place |
| Parity | Existing `match-engine.spec.ts` must stay green (zero score drift) |
| Orchestration order | Preserve current `compare()` step order exactly |

## Scope / tasks

1. Architect locks stage list + folder (`src/matches/stages/` or keep pure functions in files).
2. Extract stages; keep `compare` / `compareWithStatus` as public API used by me-matches.
3. Add parity tests: fixture pairs → old vs new (or golden files from current engine before extract).
4. Optional feature flag only if Architect requires; prefer extract-in-place with parity suite.
5. Do not change formulas unless a bug is proven; then separate commit.

## Out of scope

- LLM narrative
- HG eligibility (outside compare)
- Product weight retuning

## Acceptance criteria

- [x] Stages live in focused modules
- [x] Public compare API stable for callers
- [x] Parity tests cover representative pairs (incl. sparse / dealbreaker / high friction)
- [x] Existing `match-engine.spec.ts` / scoring specs green
- [x] No HTTP contract change

## Suggested commit

```
refactor(matches): extract compare pipeline into scoring stages

Sprint 40 Story 1
```
