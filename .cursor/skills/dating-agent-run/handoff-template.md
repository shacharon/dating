# Handoff: Agent [N] — [ROLE] — Story [M]

**Agent:** -1 preflight | 0 architect | 1 dev | 2 code-review | 2.5 security | 3.5 ux | 4 e2e-tester | 3 pm | 5 postdeploy  
**Story:** [link to story file]  
**Sprint:** [sprint folder name]  
**Date:** YYYY-MM-DD  
**Status:** complete | blocked | needs-revision  
**Verdict:** (Agent -1: ready | needs-clarification | blocked) | (Agent 1-4: approved | rejected | blocked) | (Agent 3: Done | Blocked) | (Agent 5: verified | needs-hotfix)

---

## Summary

- Bullet 1
- Bullet 2
- Bullet 3

---

## Artifacts

| Path | Change |
|------|--------|
| `path/to/file` | created / updated / N/A (design only) |

---

## Decisions (do not reverse without discussion)

- Decision 1
- Decision 2

---

## Complexity estimate (Agent -1 only)

- Size: Small | Medium | Large | Split
- Estimated duration: [X days]
- Agent 4 required: Yes | No
- Agent 2.5 required: Yes | No
- Agent 3.5 required: Yes | No

---

## Runtime topology (architect — realtime / proxy / cookies only)

- REST browser target:
- Socket browser target:
- Cookie host rule:
- Connection policy (singleton / per-page):
- Expected Network tab:

---

## Tests / verification

- [ ] Unit/integration command: `...`
- [ ] Result: pass / fail / not run (architect/pm)
- [ ] `prisma migrate deploy` (if schema changed): yes / N/A
- [ ] Browser Network smoke (dev/CR): pass / deferred / N/A
- [ ] Socket transport: WebSocket 101 / polling-only / not checked

---

## E2E verification (agent 4 — eligibility / preference / ranking stories only, else N/A)

- [ ] Baseline specs (`me-new-model-e2e*.integration.spec.ts`) still green, unmodified: yes / no — if no, explain
- [ ] New scenario(s) added: `path/to/spec.ts` — what they cover
- [ ] `npx jest --no-coverage "integration.spec" --runInBand` result:
- [ ] Bug found requiring `--agent 1`: none / describe

---

## Security audit (agent 2.5 — auth/PII/payment stories only, else N/A)

- [ ] Threat model: (attacker, worst case, blast radius)
- [ ] Vulnerabilities: Critical / High / Medium / Low — describe
- [ ] Fixes applied: commit hashes
- [ ] Residual risks: tracked in [story/epic]

---

## UI/UX review (agent 3.5 — frontend stories only, else N/A)

- [ ] Accessibility: WCAG 2.1 AA compliance: pass / issues found
- [ ] Mobile responsiveness: 320px, 375px, 768px, 1024px: pass / issues found
- [ ] Design system: colors, typography, spacing: pass / issues found
- [ ] States: loading, error, empty, success: present / missing
- [ ] Forms: labels, validation, submit state: pass / issues found

---

## Post-deployment (agent 5 — after production deploy)

- [ ] Error rate: baseline vs. post-deploy (% change)
- [ ] Performance: P50/P95/P99 latency (% change)
- [ ] User metrics: DAU, feature adoption, conversion
- [ ] User feedback: support tickets, reviews, social media
- [ ] Issues: P0 / P1 / P2 / P3 — describe
- [ ] Rollback needed: yes / no

---

## Open questions / blockers

- None | ...

---

## Git commit (if applicable)

**Note:** Handoffs are local only (in `.gitignore`). Only implementation/tests/fixes are committed.

```bash
# See agent-N SKILL.md for exact commit command
# Agents -1, 0, 5: no commit (handoffs only)
# Agents 1, 2, 2.5, 3.5, 4, 3: commit code/tests/status only
git add [implementation files]
git commit -m "[type]: [message]"
git push  # (if applicable)
```

Commit hash: `[paste after committing, or N/A for handoff-only agents]`

### Agent 3 only — land on main (required when Done)

```bash
git checkout main && git pull origin main
git merge --no-ff origin/feature/sprint-<s>-story-<m> -m "merge: sprint <s> story <m> into main"
git push origin main
git rev-list --count origin/main..origin/feature/sprint-<s>-story-<m>   # must be 0
```

Shipped on main: `<sha>` | Ahead of main: `0`

---

## Next agent

```text
--agent [N] story [M]
```

**Notes for next agent:**

- ...
