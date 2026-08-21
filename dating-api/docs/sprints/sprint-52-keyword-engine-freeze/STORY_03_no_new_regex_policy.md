# Story 03 — No-new-regex policy doc

**Sprint 52 · Status: Done**  
**Priority:** P2  
**Estimated effort:** ~0.5 day  
**Repo:** `dating-api`  
**Extra agents:** none

---

## Objective

Document policy for agents/PRs: where new signals go (LLM expansion vs taxonomy) — not ad-hoc regex in enrichment-v2.

## Acceptance criteria

- [x] Policy published — [`NO_NEW_REGEX_POLICY.md`](./NO_NEW_REGEX_POLICY.md) (decision tree + PR checklist; cites freeze/inventory)
- [x] Linked from sprint README, freeze Related, and `AGENT_PIPELINE_V2` engineering playbooks

## Definition of Done

- [x] Schema / HTTP API / UI / CI: N/A
- [x] Docs only; freeze law unchanged
- [x] Agents 2.5 / 3.5 / 4 / 5: N/A
- [x] Agent 2 CR approved; Agent 3 PM close
- [x] Sprint 52 planned stories complete

## Deferred

- Shared taxonomy generation → future epic (not this sprint)
- Sprint 51 expansion playbook merge (soft-linked until present on main)

## Commits

- `eb071f9` — docs: add no-new-regex agent/PR policy
- (this) — chore: close sprint 52 story 3
