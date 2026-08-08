# Sprint 47 — Agent commands (V2 Pipeline)

**Purpose:** Paste into Cursor chat **one at a time**, in order.  
**Pipeline:** V2 (-1 → 0 → 1 → 2 → 3.5 → 3 → [deploy] → 5)  
**Story folder:** `dating-api/docs/sprints/sprint-47-matches-ui-contracts/`  
**Handoffs:** `handoffs/STORY_0X_*/agent-N-*.md`  
**Repo:** `dating-ui` primary  
**Orchestrator:** `.cursor/skills/dating-agent-run/SKILL.md`  
**Pipeline docs:** `dating-api/docs/sprints/AGENT_PIPELINE_V2.md`

**Depends on:** Sprint 45 · 38.3 · (46 recommended).

---

## V2 Changes

**New agents for Sprint 47:**
- ✅ **Agent -1 (Pre-flight)**: Validates dependencies before starting
- ✅ **Agent 3.5 (UI/UX Review)**: All stories are frontend → accessibility, mobile, design system
- ✅ **Agent 5 (Post-deploy)**: Run 1-3 days after production deploy
- ❌ **Agent 4 (E2E)**: Skipped (no matching engine changes)
- ❌ **Agent 2.5 (Security)**: Skipped (no auth/PII changes)

**Autorun option:**
```text
--autorun sprint 47 story 1
```
Chains: -1 → 0 → 1 → 2 → 3.5 → 3 automatically (stops on failures).

---

## How to use

1. Finish current story's Agent 3 before next story's Agent -1.
2. Order: **1 → 2 → 3**.
3. After deploy to production, wait 1-3 days, then run Agent 5.

---

## Story 1 — UI match view-models

Story: `STORY_01_ui_match_view_models.md`

### Manual commands (one at a time):

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

**After deploy to production:**

```text
--agent 5 sprint 47 story 1
```

### Or use autorun (recommended):

```text
--autorun sprint 47 story 1
```

Then after deploy:

```text
--agent 5 sprint 47 story 1
```

---

## Story 2 — Matches React Query

Story: `STORY_02_matches_react_query.md`

### Manual commands:

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

### Or use autorun:

```text
--autorun sprint 47 story 2
```

---

## Story 3 — Chip-evidence enum

Story: `STORY_03_chip_evidence_enum.md`

### Manual commands:

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

### Or use autorun:

```text
--autorun sprint 47 story 3
```

---

## Quick reference

### Full pipeline for each story:

```
-1 (Pre-flight)    → Check dependencies, conflicts, readiness
 0 (Architect)     → Design view-models, API contracts, component structure
 1 (Senior Dev)    → Implement UI, browser smoke test
 2 (Code Review)   → Review, write tests, fix issues
 3.5 (UI/UX)       → Accessibility (WCAG 2.1 AA), mobile (320px-1024px), design system
 3 (PM)            → Verify DoD, mark Done
 
 [Deploy to production]
 
 5 (Post-deploy)   → Check errors, latency, user feedback (1-3 days after deploy)
```

### Feedback loops:

- If Agent 1 finds design unworkable: `--agent 0 sprint 47 story X --revision`
- If Agent 2 or 3.5 finds issues: They send back to Agent 1 (fix and rerun from Agent 2)
- If Agent -1 says "needs-clarification": Provide clarification, rerun Agent -1

---

## Notes for Sprint 47

**Agent 3.5 (UI/UX) focus areas:**
- View-models properly typed and used in components
- React Query loading/error/empty states
- Mobile responsiveness for match list
- Accessibility: keyboard nav, screen reader, focus indicators
- Design system: emerald/zinc palette, consistent spacing

**Agent 5 (Post-deploy) metrics to watch:**
- Matches page load time (should stay <1s)
- React Query cache hit rate
- Error rate on matches list endpoint
- User engagement with match list (scroll depth, clicks)

**Skip Agent 4**: No E2E needed (UI-only, no matching engine changes).

**Skip Agent 2.5**: No security review needed (no auth changes).
