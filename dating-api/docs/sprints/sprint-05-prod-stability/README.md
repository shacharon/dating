# Sprint 5: Production Stability

**Epic:** Platform hardening (post–Sprint 4 realtime)  
**Duration:** ~1 week (4 stories)  
**Goal:** Close the Sprint 4 prod gate, add error observability, and remove known foot-guns in the match engine before wider rollout.  
**Status:** **In progress** — 1/4 stories done  
**Depends on:** [Sprint 4: Real-time Messaging](../sprint-04-realtime-messaging/README.md) (complete)

---

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [WS prod smoke + flag flip](./STORY_01_ws_prod_smoke_flag_flip.md) | Done (Tier B pending operator) | Sprint 4 |
| 2 | [Sentry + structured error logging](./STORY_02_sentry_structured_logging.md) | Not started | — |
| 3 | [Remove LOW_INFO_PROFILE_IDS hardcode](./STORY_03_remove_low_info_profile_ids.md) | Not started | — |
| 4 | [Consolidate overallScore → finalScore](./STORY_04_consolidate_final_score.md) | Not started | — |

**Recommended order:** 1 → 2 → 3 → 4 (Story 1 unblocks prod; 3–4 are independent engine cleanup)

---

## Decisions (locked for this sprint)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| WS rollout | **`NEXT_PUBLIC_REALTIME=ws`** in prod after Story 1 smoke passes | Sprint 4 shipped behind flag; this sprint closes the gate |
| Error tracking | **Sentry** (API + UI) | No observability stack exists today; Sentry is standard for NestJS + Next.js |
| LOW_INFO cap | **Replace hardcoded profile id with coverage-based rule** | Profile `19` hack is not maintainable; use existing `coverage` / `scoreCoverageFactor` |
| Score field | **`finalScore` is canonical** | `overallScore` on match results becomes alias or removed; compatibility sub-scores keep their own `overallScore` where semantically correct |

---

## Agent workflow (per story)

Orchestrator: `.cursor/skills/dating-agent-run/SKILL.md`

Run **one agent at a time**:

```text
--agent 0 sprint 5 story 1   → dating-architect
--agent 1 sprint 5 story 1   → dating-senior-dev
--agent 2 sprint 5 story 1   → dating-code-review
--agent 3 sprint 5 story 1   → dating-pm-contractor
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
| Prod WS verified | Tier A shipped; Tier B operator smoke pending | flag flip pending operator | Story 1 |
| Error observability | Sentry + existing structured logs | Sentry client | Story 2 |
| Low-info cap | coverage-based, no profile id set | — | Story 3 |
| Score naming | `finalScore` everywhere in product path | match cards use `finalScore` | Story 4 |

---

## Manual smoke (end user)

1. Prod/staging: two accounts, same conversation → message near-instant with `NEXT_PUBLIC_REALTIME=ws`  
2. Rollback: flip to `poll` → Sprint 3 polling returns without API deploy  
3. Trigger a WS auth failure → appears in Sentry / structured logs (Story 2)  
4. Rebuild matches for a low-coverage profile → score capped by coverage rule, not profile id (Story 3)  
5. Match list/detail shows `finalScore` consistently (Story 4)

---

## Operator docs

- [PROD_STABILITY.md](./PROD_STABILITY.md) — prod gate + Sentry env vars (Story 1–2)

---

## Open risks

1. **Prod cookie/proxy** — same Sprint 4 risk; Story 1 must verify browser 101 in target environment.  
2. **Sentry DSN secrets** — must not be committed; env-only.  
3. **overallScore removal** — many test fixtures reference compatibility sub-score `overallScore`; Story 4 must not break `computeCompatibility()` return type.
