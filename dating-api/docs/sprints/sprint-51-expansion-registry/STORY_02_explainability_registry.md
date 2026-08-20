# Story 02 — Explainability / chips from registry

**Sprint 51 · Status: Done**  
**Priority:** P1  
**Estimated effort:** ~1.5 days  
**Dependencies:** Story 01  
**Repo:** `dating-api`  
**Extra agents:** Agent 4 (drift gate)

---

## Objective

Drive expansion explainability / chip builders from the same manifest so `matches/expansion-*-explainability.ts` is not a parallel paste list.

## Acceptance criteria

- [x] One registry owns prompt + chip registration — **paired registries** (prompts: `extraction/expansion-manifest.ts`; chips/breakdowns: `matches/expansion-explainability-manifest.ts`; shared ids)
- [x] No unexplained chip drift — Agent 2: registration-only (no `expansion-*-explainability.ts` edits); Agent 4: unit green + parent-parity baselines (empty-match residual tracked outside this story)

## Definition of Done

- [x] Schema / HTTP API / UI: N/A
- [x] `expansion-explainability-manifest.ts` + thin spec; helpers wire 01–07, 10–15
- [x] `match-explainability.ts` / `assemble-result.ts` thinned; `pickInterestOverlapTags` kept
- [x] Unit suite: **216 passed** (Agent 1–2)
- [x] Agent 4 drift gate: **pass** (story scope)
- [x] Agents 2.5 / 3.5 / 5: N/A
- [x] Agent 3 PM close

## Deferred

- Add-expansion playbook → [Story 03](./STORY_03_add_expansion_playbook.md)
- Sprint 16/17 baseline empty-`matches` debt → dedicated matching/harness follow-up (not this story)

## Commits

- `99b0ccb` — refactor(matches): drive expansion chips from explainability manifest
- `49d2f00` — test(matches): harden expansion explainability manifest coverage
- (this) — chore: close sprint 51 story 2
