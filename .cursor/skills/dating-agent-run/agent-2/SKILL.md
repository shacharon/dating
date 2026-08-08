---
name: dating-agent-2
description: >-
  Agent 2 (Code review) for dating sprint stories. Reviews implementation,
  writes tests, fixes issues. Use when the user runs --agent 2 story N.
disable-model-invocation: true
---

# Agent 2 — Code review + tests

**Command:** `--agent 2 story <m>`

## Before you start

1. Read [../SKILL.md](../SKILL.md) — resolve story ref and handoff paths.
2. Read the story file + linked epic.
3. Read **`agent-1-dev.md`** handoff — **required**. If missing, stop and tell user to run `--agent 1 story <m>` first.
4. Read all files listed in the dev handoff.

## Role skill (read and follow)

Load and apply: [../../dating-code-review/SKILL.md](../../dating-code-review/SKILL.md)

## Your job this step

- [ ] Review code for security, logic, patterns
- [ ] **Runtime / transport gate** — [dating-runtime-verification](../../dating-runtime-verification/SKILL.md) (no mocks-only approval for realtime)
- [ ] **Matching engine E2E gate** — [dating-e2e-verification](../../dating-e2e-verification/SKILL.md) (no mocks-only approval for eligibility/ranking; note in handoff that `--agent 4` is required next for these stories — deep E2E execution is agent 4's job, not this step's)
- [ ] Write/fix tests; run test commands
- [ ] Fix critical/major issues found

## Handoff (mandatory)

Write: `dating-api/docs/sprints/<sprint>/handoffs/<story>/agent-2-cr.md`

Template: [../handoff-template.md](../handoff-template.md)

Include: verdict (approved | fixed), test paths, commands + results, **runtime verification** (browser Network or API socket integration), remaining issues.

## Git commit + push (mandatory)

After writing handoff:

```bash
# Stage tests and fixes only (handoffs are in .gitignore)
git add dating-api/src/**/*.spec.ts dating-ui/src/**/*.spec.tsx
# Or specific test files

# Commit
git commit -m "test: add tests for sprint <s> story <m>

Agent 2 (code review)
- Tests added: [list spec files]
- Issues fixed: [list if any]
- Verdict: [approved|needs-fixes]

[Test results]
"

# Push to same feature branch
git push
```

**Note:** Handoffs are local only (in `.gitignore`). Only commit tests and code fixes.

**Next (user runs manually):** `--agent 4 story <m>` if this story touches eligibility/preference/ranking, else `--agent 3 story <m>` — or `--agent 1 story <m>` if major fixes needed
