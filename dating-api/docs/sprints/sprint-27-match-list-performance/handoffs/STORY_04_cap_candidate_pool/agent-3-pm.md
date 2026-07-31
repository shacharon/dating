# Handoff: Agent 3 — PM — Story 4

**Agent:** 3 PM  
**Story:** [STORY_04_cap_candidate_pool.md](../../STORY_04_cap_candidate_pool.md)  
**Sprint:** sprint-27-match-list-performance  
**Date:** 2026-08-01  
**Status:** complete  
**Decision:** **ACCEPT**  
**Follows:** [agent-0-architect.md](./agent-0-architect.md), [agent-1-dev.md](./agent-1-dev.md), [agent-2-cr.md](./agent-2-cr.md)

---

## Summary

Story 4 **accepted**. Architect locked `MATCH_LIST_CANDIDATE_CAP` (default 1000) + honest eligible telemetry; Dev landed (`a2e4162`); CR **PASS** (`df0e58f`). All acceptance criteria met. Agent 4 skipped.

**Fairness note (accepted stopgap):** hydrate prefers recent `analyzedAt`; older profiles (and some existing hard-blocked outside the cap) may be invisible on browse until async materialization.

---

## Acceptance

| Criterion | PM call |
|-----------|---------|
| Miss path never hydrates more than cap | Met |
| Default cap = 1000 | Met |
| Deterministic `analyzedAt` / `id` order (nulls last) | Met |
| Documented temporary until materialization | Met |
| Tests cover cap behavior | Met (Agent 1) |
| CR PASS | Met (Agent 2) |

---

## Docs updated

- `STORY_04_cap_candidate_pool.md` → **Done** + handoff links + AC checkboxes
- Sprint `README.md` → Story 04 Done; next Story 5 Agent 0

---

## Carry-forward (not blocking)

1. Fairness / materialization follow-up.
2. Story 05: richer miss-path metrics (rename/clarify `filteredNoPhotoCandidates`).
3. Continue: `--agent 0 sprint 27 story 5`.

---

## Next cmd

```text
--agent 0 sprint 27 story 5
```
