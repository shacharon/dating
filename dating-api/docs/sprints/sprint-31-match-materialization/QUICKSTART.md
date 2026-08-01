# Sprint 31 — Quickstart

**Folder:** `dating-api/docs/sprints/sprint-31-match-materialization/`  
**Commands:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)

## When to run

- After Sprint 27 (done).
- Prefer **after** Sprint 30 content-safety gates if launch-critical work is still open.
- Does **not** require Sprint 20 live AWS apply (local Redis/Bull + Postgres is enough).

## Agent loop

```text
--agent 0 sprint 31 story 1
--agent 1 sprint 31 story 1
--agent 2 sprint 31 story 1
--agent 3 sprint 31 story 1
```

Then stories **2 → 5** the same way.

## Read first

1. [README](./README.md) — goal / non-goals  
2. Sprint 27 Story 04 — why the cap is temporary  
3. SCALE CR § “Async Match Rebuild”

## Do not

- Start Sprint 20 `terraform apply` from this sprint.  
- Change scoring formula unless Architect explicitly opens that (default: reuse).
