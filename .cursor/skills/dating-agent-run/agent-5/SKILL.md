---
name: dating-agent-5
description: >-
  Agent 5 (Post-deployment verification) for dating sprint stories. Runs after
  production deploy to verify metrics, logs, user feedback. Use when the user
  runs --agent 5 story N.
disable-model-invocation: true
---

# Agent 5 — Post-deployment Verification

**Command:** `--agent 5 story <m>`

## When to use

**Only** after story is deployed to production (not staging). Typically run 1-3 days after deploy.

## Before you start

1. Read [../SKILL.md](../SKILL.md) — resolve story ref and handoff paths.
2. Read the story file + linked epic.
3. Read **`agent-3-pm.md`** handoff — **required**. Story must be marked "Done" first.
4. Verify story code is deployed to production (check git tag, deploy log, or feature flag).

## Role skill (read and follow)

Load and apply: [../../dating-post-deploy/SKILL.md](../../dating-post-deploy/SKILL.md)

## Your job this step

- [ ] Check error rate (Sentry, logs) — any new exceptions?
- [ ] Check performance (P50/P95/P99 latency) — any regressions?
- [ ] Check user metrics (DAU, engagement, conversion) — expected change?
- [ ] Review user feedback (support tickets, app reviews) — any complaints?
- [ ] Verify feature flag is ON (if applicable)
- [ ] **Reopen story** if P0/P1 issues found

## Handoff (mandatory)

Write: `dating-api/docs/sprints/<sprint>/handoffs/<story>/agent-5-postdeploy.md`

Template: [../handoff-template.md](../handoff-template.md)

Include: error rate, latency, user metrics, feedback summary, issues found (P0/P1/P2), rollback needed (yes/no).

## Git (handoffs are local only)

Handoff files are in `.gitignore` and stay local. No git commit needed for Agent 5.

Post-deploy metrics are documented in the handoff for local reference only.

**Next:** No next agent. If issues found, create follow-up story or hotfix.
