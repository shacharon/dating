---
name: dating-autorun
description: >-
  Autorun orchestrator for dating sprint stories. Chains agents automatically
  until story is Done or blocked. Use when the user runs --autorun story N.
disable-model-invocation: true
---

# Autorun Orchestrator

**Command:** `--autorun sprint <s> story <m>`

Automatically chains agents until the story is Done or blocked. Eliminates manual copy-paste of `--agent N` commands.

## How it works

1. Start with `--agent -1` (pre-flight)
2. If verdict = "ready", continue to `--agent 0`
3. Chain through agents 0 → 1 → 2
4. At Agent 2, determine which optional agents to insert:
   - If story touches auth/permissions/PII/payments: insert Agent 2.5 (security)
   - If story touches frontend: insert Agent 3.5 (UI/UX)
   - If story touches eligibility/ranking: insert Agent 4 (E2E)
5. Run Agent 3 (PM)
6. If any agent verdict is "blocked" or "needs-fixes", **stop** and report to user
7. If Agent 3 marks Done, **stop** (Agent 5 is manual, run days later)

## Detection rules

**Security-sensitive (Agent 2.5):**
- Files changed match: `*auth*`, `*session*`, `*permission*`, `*admin*`, `*payment*`
- Story title contains: "auth", "permission", "admin", "security", "PII"

**Frontend (Agent 3.5):**
- Files changed match: `dating-ui/**/*.tsx`, `dating-ui/**/*.css`
- Story title contains: "UI", "UX", "page", "component", "form"

**Matching engine (Agent 4):**
- Files changed match: `*eligibility*`, `*ranking*`, `*holy-grail*`, `*me-matches*`
- Story title contains: "eligibility", "ranking", "matching", "scoring"

## Example run

```
User: --autorun sprint 46 story 1

Agent -1: ✅ Verdict = ready
Agent 0:  ✅ Design complete
Agent 1:  ✅ Implementation complete
Agent 2:  ✅ Tests pass, verdict = approved
  [Detected: matching engine change → insert Agent 4]
Agent 4:  ❌ Verdict = blocked (baselines red under default env)

STOPPED: Agent 4 blocked on e2e harness issue.
Fix needed: Add matchListRank mock to harness.
Resume with: --agent 1 sprint 46 story 1 (to fix)
```

## User interaction

If autorun encounters blocking issues, it:
1. Stops immediately
2. Shows which agent blocked and why
3. Suggests next command to fix (usually `--agent 1` or `--agent 0 --revision`)

User can override with:
- `--autorun sprint <s> story <m> --skip-agent 4` (skip optional agents)
- `--autorun sprint <s> story <m> --start-from 2` (resume mid-pipeline)

## Safety

- Writes handoffs after each agent
- Git commits after Agent 1 (implementation) and Agent 2 (tests)
- Never auto-merges to main or deploys to production
- Stops on first failure (doesn't continue with broken code)

## Limitations

- Cannot run Agent 5 (requires production deploy + 1-3 days wait)
- Cannot resolve "needs-clarification" from Agent -1 (requires user input)
- Cannot fix bugs automatically (requires user to review Agent 1 revision)

## Implementation note

This is a meta-skill that wraps the manual `--agent N` commands. When implementing, create a loop that:
1. Determines next agent
2. Invokes `[dating-agent-run](../SKILL.md)` with appropriate agent number
3. Reads handoff verdict
4. Decides: continue, stop, or escalate
