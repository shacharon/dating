# Sprint 26 Quick Start Guide

**Goal:** Execute UI architecture cleanup using Cursor agents for baby-step incremental refactoring.

---

## Overview

This sprint has **14 stories** across **3 priority waves**:
- **Wave 1 (P0):** 6 critical stories — must fix (Stories 1–6)
- **Wave 2 (P1):** 6 recommended stories — should fix (Stories 7–12)
- **Wave 3 (P2):** 2 tech debt stories — nice-to-have (Stories 13–14)

Each story:
- Has clear acceptance criteria
- Includes agent instructions
- Takes 0.5–3 days
- Can be committed independently

---

## Recommended order

### Week 1: Wave 1 (P0 Critical)
1. Story 1: Split me-profile-api.ts (1–2 days)
2. Story 2: Extract conversation hooks (1–2 days)
3. Story 3: Extract match hooks (1–2 days) ← Can parallel with Story 2
4. Story 4: Route loading/error UI (1 day)

### Week 2: Wave 1 (P0) + Wave 2 (P1)
5. Story 5: Service layer for internal tools (2–3 days)
6. Story 6: Fix RTL lang SSR (0.5 day)
7. Story 7: Refactor profiles page (2–3 days)

### Week 3: Wave 2 (P1)
8. Story 8: Refactor matches page (2 days)
9. Story 9: Split large components (1–2 days)
10. Story 10: Server Component shells (2–3 days)

### Week 4: Wave 2 (P1) + Wave 3 (P2)
11. Story 11: Complete i18n (1–2 days)
12. Story 12: Route metadata (1 day)
13. Story 13: Delete deprecated code (0.5 day)
14. Story 14: Organize internal routes (0.5 day)

---

## How to execute a story with an agent

### Pattern for each story:

```bash
# 1. Read the story file
Read: dating-api/docs/sprints/sprint-26-ui-architecture-cleanup/STORY_XX_*.md

# 2. Launch agent with story context
/task Create agent for Story X: [title from story]

# 3. In agent prompt, provide:
- Full story markdown content (copy-paste from STORY_XX_*.md)
- Current working directory: dating-ui/ (for UI stories)
- Request agent to follow the "Agent instructions" section exactly

# 4. Agent will:
- Read relevant files
- Make changes (refactor, extract, create files)
- Run tests
- Commit with conventional message

# 5. Review agent output:
- Check files changed
- Run manual smoke test (if needed)
- Verify tests pass
- Read commit message

# 6. If good, merge to main:
git push origin main

# 7. Move to next story
```

---

## Example: Story 1 execution

### Step 1: Read story
```bash
# You (human) read:
dating-api/docs/sprints/sprint-26-ui-architecture-cleanup/STORY_01_split_me_profile_api.md
```

### Step 2: Launch agent
In Cursor chat:
```
I want to execute Sprint 26 Story 1: Split lib/me-profile-api.ts into focused modules.

Here's the full story:

[paste entire STORY_01_split_me_profile_api.md content]

Please follow the "Agent instructions" section exactly:
1. Read the current file (dating-ui/src/lib/me-profile-api.ts)
2. Group functions by domain
3. Create 4 focused modules (profile, matches, analysis, photos)
4. Update all imports across consuming files
5. Run tests
6. Commit with the message template provided in the story

Working directory: dating-ui/
```

### Step 3: Agent works
Agent will:
- Read `me-profile-api.ts` (983 lines)
- Create `me-profile-api.ts`, `me-matches-api.ts`, `me-analysis-api.ts`, `me-photos-api.ts`
- Grep for imports, update all consuming files
- Run `npm test`
- Commit

### Step 4: Review agent output
Check:
- [ ] 4 new files created, each <300 lines
- [ ] Imports updated (grep "me-profile-api" to verify)
- [ ] Tests pass
- [ ] Commit message follows convention

### Step 5: Manual test (quick smoke)
```bash
cd dating-ui
npm run dev

# Open browser:
- http://localhost:3000/dating/profile (verify loads)
- http://localhost:3000/dating/me-matches (verify loads)
- http://localhost:3000/dating/analysis (verify loads)
```

### Step 6: Merge
```bash
git push origin main
```

### Step 7: Next story
Move to Story 2 (extract conversation hooks).

---

## When to use different agent types

### `generalPurpose` (default for all stories)
Use for standard refactoring, extraction, file splitting:
- Stories 1–6 (all P0)
- Stories 8, 9, 11–14

### `explore` + `generalPurpose` (for complex discovery)
Use `explore` first to analyze structure, then `generalPurpose` to refactor:
- Story 7 (1006-line profiles page — complex logic)
- Story 10 (converting to Server Components — need to identify static vs interactive parts)

