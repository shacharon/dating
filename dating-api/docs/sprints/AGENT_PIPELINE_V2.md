# Agent Pipeline V2 — Complete Flow

**Version:** 2.0 (2026-08-08)  
**Orchestrator:** `.cursor/skills/dating-agent-run/SKILL.md`

## Overview

Improved 8-agent pipeline with pre-flight validation, security review, UI/UX audit, post-deploy verification, and feedback loops.

## Pipeline Agents

### Core Pipeline (Always Run)

```
-1 → 0 → 1 → 2 → 3
```

| # | Role | Focus | Handoff |
|---|------|-------|---------|
| **-1** | Pre-flight | Dependencies, conflicts, story readiness | `agent--1-preflight.md` |
| **0** | Architect | Schema, API contracts, design | `agent-0-architect.md` |
| **1** | Senior Dev | Implementation (API + UI) | `agent-1-dev.md` |
| **2** | Code Review | Tests, security basics, review | `agent-2-cr.md` |
| **3** | PM | DoD verification, story closure | `agent-3-pm.md` |

### Optional Agents (Conditional)

| # | Role | When to Use | Handoff |
|---|------|-------------|---------|
| **2.5** | Security Review | Auth, permissions, PII, payments, crypto | `agent-2.5-security.md` |
| **3.5** | UI/UX Review | Frontend changes, forms, mobile | `agent-3.5-ux.md` |
| **4** | E2E Tester | Eligibility, ranking, preference changes | `agent-4-e2e.md` |
| **5** | Post-deploy | 1-3 days after production deploy | `agent-5-postdeploy.md` |

## Flow Examples

### Simple Backend Feature
```
-1 → 0 → 1 → 2 → 3 [deploy] → 5
```

### Security-Sensitive Feature (Auth, Admin)
```
-1 → 0 → 1 → 2 → 2.5 → 3 [deploy] → 5
```

### Frontend Feature (New UI)
```
-1 → 0 → 1 → 2 → 3.5 → 3 [deploy] → 5
```

### Matching Engine Change
```
-1 → 0 → 1 → 2 → 4 → 3 [deploy] → 5
```

### Complex Feature (All Aspects)
```
-1 → 0 → 1 → 2 → 2.5 → 3.5 → 4 → 3 [deploy] → 5
```

## Feedback Loops

### Agent 0 Revision (Design Unworkable)

If Agent 1 discovers the design is impossible/impractical:

```text
--agent 0 sprint <s> story <m> --revision
```

Creates `agent-0-architect-rev2.md`. Agent 1 restarts from latest revision.

### Agent 1 Fix Loop (Issues Found)

If Agent 2, 2.5, 3.5, or 4 finds issues:

```text
--agent 1 sprint <s> story <m>
```

Agent 1 updates `agent-1-dev.md` with "Revision 2" section. Then re-run failing agent.

### Agent -1 Clarification

If Agent -1 verdict is "needs-clarification":

1. User provides clarification
2. Re-run: `--agent -1 sprint <s> story <m>`

## Commands

### Manual (One Agent at a Time)
```bash
--agent -1 sprint 46 story 1  # Pre-flight
--agent 0 sprint 46 story 1   # Architect
--agent 1 sprint 46 story 1   # Dev
--agent 2 sprint 46 story 1   # Code review
--agent 2.5 sprint 46 story 1 # Security (if needed)
--agent 3.5 sprint 46 story 1 # UI/UX (if needed)
--agent 4 sprint 46 story 1   # E2E (if needed)
--agent 3 sprint 46 story 1   # PM close
# [Deploy to production]
--agent 5 sprint 46 story 1   # Post-deploy (1-3 days later)
```

### Autorun (Automatic Chaining)
```bash
--autorun sprint 46 story 1   # Runs -1 → 0 → 1 → 2 → (optional) → 3

# Options:
--autorun sprint 46 story 1 --skip-agent 4        # Skip E2E even if detected
--autorun sprint 46 story 1 --start-from 2        # Resume from Agent 2
```

## Agent Responsibilities

