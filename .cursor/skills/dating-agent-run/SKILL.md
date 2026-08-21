---
name: dating-agent-run
description: >-
  Run dating-app sprint agents manually using --agent N sprint S story M. Resolves
  story ref, loads agent-N step skill + role skill, writes handoff for next agent.
  Use when the user writes --agent followed by a number, sprint, and story reference.
disable-model-invocation: true
---

# Dating Agent Run (orchestrator)

You run **one agent per message**, manually. Each agent has its own step skill folder.

## Command syntax

```text
--agent <n> sprint <s> story <m>
```

### Core pipeline (always sequential)

| Agent | Step skill | Role skill | Handoff |
|-------|------------|------------|---------|
| **-1** | [agent--1/SKILL.md](./agent--1/SKILL.md) | [dating-preflight](../dating-preflight/SKILL.md) | `agent--1-preflight.md` |
| **0** | [agent-0/SKILL.md](./agent-0/SKILL.md) | [dating-architect](../dating-architect/SKILL.md) | `agent-0-architect.md` |
| **1** | [agent-1/SKILL.md](./agent-1/SKILL.md) | [dating-senior-dev](../dating-senior-dev/SKILL.md) | `agent-1-dev.md` |
| **2** | [agent-2/SKILL.md](./agent-2/SKILL.md) | [dating-code-review](../dating-code-review/SKILL.md) | `agent-2-cr.md` |
| **3** | [agent-3/SKILL.md](./agent-3/SKILL.md) | [dating-pm-contractor](../dating-pm-contractor/SKILL.md) | `agent-3-pm.md` |

### Optional agents (conditional insertion)

| Agent | When to use | Step skill | Role skill | Handoff |
|-------|-------------|------------|------------|---------|
| **2.5** | Security-sensitive (auth, PII, payments) | [agent-2.5/SKILL.md](./agent-2.5/SKILL.md) | [dating-security-review](../dating-security-review/SKILL.md) | `agent-2.5-security.md` |
| **3.5** | Frontend changes (UI/UX) | [agent-3.5/SKILL.md](./agent-3.5/SKILL.md) | [dating-ux-review](../dating-ux-review/SKILL.md) | `agent-3.5-ux.md` |
| **4** | Eligibility/preference/ranking changes | [agent-4/SKILL.md](./agent-4/SKILL.md) | [dating-e2e-tester](../dating-e2e-tester/SKILL.md) | `agent-4-e2e.md` |
| **5** | Post-production verification (1-3 days after deploy) | [agent-5/SKILL.md](./agent-5/SKILL.md) | [dating-post-deploy](../dating-post-deploy/SKILL.md) | `agent-5-postdeploy.md` |

### Full run order examples

**Simple feature (no security/UI/E2E):**
```
-1 → 0 → 1 → 2 → 3 [deploy] → 5
```

**Security-sensitive feature (auth change):**
```
-1 → 0 → 1 → 2 → 2.5 → 3 [deploy] → 5
```

**Frontend feature:**
```
-1 → 0 → 1 → 2 → 3.5 → 3 [deploy] → 5
```

**Matching engine change:**
```
-1 → 0 → 1 → 2 → 4 → 3 [deploy] → 5
```

**Complex feature (security + UI + matching):**
```
-1 → 0 → 1 → 2 → 2.5 → 3.5 → 4 → 3 [deploy] → 5
```

**Feedback loops:**
- If Agent 1 discovers design is unworkable: `--agent 0 sprint <s> story <m> --revision`
- If Agent 2 finds major issues: sends back to Agent 1
- If Agent 2.5 finds critical security: sends back to Agent 1
- If Agent 3.5 finds critical UX: sends back to Agent 1
- If Agent 4 finds bugs: sends back to Agent 1

**Examples:** `--agent 0 sprint 2 story 1` · `--agent 1 sprint 2 story 1` · `--agent 0 sprint 1 STORY_01_like` · `--agent 4 sprint 16 story 1`

---

## Execution flow

1. Parse `--agent <n> sprint <s> story <m>`.
2. Read **this file** + **agent-`<n>`/SKILL.md** (step spec).
3. Read the **role skill** linked from that step spec.
4. Resolve story + epic + required prior handoffs.
5. Do the step. Write handoff using [handoff-template.md](./handoff-template.md).
6. **Git commit + push** implementation/tests/fixes if agent is 1, 2, 2.5, 3.5, or 3 (see agent SKILLs for exact commands). **Handoffs are local only** (in `.gitignore`) and not committed.
7. Reply with handoff path + suggested next command.

**Do not auto-chain.** Wait for the user to invoke the next agent.

---

## Resolve story ref