Example workflow for Story 7:
```bash
# Step 1: Explore
/task Explore app/profiles/page.tsx structure

Prompt: "Analyze app/profiles/page.tsx (1006 lines). Identify:
1. All inline fetch() calls
2. Chip extraction logic (regex patterns)
3. Type definitions
4. UI sections (list, detail, compare)
Map out what should be extracted and where."

# Step 2: Refactor with generalPurpose
/task Refactor profiles page (Story 7)

Prompt: "Using explore findings, refactor app/profiles/page.tsx:
[paste STORY_07 instructions]"
```

### `review-bugbot` (optional quality gate)
After any story (especially P0), run Bugbot for code review:
```bash
/bugbot review changes from last commit
```

---

## Parallel execution

Some stories can run in parallel to save time:

### Safe parallels:
- **Stories 2 + 3** (conversation hooks + match hooks — different files)
- **Stories 4 + 6** (loading/error UI + RTL fix — different concerns)
- **Stories 9 sub-tasks** (split different components in parallel)

### Must be sequential:
- **Story 1 before Stories 2–3** (if hooks use me-profile-api, better to split it first)
- **Story 5 before Story 7** (profiles page uses fetch, Story 5 creates service layer)
- **Story 10 after Stories 1–9** (server components easier after files are smaller)

---

## Testing strategy per story

### Automated (always)
```bash
cd dating-ui
npm test          # Run vitest
npm run build     # Verify TypeScript clean
```

### Manual smoke test (per story)
- **Story 1:** Profile, matches, analysis, photos pages load
- **Story 2:** Conversation detail (send/receive/unmatch/report)
- **Story 3:** Match detail (like/pass/block/feedback)
- **Story 4:** Navigate routes, see loading skeletons, test error (throw in page)
- **Story 5:** All internal tools (/profiles, /matches, /evaluate)
- **Story 6:** Hebrew locale (cookie `locale=he`), view source for `<html lang="he" dir="rtl">`
- **Story 7–14:** Specific to each story

### Coverage check (after each story)
```bash
npm test -- --coverage
# Verify coverage maintained or improved
```

---

## Commit message format

All stories follow conventional commits:

```
<type>(<scope>): <subject>

<body>

Sprint 26 Story X
```

Examples:
- `refactor(ui): split me-profile-api into focused modules` (Story 1)
- `refactor(ui): extract conversation detail hooks` (Story 2)
- `feat(ui): add route-level loading/error boundaries` (Story 4)
- `fix(ui): server-render correct lang/dir for RTL` (Story 6)

---

## Troubleshooting

### Agent makes wrong change
- Review agent output before pushing
- Use `git diff` to inspect changes
- If incorrect, discard and retry with clearer instructions

### Tests fail after refactor
- Agent should fix tests as part of the story
- If not, manually fix and commit separately
- Update story notes for future reference

### Merge conflicts (if stories overlap)
- Do stories sequentially (recommended)
- If parallel: coordinate which files each story touches
- Resolve conflicts manually, test again

### Agent doesn't follow instructions
- Provide more specific prompts
- Break story into smaller sub-tasks
- Use example code snippets in prompt

---

## Success metrics

Track after each wave:

### After Wave 1 (P0):
- [ ] 0 files >500 lines in product routes
- [ ] Conversation + match pages <300 lines
- [ ] All routes have loading/error UI
- [ ] Internal tools use service layer
- [ ] No RTL flash

### After Wave 2 (P1):
- [ ] All components <300 lines
- [ ] Server Component shells on main routes
- [ ] Complete i18n coverage
- [ ] Route metadata on all pages

### After Wave 3 (P2):
- [ ] No deprecated code
- [ ] Internal routes organized under (internal)/

---

## Final checklist (after Sprint 26 complete)

- [ ] Run full test suite: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual test all product flows:
  - [ ] Onboarding
  - [ ] Profile edit
  - [ ] Matches list + detail
  - [ ] Conversations
  - [ ] Settings
- [ ] Manual test internal tools:
  - [ ] /profiles
  - [ ] /matches
  - [ ] /evaluate
- [ ] Test both locales (en, he)
- [ ] No console errors/warnings
- [ ] Lighthouse audit (optional)
- [ ] Bundle size check (should be smaller)

---

## Next steps after Sprint 26

If all stories complete successfully:
1. Create Sprint 26 retrospective doc
2. Measure improvements:
   - Files >500 lines: 5 → 0
   - Components >300 lines: ~10 → 0
   - Test coverage: X% → Y%
   - Bundle size: X KB → Y KB
3. Consider follow-up sprints:
   - React Query / SWR for data fetching
   - Storybook for component library
   - E2E tests with Playwright
   - Performance optimization

---

## Questions?

If unclear about any story:
1. Re-read the story file (STORY_XX_*.md)
2. Check parent README.md for context
3. Review similar past sprints (e.g., Sprint 21, 25)
4. Ask before executing if uncertain

**Remember: Baby steps. One story at a time. Test after each. Ship when green.**
