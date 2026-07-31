# Sprint 27 — Agent commands (4 agents × 5 stories)

**Purpose:** Paste into Cursor chat **one at a time**, in order.  
**Pattern:** Agent 0 → 1 → 2 → 3 per story (same as Sprints 22–24 / Sprint 20 sheet).  
**Agent 4:** skip unless Architect requires live match-list HTTP/e2e harness.

**Story folder:** `dating-api/docs/sprints/sprint-27-match-list-performance/`  
**Handoffs:** `handoffs/STORY_0X_*/agent-N-*.md`

> Run **after** Sprint 20’s 20 agent cmds (or after you decide Sprint 20 retro is enough).  
> Stories 1–4 touch the same match-list code — **do not parallelize** stories.

---

## How to use

1. Finish current story’s Agent 3 before starting the next story’s Agent 0.
2. Order: **1 → 2 → 3 → 4 → 5** (Story 1 first; 4 after 2; 5 last or after 1).

---

## Story 1 — Batch latest evaluations

Story: `STORY_01_batch_latest_evaluations.md`

```text
--agent 0 sprint 27 story 1
```

```text
--agent 1 sprint 27 story 1
```

```text
--agent 2 sprint 27 story 1
```

```text
--agent 3 sprint 27 story 1
```

**Expanded (if needed):**

```
Execute Sprint 27 Story 1 — Agent 0 Architect.
Read STORY_01_batch_latest_evaluations.md. Lock DISTINCT ON / chunk size / return Map shape / no sequential await. Write handoffs/STORY_01_batch_latest_evaluations/agent-0-architect.md. Skip Agent 4.
```

```
Execute Sprint 27 Story 1 — Agent 1 Dev.
Follow architect lock. Implement latestEvaluationsForProfileIds batch fetch + specs. Commit. Write agent-1-dev.md.
```

```
Execute Sprint 27 Story 1 — Agent 2 CR.
Review vs lock (no N+1 loop, Prisma.sql safety, semantics). Write agent-2-cr.md.
```

```
Execute Sprint 27 Story 1 — Agent 3 PM.
Accept/reject. Update story + README status. Write agent-3-pm.md.
```

---

## Story 2 — SQL gender/age prefilter

Story: `STORY_02_sql_gender_age_prefilter.md`

```text
--agent 0 sprint 27 story 2
```

```text
--agent 1 sprint 27 story 2
```

```text
--agent 2 sprint 27 story 2
```

```text
--agent 3 sprint 27 story 2
```

**Expanded:**

```
Execute Sprint 27 Story 2 — Agent 0 Architect.
Read STORY_02. Lock which gender/age prefs go in SQL vs stay in-memory; empty-prefs behavior. Write handoffs/STORY_02_sql_gender_age_prefilter/agent-0-architect.md.
```

```
Execute Sprint 27 Story 2 — Agent 1 Dev.
Follow lock. Implement WHERE prefilter + tests. Commit. Write agent-1-dev.md.
```

```
Execute Sprint 27 Story 2 — Agent 2 CR.
Review vs lock / index usage / no over-filter. Write agent-2-cr.md.
```

```
Execute Sprint 27 Story 2 — Agent 3 PM.
Accept/reject. Write agent-3-pm.md.
```

---

## Story 3 — Slim candidate select

Story: `STORY_03_slim_candidate_select.md`

```text
--agent 0 sprint 27 story 3
```

```text
--agent 1 sprint 27 story 3
```

```text
--agent 2 sprint 27 story 3
```

```text
--agent 3 sprint 27 story 3
```

**Expanded:**

```
Execute Sprint 27 Story 3 — Agent 0 Architect.
Read STORY_03. Lock list vs detail select fields; where about* still loads. Write handoffs/STORY_03_slim_candidate_select/agent-0-architect.md.
```

```
Execute Sprint 27 Story 3 — Agent 1 Dev.
Follow lock. Split slim/full select; wire list rebuild. Commit. Write agent-1-dev.md.
```

```
Execute Sprint 27 Story 3 — Agent 2 CR.
Review list still scores correctly; detail/hard-block text intact. Write agent-2-cr.md.
```

```
Execute Sprint 27 Story 3 — Agent 3 PM.
Accept/reject. Write agent-3-pm.md.
```

---

## Story 4 — Cap candidate pool

Story: `STORY_04_cap_candidate_pool.md`

```text
--agent 0 sprint 27 story 4
```

```text
--agent 1 sprint 27 story 4
```

```text
--agent 2 sprint 27 story 4
```

```text
--agent 3 sprint 27 story 4
```

**Expanded:**

```
Execute Sprint 27 Story 4 — Agent 0 Architect.
Read STORY_04. Lock MATCH_LIST_CANDIDATE_CAP default 1000, orderBy analyzedAt, client-visible totals semantics. Write handoffs/STORY_04_cap_candidate_pool/agent-0-architect.md.
```

```
Execute Sprint 27 Story 4 — Agent 1 Dev.
Follow lock. Cap + env + tests + .env.example. Commit. Write agent-1-dev.md.
```

```
Execute Sprint 27 Story 4 — Agent 2 CR.
Review cap after prefilter; no silent API lies. Write agent-2-cr.md.
```

```
Execute Sprint 27 Story 4 — Agent 3 PM.
Accept/reject. Write agent-3-pm.md.
```

---

## Story 5 — Miss-path observability

Story: `STORY_05_miss_path_observability.md`

```text
--agent 0 sprint 27 story 5
```

```text
--agent 1 sprint 27 story 5
```

```text
--agent 2 sprint 27 story 5
```

```text
--agent 3 sprint 27 story 5
```

**Expanded:**

```
Execute Sprint 27 Story 5 — Agent 0 Architect.
Read STORY_05. Lock metric names, miss-only emit, no high-cardinality labels. Write handoffs/STORY_05_miss_path_observability/agent-0-architect.md.
```

```
Execute Sprint 27 Story 5 — Agent 1 Dev.
Follow lock. Instrument buildFullRankedList miss path. Commit. Write agent-1-dev.md.
```

```
Execute Sprint 27 Story 5 — Agent 2 CR.
Review metrics fail-open + hit path quiet. Write agent-2-cr.md.
```

```
Execute Sprint 27 Story 5 — Agent 3 PM.
Accept/reject. Mark sprint Done if all stories green. Write agent-3-pm.md.
```

---

## Full paste order (20 cmds)

```text
--agent 0 sprint 27 story 1
--agent 1 sprint 27 story 1
--agent 2 sprint 27 story 1
--agent 3 sprint 27 story 1

--agent 0 sprint 27 story 2
--agent 1 sprint 27 story 2
--agent 2 sprint 27 story 2
--agent 3 sprint 27 story 2

--agent 0 sprint 27 story 3
--agent 1 sprint 27 story 3
--agent 2 sprint 27 story 3
--agent 3 sprint 27 story 3

--agent 0 sprint 27 story 4
--agent 1 sprint 27 story 4
--agent 2 sprint 27 story 4
--agent 3 sprint 27 story 4

--agent 0 sprint 27 story 5
--agent 1 sprint 27 story 5
--agent 2 sprint 27 story 5
--agent 3 sprint 27 story 5
```
