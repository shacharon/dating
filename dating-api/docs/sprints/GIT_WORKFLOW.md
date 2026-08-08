# Git Workflow by Agent

Each agent commits and pushes at specific points. This ensures work is version-controlled and safe.

**Important:** Handoff markdown files (`.md` in `handoffs/` folders) are in `.gitignore` and stay **local only**. Only implementation code, tests, and story status are committed.

## Commit Strategy

| Agent | Commit? | Push? | What to commit | Branch |
|-------|---------|-------|----------------|--------|
| **-1** | ❌ No | ❌ No | N/A (handoff local only) | feature/sprint-X-story-Y |
| **0** | ❌ No | ❌ No | N/A (handoff local only) | feature/sprint-X-story-Y |
| **1** | ✅ Yes | ✅ Yes | Implementation only | feature/sprint-X-story-Y (create branch) |
| **2** | ✅ Yes | ✅ Yes | Tests + fixes only | feature/sprint-X-story-Y |
| **2.5** | ✅ Yes | ✅ Yes | Security fixes only | feature/sprint-X-story-Y |
| **3.5** | ✅ Yes | ✅ Yes | UX fixes only | feature/sprint-X-story-Y |
| **4** | ✅ Yes* | ✅ Yes* | E2E scenarios only (if new) | feature/sprint-X-story-Y |
| **3** | ✅ Yes | ✅ Yes | Story status (README, STORY_*.md) | feature/sprint-X-story-Y (triggers PR ready) |
| **5** | ❌ No | ❌ No | N/A (handoff local only) | N/A |

\* Agent 4 only commits if new E2E scenarios were added. If baselines just passed, no commit needed.

## Detailed Workflow

### Agent -1 (Pre-flight)
```bash
git checkout -b feature/sprint-47-story-1  # Create branch if new story
# Handoff written to local file (in .gitignore)
# NO GIT COMMIT - handoff is local only
```

### Agent 0 (Architect)
```bash
# Handoff written to local file (in .gitignore)
# NO GIT COMMIT - handoff is local only
```

### Agent 1 (Senior Dev) — FIRST PUSH
```bash
# Stage implementation only (handoff is in .gitignore)
git add dating-ui/src/lib/view-models
git add dating-ui/src/components/matches
# Or specific implementation files

git commit -m "feat: implement sprint 47 story 1

Agent 1 (dev)
- Add MatchViewModel, MatchListViewModel types
- Create view-model mappers from API DTOs
- Update match detail component to use view-models

Story: ui-match-view-models
Sprint: sprint-47-matches-ui-contracts
"
git push -u origin feature/sprint-47-story-1  # Creates remote branch
```

**Why push here?** Implementation is done and needs backup. Also allows parallel review by team.

**Note:** Handoff `.md` file is local only (not committed).

### Agent 2 (Code Review)
```bash
# Stage tests and fixes only (handoff is in .gitignore)
git add dating-ui/src/**/*.spec.tsx
git add dating-ui/src/lib/view-models  # If fixes were made
# Or specific test files

git commit -m "test: add tests for sprint 47 story 1

Agent 2 (code review)
- Tests added: match-view-model.spec.ts, mappers.spec.ts
- Issues fixed: missing null check in mapper
- Verdict: approved

Tests: 15/15 passed
"
git push  # Push to same feature branch
```

**Note:** Handoff `.md` file is local only (not committed).

### Agent 2.5 (Security) — If applicable
```bash
# Stage security fixes only (handoff is in .gitignore)
git add dating-ui/src/lib/view-models
# Or specific files with security fixes

git commit -m "security: review sprint 47 story 1

Agent 2.5 (security review)
- Vulnerabilities: 0 Critical, 0 High, 1 Medium
- Fixes applied: sanitize user-provided profile fields in view-model
- Verdict: approved
"
git push
```

### Agent 3.5 (UI/UX) — If applicable
```bash
# Stage UX fixes only (handoff is in .gitignore)
git add dating-ui/src/components
# Or specific files with UX fixes

git commit -m "ux: review sprint 47 story 1

Agent 3.5 (UI/UX review)
- Accessibility: 1 High issue fixed (alt text)
- Mobile: 320px-1024px all pass
- Verdict: approved
"
git push
```

