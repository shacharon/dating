# Backend architecture follow-up — Sprints 38–40

**Created:** 2026-08-01  
**After:** UI Sprint 37 (profile polish) complete  
**Source:** Backend architecture audit (god services, scale, SOLID)

> Earlier draft mistakenly labeled this work as Sprint 34–36. **Those numbers are UI sprints.** Correct track: **38 → 39 → 40** under `dating-api/docs/sprints/`.

---

## Sequence

| Sprint | Folder | Priority | Focus |
|--------|--------|----------|-------|
| **38** | [`sprint-38-god-services-split`](./sprint-38-god-services-split/README.md) | P0 | Constants, break `forwardRef`, split MeMatches + MeProfile |
| **39** | [`sprint-39-repo-and-scale`](./sprint-39-repo-and-scale/README.md) | P1 High | UserProfile repository, rebuild time-bounds, cache metrics, pool verify |
| **40** | [`sprint-40-match-engine-stages`](./sprint-40-match-engine-stages/README.md) | P1 Medium | Scoring stages, rank persist txns, slow-query logs |

---

## Start here

```text
--agent 0 sprint 38 story 1
```

Full command lists live in each sprint’s `AGENT_COMMANDS.md`.

---

## Note on Sprint 28

Connection pooling was already done in Sprint 28. Sprint 39 Story 4 is **verify + metrics**, not a redo.
