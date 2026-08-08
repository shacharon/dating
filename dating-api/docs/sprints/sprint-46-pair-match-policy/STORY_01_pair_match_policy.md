# Story 01 — PairMatchPolicy (HG gate + legacy rank)

**Sprint 46 · Status: Planned**  
**Priority:** P0  
**Estimated effort:** 2–3 days  
**Dependencies:** Sprint 38 Story 03 Done  
**Repo:** `dating-api` only  
**Risk:** High (eligibility + ranking)  
**Agent 4:** Required

---

## Objective

Introduce a `PairMatchPolicy` interface (or port) with first implementation `HgGateLegacyRankPolicy` matching today’s contract (`HG_GATE_LEGACY_RANK_V1`). Route the product match ranking builder through it so HG gate + legacy `compareWithStatus` score live in one object.

## Why

Dual stack is intentional during cutover, but today the hybrid is buried in control flow inside list rebuild. A policy object is the OCP seam for later HG-rank without rewriting list/detail.

## Scope / tasks

1. Architect locks interface: `evaluate(pair) → { eligible, score, explainability, … }`.
2. Implement `HgGateLegacyRankPolicy` by moving existing HG+legacy calls (behavior parity).
3. Wire product ranking path (post–38.3 collaborators) to the policy.
4. Keep ranking contract doc / env flags coherent; do not change default product policy.
5. Agent 4: eligibility/ranking baseline + scenarios green.

## Out of scope

- Switching default to HG-rank
- Admin full rewrite (Story 02)
- Signal post-processing dedupe (Story 03)
- UI

## Acceptance criteria

- [ ] `PairMatchPolicy` + `HgGateLegacyRankPolicy` exist and are used by product ranking
- [ ] Characterization / smokes / Agent 4 green — no unexplained score or eligibility drift
- [ ] Controllers / public HTTP shape unchanged

## Suggested commit

```
refactor(matching): introduce PairMatchPolicy (HG gate + legacy rank)

Sprint 46 Story 1
```