### Agent -1: Pre-flight
- ✅ Verify dependencies (Sprint X Done, Story Y merged)
- ✅ Check story definition (Why/What/AC/DoD complete)
- ✅ Detect conflicts (parallel work on same files)
- ✅ Validate sprint context (not blocked)
- ✅ Estimate complexity (Small/Medium/Large/Split)
- ✅ Write handoff (local only, in `.gitignore`)
- ⛔ Don't design or implement
- ⛔ Don't git commit (handoff is local only)

**Verdict:** `ready` | `needs-clarification` | `blocked`

### Agent 0: Architect
- ✅ Design Prisma schema + migrations
- ✅ Define API contracts (copy-paste ready)
- ✅ Service signatures + module placement
- ✅ Runtime topology (realtime/proxy/cookies)
- ✅ E2E verification plan (eligibility/ranking)
- ✅ Write handoff (local only, in `.gitignore`)
- ⛔ Don't write implementation code or tests
- ⛔ Don't git commit (handoff is local only)

**Escalation:** If Agent 1 says design is unworkable → `--agent 0 --revision`

### Agent 1: Senior Dev
- ✅ Implement per architect handoff
- ✅ Run migrations (`npx prisma migrate deploy`)
- ✅ Manual smoke in real browser (realtime/auth)
- ✅ Extend E2E harness (eligibility/ranking)
- ✅ **Git commit + push** implementation to feature branch
- ⛔ Don't write full test suite (Agent 2's job)

**Feedback:** Receives fixes from Agent 2/2.5/3.5/4

### Agent 2: Code Review
- ✅ Review security, logic, patterns
- ✅ Runtime/transport gate (no mocks-only for realtime)
- ✅ Flag Agent 4 requirement (matching engine)
- ✅ Write/fix tests; run test commands
- ✅ Fix critical/major issues found
- ✅ **Git commit + push** tests and fixes
- ⛔ Don't approve realtime with mocks-only
- ⛔ Don't approve matching changes without Agent 4 note

**Verdict:** `approved` | `needs-fixes` (send to Agent 1)

### Agent 2.5: Security Review (Optional)
- ✅ Threat model (attacker, worst case, blast radius)
- ✅ Audit auth/authz (can user access others' data?)
- ✅ Check input validation and sanitization
- ✅ Review PII handling (logs, errors, API responses)
- ✅ Check injection vulnerabilities (SQL, XSS, command)
- ✅ Verify rate limiting
- ✅ Check secrets management (env vars, not hardcoded)
- ✅ **Git commit + push** security fixes and handoff
- ⛔ Don't approve Critical/High vulns with "will fix later"

**Verdict:** `approved` | `rejected` (send to Agent 1)

### Agent 3.5: UI/UX Review (Optional)
- ✅ Accessibility audit (WCAG 2.1 AA)
- ✅ Mobile responsiveness (320px, 375px, 768px, 1024px)
- ✅ Design system compliance (colors, typography, spacing)
- ✅ Loading/error/empty states present
- ✅ Form validation UX (inline errors, labels)
- ✅ **Git commit + push** UX fixes and handoff
- ⛔ Don't approve Critical/High UX issues

**Verdict:** `approved` | `needs-fixes` (send to Agent 1)

### Agent 4: E2E Tester (Optional)
- ✅ Confirm 3 baseline E2E specs green, unmodified
- ✅ Add/extend E2E scenarios via shared harness
- ✅ Run full E2E suite; report real result
- ✅ **Git commit + push** E2E scenarios and handoff
- ⛔ Don't rewrite unit tests (Agent 2's job)
- ⛔ Don't implement fixes (Agent 1's job)

**Verdict:** `pass` | `blocked` (send to Agent 1)

### Agent 3: PM
- ✅ Verify DoD against all handoffs
- ✅ Confirm runtime topology + browser smoke (realtime)
- ✅ Confirm Agent 4 handoff exists (matching)
- ✅ Update story Status + DoD checkboxes
- ✅ Update sprint README checklist
- ✅ **Git commit + push** story status updates and handoff (triggers PR ready)
- ⛔ Don't implement code
- ⛔ Don't mark Done if Agent 4 blocked

