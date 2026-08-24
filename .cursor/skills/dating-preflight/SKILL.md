---
name: dating-preflight
description: >-
  Pre-flight validator for dating app stories — checks dependencies,
  story readiness, and conflicts before architecture starts.
disable-model-invocation: true
---

# Dating App Pre-flight Validator (role)

Validate story readiness before Agent 0 starts design. **Prevent wasted work.**

## Checklist

### 1. Dependencies
- [ ] Check story "Depends on" section
- [ ] Verify dependent sprints/stories are marked Done in sprint README
- [ ] Check git history for dependent commits merged to main
- [ ] **Previous story tip on main:** for story `m > 1`, `git rev-list --count main..feature/sprint-<s>-story-<m-1>` must be **0**. If >0 → verdict **blocked** (“previous story not landed on main — run Agent 3 merge”)
- [ ] Dependent sprint tips (if any) must also be ancestors of `main` (ahead = 0)

### 2. Story definition
- [ ] Story has Why, What, AC, DoD sections
- [ ] AC is testable (not vague like "improve performance")
- [ ] DoD is complete (schema + API + UI + tests, or N/A for each)
- [ ] Epic link exists and is readable

### 3. Conflicts
- [ ] Check other stories in same sprint: are any "In Progress"?
- [ ] Would they touch the same services/controllers/models?
- [ ] Flag potential merge conflicts or parallel work

### 4. Sprint context
- [ ] Is the sprint README present?
- [ ] Are previous stories in this sprint Done **and on main** (if order matters)?
- [ ] Is sprint itself blocked (check README for blockers)?

### 5. Complexity estimate
Based on:
- Schema changes (migrations are slow)
- Number of services/controllers affected
- UI pages affected
- E2E test requirements

| Size | Criteria | Typical duration |
|------|----------|------------------|
| Small | 1 service, no migration, <3 files | 1 day (all agents) |
| Medium | 2-3 services, simple migration, <10 files | 2-3 days |
| Large | 4+ services, complex migration, 10+ files | 4-7 days |
| Split | >15 files or major refactor | Recommend breaking into 2+ stories |

## Deliverables

Write `agent--1-preflight.md` with:

```markdown
## Dependencies
- [ ] Sprint 45 Done: ✅ verified in sprint-45.../README.md
- [ ] Sprint 38.3 code merged: ✅ commit abc123 on main

## Story readiness
- [ ] Why/What/AC/DoD: ✅ complete
- [ ] Epic link: ✅ readable
- [ ] AC testable: ⚠️ "improve UX" needs quantifiable metric

## Conflicts
- Story 2 also touches MatchRankingService: ⚠️ coordinate with dev
- No other conflicts found

## Sprint context
- [ ] Sprint README exists: ✅
- [ ] Previous stories Done: ✅ (Story 1-2 both Done)

## Complexity: Medium
- 2 services (MatchRankingService, MatchDetailService)
- No migration
- 6 files estimated
- Agent 4 required (eligibility change)

## Verdict: Ready | Needs-clarification | Blocked

**If Ready:** Proceed to `--agent 0`
**If Needs-clarification:** (list questions for user)
**If Blocked:** (list what must be done first)
```

## Do not
- Design or implement anything — that's agents 0-2
- Skip this step because "story looks simple" — complexity estimates prevent surprises
