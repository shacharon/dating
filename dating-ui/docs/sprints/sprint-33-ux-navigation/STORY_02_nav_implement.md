# Story 33.2 — Implement Global Navigation Shell

**Sprint:** 33 — UX Navigation  
**Story:** 2 — Implement Global Navigation  
**Agent 0:** Architect  
**Date:** 2026-08-01  
**Status:** **Done** — ABSORBED (Agent 3 ACCEPT)  

---

## Decision (locked)

**Do not re-implement.** Story 33.2 scope was fully delivered under **Story 33.1 Agent 1** (`815268a`).

Original plan split:

| Story | Intent |
|-------|--------|
| 33.1 | Design / mock |
| 33.2 | Implement |

Actual waterfall ran **design + implement + CR + PM all under Story 1** (agents 0→3). Re-running implement would duplicate work and risk regressions.

---

## Story 2 AC vs shipped (Story 1)

| Acceptance criterion (AGENT_COMMANDS Story 2) | Status |
|-----------------------------------------------|--------|
| Nav on authenticated pages (`AuthenticatedAppShell`) | **Met** |
| Active page highlighted | **Met** (`nav-active.ts`) |
| Conversations unread badge | **Met** (`useConversationUnread`) |
| New match badge slot | **Met** (prop `newMatchCount`, default 0; API later) |
| Responsive md / bottom tabs | **Met** |
| Keyboard + focus rings | **Met** |
| ARIA labels | **Met** (`mainAria` / `primaryAria`) |
| Dark mode | **Met** |
| Badge min-width (no layout jump) | **Met** |
| Browser back/forward | **Met** (pathname-driven) |

### Planned vs actual file names

| Planned | Shipped | Note |
|---------|---------|------|
| `nav-link.tsx` | `nav-item.tsx` | Same role |
| `nav-context.tsx` | reuse `ConversationUnreadContext` | Prefer existing; no new context |
| `/dating/layout.tsx` change | shell already wraps dating + authenticated | No layout rewrite needed |

---

## Out of scope (still deferred)

- Real `newMatchCount` API wiring
- Removing `/dating` hub (Story 33.4)
- Unified Profile / Analysis tab (Sprint 35)

---

## Agent pipeline for Story 2

| Agent | Action |
|-------|--------|
| **0** | This lock — ABSORBED |
| **1** | Verify only — no feature code unless gap found |
| **2** | CR confirm ABSORBED / PASS |
| **3** | PM ACCEPT docs; no product commit required (or docs-only) |

**Next product story after Story 2 agents finish:**

```
--agent 0 sprint 33 story 3
```

(Preserve scroll position in match list.)