**Verdict:** `Done` | `Blocked`

### Agent 5: Post-deploy (Days Later)
- ✅ Check error rate (Sentry, logs)
- ✅ Check performance (P50/P95/P99 latency)
- ✅ Check user metrics (DAU, engagement, conversion)
- ✅ Review user feedback (support, reviews, social)
- ✅ Verify feature flag ON (if applicable)
- ✅ Write handoff (local only, in `.gitignore`)
- ⛔ Don't implement fixes (create follow-up story)
- ⛔ Don't git commit (handoff is local only)

**Verdict:** `verified` | `needs-hotfix`

## Improvements Over V1

### ✅ Added
1. **Agent -1 (Pre-flight)** — Catches dependency/conflict issues before architecture work starts
2. **Agent 2.5 (Security)** — Deep security audit for high-risk changes
3. **Agent 3.5 (UI/UX)** — Accessibility, mobile, design system checks
4. **Agent 5 (Post-deploy)** — Production verification (error rate, latency, user feedback)
5. **Feedback loops** — Agent 0 revision, Agent 1 fix iterations
6. **Autorun command** — Automatic chaining of agents
7. **Complexity estimates** — Story sizing at pre-flight
8. **Better handoff template** — Verdict field, security/UX sections

### ✅ Fixed
1. **No Agent 0 feedback** → Added `--agent 0 --revision` escalation path
2. **Confusing numbering** → Kept for backward compat; documented clearly
3. **Manual orchestration** → Added `--autorun` for automatic flow
4. **No parallel work** → Agent -1 detects conflicts early
5. **Heavy overhead for simple stories** → Optional agents skip when not needed
6. **PM too late** → Agent -1 catches issues before work starts
7. **No security focus** → Agent 2.5 for high-risk changes
8. **No UX review** → Agent 3.5 for frontend work
9. **No production feedback** → Agent 5 for post-deploy verification
10. **No rollback plan** → Agent 5 tracks rollback need

## When to Use Each Agent

| Story Type | Agents |
|------------|--------|
| Simple backend (no auth, no UI, no matching) | -1 → 0 → 1 → 2 → 3 |
| Auth/admin feature | -1 → 0 → 1 → 2 → **2.5** → 3 |
| New UI page | -1 → 0 → 1 → 2 → **3.5** → 3 |
| Matching engine change | -1 → 0 → 1 → 2 → **4** → 3 |
| Complex (security + UI + matching) | -1 → 0 → 1 → 2 → **2.5** → **3.5** → **4** → 3 |
| After production deploy | **5** (1-3 days later) |

## Handoff Locations

```
dating-api/docs/sprints/<sprint-slug>/handoffs/<story-slug>/
  agent--1-preflight.md      # -1: Pre-flight
  agent-0-architect.md        # 0: Design
  agent-0-architect-rev2.md   # 0: Revision (if needed)
  agent-1-dev.md              # 1: Implementation
  agent-2-cr.md               # 2: Code review
  agent-2.5-security.md       # 2.5: Security (optional)
  agent-3.5-ux.md             # 3.5: UI/UX (optional)
  agent-4-e2e.md              # 4: E2E (optional)
  agent-3-pm.md               # 3: PM closure
  agent-5-postdeploy.md       # 5: Post-deploy (optional)
```

## Migration from V1

V1 pipeline: `0 → 1 → 2 → 4 → 3`

To adopt V2:
1. Add `--agent -1` before starting new stories
2. For stories with auth/PII, add `--agent 2.5` after Agent 2
3. For stories with UI, add `--agent 3.5` after Agent 2 (or 2.5)
4. After deploys, add `--agent 5` after 1-3 days
5. Use `--agent 0 --revision` if Agent 1 finds design issues
6. Try `--autorun` for new stories to reduce manual work

Existing in-progress stories can continue with V1 flow — no breaking changes.

## Questions?

See: `.cursor/skills/dating-agent-run/SKILL.md`
