# Round 2 (Phase 2) — all agent commands

**Purpose:** Paste into Cursor **one command at a time**.  
**Pipeline V2:** [AGENT_PIPELINE_V2.md](./AGENT_PIPELINE_V2.md)  
**Order per story:** `-1 → 0 → 1 → 2 → (2.5 / 3.5 / 4 if listed) → 3 → (5 after deploy)`  
**Orchestrator:** `.cursor/skills/dating-agent-run/SKILL.md`  
**Scan:** [repo-tech-scan-round-2 canvas](../../../../../../Users/shachar/.cursor/projects/c-dev-piza-dating/canvases/repo-tech-scan-round-2.canvas.tsx) (IDE)

**Track order:** **48 → 49 → 50 → 51 → 52 → 53 → 54 → 55 → 56**  
(Start after / alongside late Option A: 45 → 38.3 → 46 → 47.)

| Sprint | Folder | Extra agents |
|--------|--------|--------------|
| 48 | [`sprint-48-queue-cron-hardening`](./sprint-48-queue-cron-hardening/) | 2.5 on S3; 5 |
| 49 | [`sprint-49-realtime-presence`](./sprint-49-realtime-presence/) | 2.5 all; 5 |
| 50 | [`sprint-50-spec-decomposition`](./sprint-50-spec-decomposition/) | — |
| 51 | [`sprint-51-expansion-registry`](./sprint-51-expansion-registry/) | 4 on S2 |
| 52 | [`sprint-52-keyword-engine-freeze`](./sprint-52-keyword-engine-freeze/) | — |
| 53 | [`sprint-53-layer-archaeology`](./sprint-53-layer-archaeology/) | — |
| 54 | [`sprint-54-typed-errors-hygiene`](./sprint-54-typed-errors-hygiene/) | 2.5 on S2; 5 |
| 55 | [`sprint-55-notification-templates`](./sprint-55-notification-templates/) | 2.5 on S2; 5 |
| 56 | [`sprint-56-ui-round-2`](./sprint-56-ui-round-2/) | 3.5 all; 2.5 on S3; 5 |

**Autorun (optional):** `--autorun sprint 48 story 1`

**Spec budget:** [SPEC_BUDGET.md](../SPEC_BUDGET.md) — soft LOC / ownership rules for new specs (warn-only check: `npm run check:spec-budget` in `dating-api`).

---

## Sprint 48 — Queue & cron

```text
--agent -1 sprint 48 story 1
--agent 0 sprint 48 story 1
--agent 1 sprint 48 story 1
--agent 2 sprint 48 story 1
--agent 3 sprint 48 story 1
--agent 5 sprint 48 story 1

--agent -1 sprint 48 story 2
--agent 0 sprint 48 story 2
--agent 1 sprint 48 story 2
--agent 2 sprint 48 story 2
--agent 3 sprint 48 story 2
--agent 5 sprint 48 story 2

--agent -1 sprint 48 story 3
--agent 0 sprint 48 story 3
--agent 1 sprint 48 story 3
--agent 2 sprint 48 story 3
--agent 2.5 sprint 48 story 3
--agent 3 sprint 48 story 3
--agent 5 sprint 48 story 3
```

---

## Sprint 49 — Realtime presence

```text
--agent -1 sprint 49 story 1
--agent 0 sprint 49 story 1
--agent 1 sprint 49 story 1
--agent 2 sprint 49 story 1
--agent 2.5 sprint 49 story 1
--agent 3 sprint 49 story 1
--agent 5 sprint 49 story 1

--agent -1 sprint 49 story 2
--agent 0 sprint 49 story 2
--agent 1 sprint 49 story 2
--agent 2 sprint 49 story 2
--agent 2.5 sprint 49 story 2
--agent 3 sprint 49 story 2
--agent 5 sprint 49 story 2

--agent -1 sprint 49 story 3
--agent 0 sprint 49 story 3
--agent 1 sprint 49 story 3
--agent 2 sprint 49 story 3
--agent 2.5 sprint 49 story 3
--agent 3 sprint 49 story 3
--agent 5 sprint 49 story 3
```

---

## Sprint 50 — Spec decomposition

```text
--agent -1 sprint 50 story 1
--agent 0 sprint 50 story 1
--agent 1 sprint 50 story 1
--agent 2 sprint 50 story 1
--agent 3 sprint 50 story 1

--agent -1 sprint 50 story 2
--agent 0 sprint 50 story 2
--agent 1 sprint 50 story 2
--agent 2 sprint 50 story 2
--agent 3 sprint 50 story 2

--agent -1 sprint 50 story 3
--agent 0 sprint 50 story 3
--agent 1 sprint 50 story 3
--agent 2 sprint 50 story 3
--agent 3 sprint 50 story 3
```

---