### Agent 4 (E2E) — If applicable
```bash
# Only commit if new E2E scenarios were added
# If baselines just passed with no new code, skip git commit

# IF new scenarios added:
git add dating-api/src/me-profile/*e2e*.spec.ts

git commit -m "test(e2e): add scenarios for sprint 47 story 1

Agent 4 (E2E tester)
- New scenarios: [describe]
- Verdict: pass
"
git push
```

**Note:** Handoff `.md` files are local only (not committed) for all agents.

### Agent 3 (PM) — FINAL PUSH FOR PR
```bash
git add dating-api/docs/sprints/sprint-47-*/handoffs/*/agent-3-pm.md
git add dating-api/docs/sprints/sprint-47-*/README.md
git add dating-api/docs/sprints/sprint-47-*/STORY_01*.md

git commit -m "chore: close sprint 47 story 1

Agent 3 (PM)
Status: Done
DoD: ✅ View-models ✅ Tests ✅ Accessibility ✅ Mobile

Ready for: merge to main
"
git push  # Branch now ready for PR/merge
```

**Why push here?** Story is complete. This push signals "ready for PR review and merge."

### After Merge to Main

Create PR from `feature/sprint-47-story-1` → `main`, get approval, merge.

### Agent 5 (Post-deploy) — Days later
```bash
# Handoff written to local file (in .gitignore)
# NO GIT COMMIT - handoff is local only

# Post-deploy metrics documented in handoff for reference
```

**Note:** Agent 5 handoff is local only. No git commit needed.

## Commit Message Format

### Conventional Commits

Follow this pattern:

```
<type>: <description>

Agent <N> (<role>)
<bullets>
```

**Types:**
- `feat:` — Agent 1 implementation
- `test:` — Agent 2, 4 tests
- `fix:` — Agent 1 bug fixes
- `security:` — Agent 2.5 security fixes
- `ux:` — Agent 3.5 UI/UX fixes
- `chore:` — Agent 3 status updates
- `docs:` — Agent 5 post-deploy

**Examples:**

```
feat: implement match view-models

Agent 1 (dev)
- MatchViewModel, MatchListViewModel types
- Mappers from API DTOs
- Updated components to use view-models
```

```
test: add view-model tests

Agent 2 (code review)
- Tests: 15/15 passed
- Verdict: approved
```

```
chore: close sprint 47 story 1

Agent 3 (PM)
Status: Done
Ready for: merge to main
```

## Branch Naming

```
feature/sprint-<sprint-number>-story-<story-number>
```

**Examples:**
- `feature/sprint-47-story-1`
- `feature/sprint-47-story-2`
- `feature/sprint-46-story-1`

## Push Timing Summary

**Agents -1, 0, 5:** No git commit (handoffs are local only, in `.gitignore`)

**Agent 1:** Commit + push implementation immediately (creates remote branch, enables parallel work)

**Agents 2, 2.5, 3.5:** Commit + push tests/fixes after each review (incremental safety, CI runs)

**Agent 4:** Commit + push only if new E2E scenarios were added

**Agent 3:** Commit + push story status (triggers "PR ready" state)

## Why This Strategy?

✅ **Handoffs stay local:** No noise in git history from agent process docs  
✅ **Clean commits:** Only implementation, tests, and story status committed  
✅ **Early backup:** Implementation pushed by Agent 1  
✅ **Incremental safety:** Each agent's work is committed  
✅ **CI integration:** Pushes trigger automated tests  
✅ **Collaboration:** Team can review in-progress branch  
✅ **Clear history:** One commit per meaningful change = easy to trace  
✅ **PR readiness:** Agent 3 push signals "ready for merge"  
✅ **Local audit trail:** Handoffs stay on disk for agent process reference  

## Autorun Implications

When using `--autorun`, the system will:
1. Create feature branch at Agent 1
2. Write handoffs to local files (in `.gitignore`)
3. Commit + push implementation at Agent 1
4. Commit + push tests/fixes at Agents 2, 2.5, 3.5, 4 (if applicable)
5. Commit + push story status at Agent 3
6. Stop if any commit fails or push is rejected

You can safely Ctrl+C autorun and resume — git history shows exactly where it stopped.

## .gitignore Entry

The following is added to `.gitignore`:

```
# Agent handoffs (local only, not committed) — sprint folders only
dating-api/docs/sprints/**/handoffs/
dating-ui/docs/sprints/**/handoffs/
docs/sprints/**/handoffs/
```

This keeps all agent handoff markdown files local only.
