# Agent Commands — Sprint 73 (Optional Finish)

**Pipeline paste:** also in [ROUND3_AGENT_COMMANDS.md](../ROUND3_AGENT_COMMANDS.md).  
**Pipeline:** [AGENT_PIPELINE_V2.md](../AGENT_PIPELINE_V2.md) (v2.1 — **merge to main required**)

### Hard rule

After each story’s **Agent 3 Done**: merge `feature/sprint-73-story-<m>` → `main`, push, verify ahead = **0**.  
Agent -1 blocks the next story if the previous tip is still ahead of `main`.

---

## Paste commands (Cursor)

```text
--agent -1 sprint 73 story 1
--agent 0 sprint 73 story 1
--agent 1 sprint 73 story 1
--agent 2 sprint 73 story 1
--agent 3 sprint 73 story 1

--agent -1 sprint 73 story 2
--agent 0 sprint 73 story 2
--agent 1 sprint 73 story 2
--agent 2 sprint 73 story 2
--agent 3 sprint 73 story 2

--agent -1 sprint 73 story 3
--agent 0 sprint 73 story 3
--agent 1 sprint 73 story 3
--agent 2 sprint 73 story 3
--agent 3 sprint 73 story 3
```

---

## Verify

```powershell
(Get-ChildItem -LiteralPath dating-api\src\extraction -File).Count
(Get-ChildItem -LiteralPath dating-ui\src\lib -File).Count
Test-Path dating-api\src\extraction\README.md
Test-Path dating-api\src\holy-grail-matching\README.md
cd dating-api; npm test
cd ..\dating-ui; npm test
git rev-list --count origin/main..origin/feature/sprint-73-story-3   # must be 0 after S3 Done
```
