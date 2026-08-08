# Orchestration refactor track — all agent commands

**Purpose:** One copy-paste list for Option A (API first → UI).  
**Paste into Cursor chat ONE command at a time.**  
**Order per story (V2):** -1 → 0 → 1 → 2 → (2.5/3.5/4 if applicable) → 3 → (5 after deploy).  
**Orchestrator:** `.cursor/skills/dating-agent-run/SKILL.md`  
**Pipeline docs:** `dating-api/docs/sprints/AGENT_PIPELINE_V2.md`

**Track order:** 45 → 38.3 → 46 → 47

**New in V2:**
- Agent -1 (pre-flight) validates dependencies before starting
- Agent 2.5 (security) for auth/PII changes
- Agent 3.5 (UI/UX) for frontend changes
- Agent 5 (post-deploy) for production verification
- Autorun: `--autorun sprint <s> story <m>` chains agents automatically

| Sprint | Folder |
|--------|--------|
| 45 | [`sprint-45-orchestration-foundations`](./sprint-45-orchestration-foundations/) |
| 38.3 | [`sprint-38-god-services-split`](./sprint-38-god-services-split/) Story 03 |
| 46 | [`sprint-46-pair-match-policy`](./sprint-46-pair-match-policy/) |
| 47 | [`sprint-47-matches-ui-contracts`](./sprint-47-matches-ui-contracts/) |

---

## Sprint 45 — Foundations

```text
--agent 0 sprint 45 story 1
```

```text
--agent 1 sprint 45 story 1
```

```text
--agent 2 sprint 45 story 1
```

```text
--agent 3 sprint 45 story 1
```

```text
--agent 0 sprint 45 story 2
```

```text
--agent 1 sprint 45 story 2
```

```text
--agent 2 sprint 45 story 2
```

```text
--agent 3 sprint 45 story 2
```

```text
--agent 0 sprint 45 story 3
```

```text
--agent 1 sprint 45 story 3
```

```text
--agent 2 sprint 45 story 3
```

```text
--agent 3 sprint 45 story 3
```

---

## Sprint 38 Story 3 — Split MeMatchesService (Agent 4)

```text
--agent 0 sprint 38 story 3
```

```text
--agent 1 sprint 38 story 3
```

```text
--agent 2 sprint 38 story 3
```

```text
--agent 4 sprint 38 story 3
```

```text
--agent 3 sprint 38 story 3
```

---

## Sprint 46 — PairMatchPolicy + admin + dedupe

```text
--agent 0 sprint 46 story 1
```

```text
--agent 1 sprint 46 story 1
```

```text
--agent 2 sprint 46 story 1
```

```text
--agent 4 sprint 46 story 1
```

```text
--agent 3 sprint 46 story 1
```

```text
--agent 0 sprint 46 story 2
```

```text
--agent 1 sprint 46 story 2
```

```text
--agent 2 sprint 46 story 2
```

```text
--agent 4 sprint 46 story 2
```

```text
--agent 3 sprint 46 story 2
```

```text
--agent 0 sprint 46 story 3
```

```text
--agent 1 sprint 46 story 3
```

```text
--agent 2 sprint 46 story 3
```

```text
--agent 3 sprint 46 story 3
```

---

## Sprint 47 — UI / Berlin (V2 Pipeline — First V2 Sprint!)

**Pipeline:** -1 → 0 → 1 → 2 → 3.5 → 3 → [deploy] → 5  
**New agents:** Agent -1 (pre-flight) + Agent 3.5 (UI/UX review) + Agent 5 (post-deploy)  
**Commands:** See [`sprint-47-matches-ui-contracts/AGENT_COMMANDS_V2.md`](./sprint-47-matches-ui-contracts/AGENT_COMMANDS_V2.md) or use autorun below.

### Story 1 — UI match view-models

**Recommended:**
```text
--autorun sprint 47 story 1
```

**Manual (V2 pipeline):**
```text
--agent -1 sprint 47 story 1
```

```text
--agent 0 sprint 47 story 1
```

```text
--agent 1 sprint 47 story 1
```

```text
--agent 2 sprint 47 story 1
```

```text
--agent 3.5 sprint 47 story 1
```

```text
--agent 3 sprint 47 story 1
```

**After deploy:**
```text
--agent 5 sprint 47 story 1
```

---

### Story 2 — Matches React Query

**Recommended:**
```text
--autorun sprint 47 story 2
```

**Manual:**
```text
--agent -1 sprint 47 story 2
```

```text
--agent 0 sprint 47 story 2
```

```text
--agent 1 sprint 47 story 2
```

```text
--agent 2 sprint 47 story 2
```

```text
--agent 3.5 sprint 47 story 2
```

```text
--agent 3 sprint 47 story 2
```

**After deploy:**
```text
--agent 5 sprint 47 story 2
```

---

### Story 3 — Chip-evidence enum

**Recommended:**
```text
--autorun sprint 47 story 3
```

**Manual:**
```text
--agent -1 sprint 47 story 3
```

```text
--agent 0 sprint 47 story 3
```

```text
--agent 1 sprint 47 story 3
```

```text
--agent 2 sprint 47 story 3
```

```text
--agent 3.5 sprint 47 story 3
```

```text
--agent 3 sprint 47 story 3
```

**After deploy:**
```text
--agent 5 sprint 47 story 3
```