1. **`sprint <s> story <m>`** → Find sprint folder `dating-api/docs/sprints/sprint-0<s>-*/README.md`, read checklist row #m to get story file (e.g. `sprint 2 story 1` → `sprint-02-mutual-match/STORY_01_detect_mutual.md`).
2. **`sprint <s> STORY_<name>`** → Direct story name (e.g. `sprint 1 STORY_01_like` → `sprint-01-match-actions/STORY_01_like.md`).
3. **Full path** → Use exact path if provided.
4. Always read story (Why, What, AC, DoD) + epic linked from sprint README.

**Sprint folder format:** `sprint-0<s>-<name>` (e.g. `sprint-01-match-actions`, `sprint-02-mutual-match`, `sprint-03-messaging`)

**Handoff folder:**

```text
dating-api/docs/sprints/<sprint-slug>/handoffs/<story-slug>/
```

Create if missing when writing.

---

## Prior handoffs (gate)

| Agent | Required before start |
|-------|----------------------|
| -1 | none |
| 0 | `agent--1-preflight.md` (verdict = "ready") |
| 1 | `agent-0-architect.md` |
| 2 | `agent-1-dev.md` |
| 2.5 | `agent-2-cr.md` (security-sensitive only) |
| 3.5 | `agent-2-cr.md` (or `agent-2.5-security.md` if it exists) |
| 4 | `agent-2-cr.md` (or latest review agent) — skip if story doesn't touch matching engine |
| 3 | All applicable agent handoffs (2, and optionally 2.5, 3.5, 4 based on story type) |
| 5 | `agent-3-pm.md` (status = Done) + deployed to production |

If missing → stop, tell user which `--agent` to run first.

### Feedback loops (revision/escalation)

**Agent 0 revision** (design unworkable):
```text
--agent 0 sprint <s> story <m> --revision
```
Creates `agent-0-architect-rev2.md` (or rev3, rev4...). Agent 1 restarts from latest revision.

**Agent 1/2/2.5/3.5 rejects to Agent 1:**
No special command — Agent 1 fixes issues and updates `agent-1-dev.md` with "Revision 2" section.

**Agent 4 finds bugs:**
Sends back to `--agent 1` (not Agent 2 — implementation bug, not review gap).

---

## Product constraints (all agents)

- Match actions are **user-to-user**: `actorUserId`, `targetUserId`, `targetProfileIdSnapshot`
- `@@unique([actorUserId, targetUserId])`
- API URLs use `UserProfile.id`; resolve to `targetUserId` on write
- See epics:
  - Sprint 1: `dating-api/docs/epics/EPIC_MATCH_ACTIONS.md`
  - Sprints 2-3: `dating-api/docs/epics/EPIC_MUTUAL_MATCH_MESSAGING.md`

## Runtime verification (agents 0, 1, 2)

Stories touching **realtime**, **Next proxy**, **session cookies**, or **migrations** must follow [dating-runtime-verification](../dating-runtime-verification/SKILL.md):

| Agent | Gate |
|-------|------|
| **0** | Document runtime topology in handoff |
| **1** | Browser Network smoke + `migrate deploy` when applicable |
| **2** | Do not approve mocks-only transport; verify topology in code |

## Matching engine E2E verification (agents 0, 1, 2, 4, 3)

Stories touching **eligibility**, **preference dimensions**, or **ranking order** (e.g. Sprint 16, Sprint 17) must follow [dating-e2e-verification](../dating-e2e-verification/SKILL.md). Deep execution belongs to **Agent 4** — agents 0/1/2 plan and don't block on it, agent 3 gates on Agent 4's handoff:

| Agent | Gate |
|-------|------|
| **0** | Document E2E verification plan in handoff (which baseline specs stay green, which new scenarios are needed) |
| **1** | Extend `me-matches-eligibility.spec-support.ts` if trivial; full scenario coverage is agent 4's job, not required to block agent 1's handoff |
| **2** | Do not approve mocks-only eligibility/ranking coverage in the *unit* test sense; flag that agent 4 is required next |
| **4** | Owns actual E2E execution: baseline specs green, new scenarios added, real test run reported. Sends real bugs back to `--agent 1` |
| **3** | Do not mark Done if agent 4 was applicable but skipped, or its scenario was deferred without a tracked follow-up |

---

## Reply format

```markdown
## Done: --agent <n> sprint <s> story <m>

**Handoff:** `dating-api/docs/sprints/.../agent-<n>-....md`

**Summary:** ...

**Next (when you're ready):** `--agent <next> sprint <s> story <m>`

(Or if ready for autorun: `--autorun sprint <s> story <m> --start-from <next>`)
```

If agent verdict is "blocked" or "rejected":

```markdown
## Blocked: --agent <n> sprint <s> story <m>

**Handoff:** `dating-api/docs/sprints/.../agent-<n>-....md`

**Issue:** [describe blocker]

**Fix needed:** [what must be done]

**Next:** `--agent <fix-agent> sprint <s> story <m>` (usually Agent 0 --revision or Agent 1 to fix)
```
