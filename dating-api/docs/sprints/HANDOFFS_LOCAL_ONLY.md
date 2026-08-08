# Handoffs Are Local Only — Summary

**Date:** 2026-08-08  
**Change:** Handoff markdown files are no longer committed to git. They stay local only.

---

## What Changed

### Before
- All handoff `.md` files were committed and pushed
- Git history included agent process documentation
- 8 commits per story (one per agent)

### After
- Handoff `.md` files are local only (in `.gitignore`)
- Only implementation, tests, fixes, and story status committed
- Clean git history with meaningful changes only

---

## .gitignore Addition

Added to `.gitignore`:

```
# Agent handoffs (local only, not committed) — sprint folders only
dating-api/docs/sprints/**/handoffs/
dating-ui/docs/sprints/**/handoffs/
docs/sprints/**/handoffs/
```

This pattern ignores handoff files under sprint folders only (not every `handoffs/` path in the repo).

---

## Git Workflow by Agent (Updated)

| Agent | Commits? | Pushes? | What to commit |
|-------|----------|---------|----------------|
| **-1** | ❌ No | ❌ No | N/A (handoff local only) |
| **0** | ❌ No | ❌ No | N/A (handoff local only) |
| **1** | ✅ Yes | ✅ Yes | Implementation only |
| **2** | ✅ Yes | ✅ Yes | Tests + fixes only |
| **2.5** | ✅ Yes | ✅ Yes | Security fixes only |
| **3.5** | ✅ Yes | ✅ Yes | UX fixes only |
| **4** | ✅ Yes* | ✅ Yes* | E2E scenarios only (if new) |
| **3** | ✅ Yes | ✅ Yes | Story status (README, STORY_*.md) |
| **5** | ❌ No | ❌ No | N/A (handoff local only) |

\* Agent 4 only commits if new E2E scenarios were added.

---

## Benefits

✅ **Clean git history:** No agent process docs cluttering commits  
✅ **Faster CI:** Fewer commits = fewer CI runs  
✅ **Local audit trail:** Handoffs still exist on disk for reference  
✅ **Smaller repo:** No accumulation of handoff files over time  
✅ **Clear diffs:** PRs show only actual code changes  
✅ **Better collaboration:** Team reviews implementation, not process docs

---

## Where Handoffs Still Exist

Handoffs are written to:
```
dating-api/docs/sprints/<sprint>/handoffs/<story>/agent-N-*.md
```

They exist **on your local disk** in these folders, but are:
- ✅ Ignored by git
- ✅ Not committed
- ✅ Not pushed to remote
- ✅ Available for reference during agent pipeline
- ✅ Can be backed up separately if needed

---

## For Sprint 47

When you run:
```text
--agent 1 sprint 47 story 1
```

Agent 1 will:
1. ✅ Write `agent-1-dev.md` to local handoff folder
2. ✅ Commit + push **implementation code only**
3. ✅ Handoff stays local (not committed)

Example commit:
```bash
git add dating-ui/src/lib/view-models
git add dating-ui/src/components/matches

git commit -m "feat: implement sprint 47 story 1

Agent 1 (dev)
- Add MatchViewModel types
- Create mappers from API DTOs
- Update components

Story: ui-match-view-models
Sprint: sprint-47-matches-ui-contracts
"

git push -u origin feature/sprint-47-story-1
```

**Note:** No `dating-api/docs/sprints/**/handoffs/**/*.md` in the commit!

---

## If You Need to Back Up Handoffs

Handoffs are local only, so they're not backed up by git. If you want to preserve them:

### Option 1: Manual backup
```bash
# Backup all handoffs to a separate location
cp -r dating-api/docs/sprints/sprint-*/handoffs ~/handoffs-backup/
```

### Option 2: Separate git repo (optional)
```bash
# Create a separate repo for agent handoffs only
cd ~/agent-handoffs-archive
git init
cp -r ~/dating/dating-api/docs/sprints/sprint-*/handoffs .
git add .
git commit -m "Archive handoffs for sprint X"
```

### Option 3: Don't back up (recommended)
Handoffs are process documentation, not deliverables. Once a story is Done, the handoff served its purpose. The final code and story status in git is the source of truth.

---

## Files Updated

1. `.gitignore` — Added handoff patterns
2. `.cursor/skills/dating-agent-run/agent--1/SKILL.md` — Removed git commit
3. `.cursor/skills/dating-agent-run/agent-0/SKILL.md` — Removed git commit
4. `.cursor/skills/dating-agent-run/agent-1/SKILL.md` — Commit code only (not handoff)
5. `.cursor/skills/dating-agent-run/agent-2/SKILL.md` — Commit tests only (not handoff)
6. `.cursor/skills/dating-agent-run/agent-2.5/SKILL.md` — Commit fixes only (not handoff)
7. `.cursor/skills/dating-agent-run/agent-3.5/SKILL.md` — Commit fixes only (not handoff)
8. `.cursor/skills/dating-agent-run/agent-4/SKILL.md` — Commit E2E only (not handoff)
9. `.cursor/skills/dating-agent-run/agent-3/SKILL.md` — Commit status only (not handoff)
10. `.cursor/skills/dating-agent-run/agent-5/SKILL.md` — Removed git commit
11. `.cursor/skills/dating-agent-run/SKILL.md` — Updated execution flow
12. `.cursor/skills/dating-agent-run/handoff-template.md` — Note about local-only
13. `dating-api/docs/sprints/GIT_WORKFLOW.md` — Full rewrite
14. `dating-api/docs/sprints/AGENT_PIPELINE_V2.md` — Updated agent checklists

---

## Summary

**Handoffs are now local-only process documentation, not git artifacts.**

This keeps your git history clean and focused on actual code changes, while still maintaining a full audit trail of the agent pipeline on your local disk.

Ready to start Sprint 47 with the new workflow!
