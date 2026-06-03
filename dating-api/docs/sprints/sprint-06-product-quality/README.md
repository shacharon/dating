# Sprint 6: Product Quality (Match Engine + Retention)

**Epic:** Match quality & user retention  
**Duration:** ~1.5 weeks (4 stories)  
**Goal:** Fix known engine logic bugs, improve values weighting, replace fragile heuristics with LLM extraction, and ship minimum viable push notifications.  
**Status:** **In progress** — 1/4 stories done  
**Depends on:** [Sprint 5: Production Stability](../sprint-05-prod-stability/README.md) (recommended, not blocking)

---

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [Email push notifications](./STORY_01_email_push_notifications.md) | **Done** (Resend smoke pending operator) | Sprint 4 (WS) |
| 2 | [Fix EMOTIONAL_DEPTH_FLOOR logic](./STORY_02_fix_emotional_depth_floor.md) | Not started | — |
| 3 | [LLM-derived context fields](./STORY_03_llm_derived_context.md) | Not started | — |
| 4 | [Raise valuesAlignment weight](./STORY_04_raise_values_alignment_weight.md) | Not started | Story 2 (optional) |

**Recommended order:** 2 → 4 → 3 → 1 (engine fixes first; notifications last — needs stable prod)

---

## Decisions (locked for this sprint)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Push channel (v1) | **Email only** | No mobile app; email is lowest-friction for mutual match + new message alerts |
| EMOTIONAL_DEPTH_FLOOR | **Remove or invert** — low depth on both sides is not a dealbreaker | Two reserved people can be compatible; current logic suppresses valid matches |
| deriveContext | **LLM extracts `occupationClass`, `visibilityNeed`, `lifeStage`** into evaluation JSON | Keyword regex in `deriveContextFromProfileTexts` is fragile |
| valuesAlignment weight | **Raise from 5% → 15%** in `engine/scoring.ts` `compatibility()` | Tier 1 values signals are under-weighted; rebalance: 0.30·aToB + 0.30·bToA + 0.25·relFit + 0.15·valAlign |

---

## Agent workflow (per story)

Orchestrator: `.cursor/skills/dating-agent-run/SKILL.md`

Run **one agent at a time**:

```text
--agent 0 sprint 6 story 1   → dating-architect
--agent 1 sprint 6 story 1   → dating-senior-dev
--agent 2 sprint 6 story 1   → dating-code-review
--agent 3 sprint 6 story 1   → dating-pm-contractor
```

Handoffs: `handoffs/<story-slug>/agent-*.md`

| Agent | Role |
|-------|------|
| 0 | Architect |
| 1 | Senior dev |
| 2 | Code review |
| 3 | PM / close |

---

## Sprint outcome (target)

| Feature | API | UI | Notes |
|---------|-----|-----|-------|
| Email on mutual match | send after `MutualMatch` create | — | Story 1 |
| Email on new message (offline) | debounced send if recipient has no active WS | — | Story 1 |
| EMOTIONAL_DEPTH_FLOOR removed/fixed | dealbreakers.ts | — | Story 2 |
| LLM context fields | extraction prompt + evaluationJson schema | — | Story 3 |
| Values weight 15% | scoring.ts + match-engine tests updated | explain copy if shown | Story 4 |

**Deferred:** SMS, mobile push, in-app notification center, digest emails.

---

## Manual smoke (end user)

1. Two users like each other → both receive mutual-match email (Story 1)  
2. User B offline → User A sends message → User B receives email within debounce window (Story 1)  
3. Rebuild match where both have `emotionalDepth ≤ 3` → no `EMOTIONAL_DEPTH_FLOOR` flag (Story 2)  
4. Profile with shift-work keywords → `occupationClass` from LLM, not regex alone (Story 3)  
5. High spirituality gap vs high lifestyle gap → values gap affects score more than before (Story 4)

---

## Open risks

1. **Email deliverability** — need provider (Resend/SendGrid/SES); DNS/SPF not in repo scope.  
2. **LLM extraction drift** — new fields need schema validation (zod) and fallback to defaults.  
3. **Score rebalance** — existing match rankings may shift; document in release notes.
