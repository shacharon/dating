---
name: dating-agent-3.5
description: >-
  Agent 3.5 (UI/UX Review) for dating sprint stories. Checks accessibility,
  mobile responsiveness, design system compliance. Use when the user runs
  --agent 3.5 story N.
disable-model-invocation: true
---

# Agent 3.5 — UI/UX Review

**Command:** `--agent 3.5 story <m>`

## When to use

**Only** for stories with frontend changes:
- New UI pages/components
- Form inputs
- Navigation changes
- Mobile/responsive layout

**Skip this agent** for backend-only stories.

## Before you start

1. Read [../SKILL.md](../SKILL.md) — resolve story ref and handoff paths.
2. Read the story file + linked epic.
3. Read **`agent-2-cr.md`** (or `agent-2.5-security.md` if it exists) — **required**.
4. Read all UI files changed per Agent 1/2 handoffs.

## Role skill (read and follow)

Load and apply: [../../dating-ux-review/SKILL.md](../../dating-ux-review/SKILL.md)

## Your job this step

- [ ] Accessibility audit (WCAG 2.1 AA compliance)
- [ ] Mobile responsiveness (320px, 375px, 768px, 1024px breakpoints)
- [ ] Design system compliance (colors, typography, spacing)
- [ ] Loading/error/empty states present
- [ ] Form validation UX (inline errors, clear labels)
- [ ] **Send back to Agent 1** for critical UX issues (unusable on mobile, inaccessible forms)

## Handoff (mandatory)

Write: `dating-api/docs/sprints/<sprint>/handoffs/<story>/agent-3.5-ux.md`

Template: [../handoff-template.md](../handoff-template.md)

Include: accessibility findings (Critical/High/Medium/Low), responsiveness check, design system compliance, screenshots.

## Git commit + push (mandatory)

After writing handoff (and any UX fixes):

```bash
# Stage UX fixes only (handoffs are in .gitignore)
git add dating-ui/src
# Or specific files with UX fixes

# Commit
git commit -m "ux: review sprint <s> story <m>

Agent 3.5 (UI/UX review)
- Accessibility: [issues found/fixed]
- Mobile: [320px-1024px status]
- Verdict: [approved|needs-fixes]
"

# Push
git push
```

**Note:** Handoffs are local only (in `.gitignore`). Only commit UX fixes.

**Next (user runs manually):** `--agent 4 story <m>` if applicable, else `--agent 3 story <m>` — or `--agent 1 story <m>` if critical issues found
