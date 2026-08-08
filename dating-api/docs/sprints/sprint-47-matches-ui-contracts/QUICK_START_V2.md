# Sprint 47 Quick Start — V2 Pipeline

**Use this for Sprint 47 ONLY. This is the first sprint using V2 pipeline.**

## Story 1 — UI match view-models

**Recommended (autorun):**
```text
--autorun sprint 47 story 1
```

**Or manual:**
```text
--agent -1 sprint 47 story 1
--agent 0 sprint 47 story 1
--agent 1 sprint 47 story 1
--agent 2 sprint 47 story 1
--agent 3.5 sprint 47 story 1
--agent 3 sprint 47 story 1
```

**After deploy (1-3 days later):**
```text
--agent 5 sprint 47 story 1
```

---

## Story 2 — Matches React Query

```text
--autorun sprint 47 story 2
```

**After deploy:**
```text
--agent 5 sprint 47 story 2
```

---

## Story 3 — Chip-evidence enum

```text
--autorun sprint 47 story 3
```

**After deploy:**
```text
--agent 5 sprint 47 story 3
```

---

## What's new in V2?

- **Agent -1**: Checks dependencies before starting (catches Sprint 45/38.3/46 issues early)
- **Agent 3.5**: UI/UX review (accessibility, mobile, design system)
- **Agent 5**: Post-deploy verification (error rate, latency, user feedback)

Full docs: `dating-api/docs/sprints/AGENT_PIPELINE_V2.md`
