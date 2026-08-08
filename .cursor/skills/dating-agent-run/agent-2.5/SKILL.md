---
name: dating-agent-2.5
description: >-
  Agent 2.5 (Security Review) for dating sprint stories. Deep security audit
  for high-risk changes (auth, permissions, PII, payments, crypto).
  Use when the user runs --agent 2.5 story N.
disable-model-invocation: true
---

# Agent 2.5 — Security Review

**Command:** `--agent 2.5 story <m>`

## When to use

**Only** for stories with security-sensitive changes:
- Authentication/authorization logic
- Permission/access control systems
- PII handling (profile data, photos, messages)
- Payment/billing flows
- Cryptographic operations
- Admin/elevated privilege features
- Content moderation/safety

**Skip this agent** for regular feature work (Agent 2 does basic security review).

## Before you start

1. Read [../SKILL.md](../SKILL.md) — resolve story ref and handoff paths.
2. Read the story file + linked epic.
3. Read **`agent-2-cr.md`** handoff — **required**. If missing, stop and tell user to run `--agent 2 story <m>` first.
4. Read all files changed per Agent 1/2 handoffs.

## Role skill (read and follow)

Load and apply: [../../dating-security-review/SKILL.md](../../dating-security-review/SKILL.md)

## Your job this step

- [ ] Threat model the change (who could attack? what's the worst case?)
- [ ] Audit authentication/authorization (can user access others' data?)
- [ ] Check input validation and sanitization
- [ ] Review PII handling (logging, error messages, API responses)
- [ ] Check for injection vulnerabilities (SQL, XSS, command injection)
- [ ] Verify rate limiting on new endpoints
- [ ] Check secrets management (env vars, not hardcoded)
- [ ] Review error messages (don't leak sensitive info)
- [ ] **Send back to Agent 1** for critical security issues

## Handoff (mandatory)

Write: `dating-api/docs/sprints/<sprint>/handoffs/<story>/agent-2.5-security.md`

Template: [../handoff-template.md](../handoff-template.md)

Include: threat model, vulnerabilities found (Critical/High/Medium/Low), fixes made, residual risks.

## Git commit + push (mandatory)

After writing handoff (and any security fixes):

```bash
# Stage security fixes only (handoffs are in .gitignore)
git add dating-api/src dating-ui/src
# Or specific files with security fixes

# Commit
git commit -m "security: review sprint <s> story <m>

Agent 2.5 (security review)
- Vulnerabilities: [Critical/High/Medium/Low counts]
- Fixes applied: [list]
- Verdict: [approved|rejected]
"

# Push
git push
```

**Note:** Handoffs are local only (in `.gitignore`). Only commit security fixes.

**Next (user runs manually):** `--agent 4 story <m>` if applicable, else `--agent 3 story <m>` — or `--agent 1 story <m>` if critical issues found
