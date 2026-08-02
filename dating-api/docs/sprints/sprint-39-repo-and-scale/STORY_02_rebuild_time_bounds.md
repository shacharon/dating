# Story 02 — Match list rebuild time-bounds

**Sprint 39 · Status: Planned**  
**Priority:** P1  
**Estimated effort:** 2 days  
**Dependencies:** Sprint 38 Story 03; builds on Sprint 31 materialization  
**Repo:** `dating-api` only

---

## Objective

Prevent unbounded CPU/DB time on `rebuildMatchListRanks` / snapshot build when candidate pools are large: soft time budget, progress checkpoint or chunked work, and metrics.

## Why

Caps exist (`MATCH_LIST_CANDIDATE_CAP`, rebuild cap up to 5k) but a full score loop can still dominate a worker. Audit flagged need for time-based guardrails + observability (`rebuildMs` already logged — extend into operational control).

## Scope / tasks

1. Architect locks policy: hard fail vs resume-via-requeue vs reduce cap under load.
2. Implement chosen policy (prefer: time budget + re-enqueue with reason + metric).
3. Emit/extend custom metrics for rebuild duration / partial completions.
4. Tests for budget exceeded path (fake clock or injected deadline).
5. Document ops behavior in story handoff / short ops note if new env vars.

## Out of scope

- Changing HG scoring logic
- Removing materialization
- Separate worker process

## Acceptance criteria

- [ ] Documented rebuild budget constant/env
- [ ] Partial or bounded behavior covered by tests
- [ ] Metrics/logs distinguish complete vs budget-stop
- [ ] Existing enqueue coalesce still works
- [ ] No list API contract change

## Suggested commit

```
perf(match-list): bound rank rebuild wall time

Sprint 39 Story 2
```
