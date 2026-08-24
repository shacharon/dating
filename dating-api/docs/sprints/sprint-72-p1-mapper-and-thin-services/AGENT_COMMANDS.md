# Agent Commands — Sprint 72

**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) (v2.1 — **merge to main required**)

### Hard rule

After each story’s **Agent 3 Done**: merge `feature/sprint-72-story-<m>` → `main`, push, verify ahead = **0**.  
Do not start story `m+1` until that gate passes. Do not close the sprint while any 72 tip is ahead of `main`.

```text
--agent -1 sprint 72 story 1
--agent 0 sprint 72 story 1
--agent 1 sprint 72 story 1
--agent 2 sprint 72 story 1
--agent 3 sprint 72 story 1
# Agent 3 lands on main → then:

--agent -1 sprint 72 story 2
--agent 0 sprint 72 story 2
--agent 1 sprint 72 story 2
--agent 2 sprint 72 story 2
--agent 3 sprint 72 story 2

--agent -1 sprint 72 story 3
--agent 0 sprint 72 story 3
--agent 1 sprint 72 story 3
--agent 2 sprint 72 story 3
--agent 3 sprint 72 story 3
```

```powershell
(Get-Content -LiteralPath dating-api\src\holy-grail-matching\profile-to-canonical.mapper.ts | Measure-Object -Line).Lines
cd dating-api; npm test -- --testPathPattern=canonical
git rev-list --count origin/main..origin/feature/sprint-72-story-3   # must be 0 after S3 Done
```
