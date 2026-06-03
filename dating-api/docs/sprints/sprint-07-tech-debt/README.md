# Sprint 7: Tech Debt & Platform Scale

**Epic:** Legacy retirement & platform instrumentation  
**Duration:** ~1.5 weeks (4 stories)  
**Goal:** Remove frozen legacy code paths, finish preference migration cleanup, scale WS rate limiting across replicas, and add product funnel analytics.  
**Status:** **In progress** — 1/4 stories done  
**Depends on:** [Sprint 5](../sprint-05-prod-stability/README.md) (Sentry helps Story 4); [Sprint 6](../sprint-06-product-quality/README.md) (optional)

---

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [Delete frozen legacy paths](./STORY_01_delete_frozen_legacy_paths.md) | **Done** (product smoke pending operator) | — |
| 2 | [Legacy retirement cleanup](./STORY_02_legacy_retirement_cleanup.md) | Not started | Story 1 |
| 3 | [Redis-backed WS rate limit](./STORY_03_redis_ws_rate_limit.md) | Not started | Sprint 4 Story 6 |
| 4 | [Product funnel analytics](./STORY_04_product_funnel_analytics.md) | Not started | Sprint 5 Story 2 (Sentry) |

**Recommended order:** 1 → 2 → 3 → 4

---

## Decisions (locked for this sprint)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Legacy deletion | **Remove frozen controllers/services** after grep confirms no imports | `profiles-analyze.controller`, frozen extraction paths — dead code |
| Deprecated scripts | **Delete or move to `scripts/archive/`** | `validate:*` scripts that `exit(1)` add noise |
| WS rate limit | **Redis sliding window when `REDIS_URL` set**; in-memory fallback when unset | Matches Redis adapter pattern from Sprint 4 |
| Analytics (v1) | **Structured product events → logs + optional PostHog/Mixpanel** | Funnel: profile_submit → match_shown → action → mutual → first_message |

---

## Agent workflow (per story)

Orchestrator: `.cursor/skills/dating-agent-run/SKILL.md`

Run **one agent at a time**:

```text
--agent 0 sprint 7 story 1   → dating-architect
--agent 1 sprint 7 story 1   → dating-senior-dev
--agent 2 sprint 7 story 1   → dating-code-review
--agent 3 sprint 7 story 1   → dating-pm-contractor
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
| Legacy paths removed | fewer modules in `profiles/`, `legacy/` | POC routes audited | Story 1 |
| Clean package.json scripts | no exit(1) deprecated stubs | — | Story 2 |
| Shared WS rate limit | Redis when scaled | — | Story 3 |
| Funnel events | emit on key transitions | page-view hooks optional | Story 4 |

---

## Manual smoke

1. `npm run build` + full test suite pass after legacy deletion (Story 1–2)  
2. Two API replicas + `REDIS_URL` → flood WS events on instance A, limit enforced globally (Story 3)  
3. Like → mutual match → message → events appear in analytics dashboard or structured logs (Story 4)

---

## Open risks

1. **Legacy deletion** — grep + integration tests must catch hidden imports from POC scripts.  
2. **Analytics PII** — never send message body or profile text to third-party analytics.  
3. **Redis dependency** — rate limit Redis failure should fail open or closed? Architect decides in Story 3.
