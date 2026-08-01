# Story 03 — Soft / dating policy layer

**Sprint 32 · Status: 🟡 IN PROGRESS — Agent 0 architect complete → run Agent 1**  
**Priority:** P1  
**Estimated effort:** 1 day  
**Dependencies:** Stories 01–02 preferred (ops can see soft actions); can start after 01  
**Handoffs:** [architect](./handoffs/STORY_03_soft_policy_layer/agent-0-architect.md) 

---

## Objective

Handle the **middle** between clean slang and OpenAI `flagged: true` — e.g. aggressive sexual spam that OpenAI often allows (`i want to fuck`).

Architect must **pick one** primary approach (or a thin combo):

| Option | Behavior |
|--------|----------|
| **A. Soft warn** | High category score but not flagged → 400 with softer copy / `action=warned`; optional no mute ladder |
| **B. Dating blocklist** | Small maintained phrase/pattern list (sexual solicit spam) → treat as blocked like flagged |
| **C. Score threshold** | If `sexual` (or chosen cats) score ≥ X → block even if `flagged=false` |
| **D. Defer** | Document “no soft tier”; ship only observability of near-miss scores |

Default recommendation for MVP: **B or C** for clear spam; avoid complex warn UX unless product wants it.

---

## Scope

1. Lock policy in Agent 0 (option + thresholds + whether soft counts toward mute ladder).
2. Implement in moderation path (message ± profile — lock surfaces).
3. Record violations with distinct `action` (`warned` vs `blocked`) if soft tier exists.
4. Admin list filters by `action`.
5. Tests for allow / soft / hard paths.

---

## Acceptance criteria

- [ ] Architect decision written and implemented
- [ ] At least one “middle” case that previously sent now warn/blocked **or** explicit Defer with near-miss logging
- [ ] Mute ladder rules for soft actions documented
- [ ] Tests cover the locked policy

---

## Out of scope

- Full LLM rephrase suggestions
- Per-user custom sensitivity
