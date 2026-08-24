---
name: dating-agent-3
description: >-
  Agent 3 (PM) for dating sprint stories. Closes story — checks DoD, updates
  status, summarizes pipeline. Use when the user runs --agent 3 story N.
disable-model-invocation: true
---

# Agent 3 — PM / close story

**Command:** `--agent 3 story <m>`

## Before you start

1. Read [../SKILL.md](../SKILL.md) — resolve story ref and handoff paths.
2. Read the story file + linked epic.
3. Read all handoffs: `agent-0-architect.md`, `agent-1-dev.md`, `agent-2-cr.md`.
4. If the story touches eligibility/preference dimensions/ranking, also read `agent-4-e2e.md` — **required** for these stories. If missing, stop and tell user to run `--agent 4 story <m>` first.

## Role skill (read and follow)

Load and apply: [../../dating-pm-contractor/SKILL.md](../../dating-pm-contractor/SKILL.md)

## Your job this step

- [ ] Verify DoD against handoffs from agents 0–2
- [ ] Realtime/proxy stories: confirm runtime topology + browser Network smoke not deferred without tracker — [dating-runtime-verification](../../dating-runtime-verification/SKILL.md)
- [ ] Eligibility/preference/ranking stories: confirm `agent-4-e2e.md` exists and its verdict isn't `blocked`, or a tracked follow-up exists — [dating-e2e-verification](../../dating-e2e-verification/SKILL.md)
- [ ] Update story Status + DoD checkboxes in story file
- [ ] Update sprint README checklist status
- [ ] **Do not** implement code

## Handoff (mandatory)

Write: `dating-api/docs/sprints/<sprint>/handoffs/<story>/agent-3-pm.md`

Template: [../handoff-template.md](../handoff-template.md)

Include: final status (Done | Blocked), DoD summary, what's deferred.

## Git commit + push (mandatory)

After writing handoff and updating story status:

```bash
# Stage story status updates only (handoffs are in .gitignore)
git add dating-api/docs/sprints/<sprint>/README.md
git add dating-api/docs/sprints/<sprint>/STORY_*.md

# Commit
git commit -m "chore: close sprint <s> story <m>

Agent 3 (PM)
Status: [Done|Blocked]
DoD: [summary]

Ready for: [land on main|blocked on X]
"

# Push feature branch
git push -u origin HEAD
```

**Note:** Handoffs are local only (in `.gitignore`). Only commit story status updates (README.md, STORY_*.md).

## Land on `main` (mandatory when Status = Done)

**Do not leave the story branch ahead of `main`.** Stranded feature tips caused bulk catch-up merges — avoid forever.

When status is **Done**:

```bash
# 1) Ensure feature tip is pushed
git push -u origin HEAD

# 2) Merge into main (prefer fast-forward or merge commit; no force-push)
git fetch origin
git checkout main
git pull origin main
git merge --no-ff origin/feature/sprint-<s>-story-<m> -m "merge: sprint <s> story <m> into main"
# resolve conflicts if any, then:
git push origin main

# 3) Gate — must print 0
git rev-list --count origin/main..origin/feature/sprint-<s>-story-<m>
```

Record in `agent-3-pm.md` and the story file:

- `Shipped on main: <sha>`
- `Feature tip ahead of main: 0`

If merge is blocked (conflicts you cannot safely resolve, or user forbids pushing main), mark story **Blocked** with reason — **never** mark Done while tip is still ahead of `main`.

Optional cleanup (after ahead=0): delete remote feature branch if the sprint README says so.

**Next story (when user is ready):** `--agent -1 story <m+1>` (V2) or `--agent 0 story <m+1>` (V1)  
**Pre-flight for next story must see previous tip as ancestor of `main`.**