## Sprint 51 — Expansion registry

```text
--agent -1 sprint 51 story 1
--agent 0 sprint 51 story 1
--agent 1 sprint 51 story 1
--agent 2 sprint 51 story 1
--agent 3 sprint 51 story 1

--agent -1 sprint 51 story 2
--agent 0 sprint 51 story 2
--agent 1 sprint 51 story 2
--agent 2 sprint 51 story 2
--agent 4 sprint 51 story 2
--agent 3 sprint 51 story 2

--agent -1 sprint 51 story 3
--agent 0 sprint 51 story 3
--agent 1 sprint 51 story 3
--agent 2 sprint 51 story 3
--agent 3 sprint 51 story 3
```

---

## Sprint 52 — Keyword-engine freeze

```text
--agent -1 sprint 52 story 1
--agent 0 sprint 52 story 1
--agent 1 sprint 52 story 1
--agent 2 sprint 52 story 1
--agent 3 sprint 52 story 1

--agent -1 sprint 52 story 2
--agent 0 sprint 52 story 2
--agent 1 sprint 52 story 2
--agent 2 sprint 52 story 2
--agent 3 sprint 52 story 2

--agent -1 sprint 52 story 3
--agent 0 sprint 52 story 3
--agent 1 sprint 52 story 3
--agent 2 sprint 52 story 3
--agent 3 sprint 52 story 3
```

---

## Sprint 53 — Layer archaeology

```text
--agent -1 sprint 53 story 1
--agent 0 sprint 53 story 1
--agent 1 sprint 53 story 1
--agent 2 sprint 53 story 1
--agent 3 sprint 53 story 1

--agent -1 sprint 53 story 2
--agent 0 sprint 53 story 2
--agent 1 sprint 53 story 2
--agent 2 sprint 53 story 2
--agent 3 sprint 53 story 2

--agent -1 sprint 53 story 3
--agent 0 sprint 53 story 3
--agent 1 sprint 53 story 3
--agent 2 sprint 53 story 3
--agent 3 sprint 53 story 3
```

---

## Sprint 54 — Typed errors hygiene

```text
--agent -1 sprint 54 story 1
--agent 0 sprint 54 story 1
--agent 1 sprint 54 story 1
--agent 2 sprint 54 story 1
--agent 3 sprint 54 story 1

--agent -1 sprint 54 story 2
--agent 0 sprint 54 story 2
--agent 1 sprint 54 story 2
--agent 2 sprint 54 story 2
--agent 2.5 sprint 54 story 2
--agent 3 sprint 54 story 2
--agent 5 sprint 54 story 2

--agent -1 sprint 54 story 3
--agent 0 sprint 54 story 3
--agent 1 sprint 54 story 3
--agent 2 sprint 54 story 3
--agent 3 sprint 54 story 3
```

---

## Sprint 55 — Notification templates

```text
--agent -1 sprint 55 story 1
--agent 0 sprint 55 story 1
--agent 1 sprint 55 story 1
--agent 2 sprint 55 story 1
--agent 3 sprint 55 story 1

--agent -1 sprint 55 story 2
--agent 0 sprint 55 story 2
--agent 1 sprint 55 story 2
--agent 2 sprint 55 story 2
--agent 2.5 sprint 55 story 2
--agent 3 sprint 55 story 2
--agent 5 sprint 55 story 2

--agent -1 sprint 55 story 3
--agent 0 sprint 55 story 3
--agent 1 sprint 55 story 3
--agent 2 sprint 55 story 3
--agent 3 sprint 55 story 3
```

---

## Sprint 56 — UI Round 2

```text
--agent -1 sprint 56 story 1
--agent 0 sprint 56 story 1
--agent 1 sprint 56 story 1
--agent 2 sprint 56 story 1
--agent 3.5 sprint 56 story 1
--agent 3 sprint 56 story 1
--agent 5 sprint 56 story 1

--agent -1 sprint 56 story 2
--agent 0 sprint 56 story 2
--agent 1 sprint 56 story 2
--agent 2 sprint 56 story 2
--agent 3.5 sprint 56 story 2
--agent 3 sprint 56 story 2
--agent 5 sprint 56 story 2

--agent -1 sprint 56 story 3
--agent 0 sprint 56 story 3
--agent 1 sprint 56 story 3
--agent 2 sprint 56 story 3
--agent 2.5 sprint 56 story 3
--agent 3.5 sprint 56 story 3
--agent 3 sprint 56 story 3
--agent 5 sprint 56 story 3

--agent -1 sprint 56 story 4
--agent 0 sprint 56 story 4
--agent 1 sprint 56 story 4
--agent 2 sprint 56 story 4
--agent 3.5 sprint 56 story 4
--agent 3 sprint 56 story 4
--agent 5 sprint 56 story 4
```
