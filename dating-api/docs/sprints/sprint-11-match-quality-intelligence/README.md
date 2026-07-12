# Sprint 11: Match quality intelligence & engine approval

**Epic:** Turn Sprint 10 match feedback into product decisions — measure suggestion quality, review the engine, approve changes safely  
**Duration:** ~2 weeks (7 stories)  
**Goal:** Harden admin access, then turn match feedback into weekly quality review and engine approval — with data, not gut feel.  
**Status:** **Complete** (7/7 engineering gate — operator smokes pending)  
**Depends on:** [Sprint 10 Story 4](../sprint-10-trust-and-ops/STORY_04_match_feedback.md) (`MatchFeedback` rows + `match.feedback` analytics), [Sprint 10 Story 3](../sprint-10-trust-and-ops/STORY_03_admin_report_queue.md) (admin auth pattern)

---

## Why this sprint

Sprint 10 shipped **collection** (thumbs on match detail, DB + analytics). It explicitly did **not** change ranking.

Without Sprint 11, feedback is dead data unless someone runs ad-hoc SQL. Product needs:

- **Adoption & positive rate** — is the signal usable?
- **Drill-down** — which suggestions feel wrong, and why (engine explainability)?
- **Approval workflow** — when can we change the matcher without guessing?
- **Validation** — before/after metrics when engine weights or rules change

This sprint closes the loop: **collect → analyze → approve → validate**.

---

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 0 | [Admin security hardening](./STORY_00_admin_security_hardening.md) | **Done** (operator prod smoke + infra checklist pending) | Sprint 10 admin |
| 1 | [Feedback KPI runbook](./STORY_01_feedback_kpi_runbook.md) | **Done** (operator staging smoke pending) | Sprint 10 Story 4 |
| 2 | [Admin feedback aggregates API](./STORY_02_admin_feedback_aggregates_api.md) | **Done** (operator staging smoke pending) | Stories 0 + 1 |
| 3 | [Admin match quality dashboard](./STORY_03_admin_match_quality_dashboard.md) | **Done** (operator staging smoke pending) | Story 2 |
| 4 | [Feedback → audit drill-down](./STORY_04_feedback_audit_drilldown.md) | **Done** (operator staging smoke pending) | Story 2; existing `match-quality-audit.ts` |
| 5 | [Engine review & approval workflow](./STORY_05_engine_review_approval_workflow.md) | **Done** (operator curl smoke pending) | Stories 1–4 |
| 6 | [Engine change validation](./STORY_06_engine_change_validation.md) | **Done** (operator compare smoke pending) | Story 5 |

**Recommended order:** **0** → 1 → 2 → 3 → 4 → 5 → 6 (Story 1 can parallel Story 0; do not enable new admin on **public prod** until Story 0; do not change ranking without 5–6).

---

## Decisions (locked for this sprint)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Ranking changes | **Still out of scope** until Story 5 sign-off | This sprint is measure + approve, not auto-tune |
| Admin on public prod | **404 by default** until `NEXT_PUBLIC_ADMIN_ENABLED=1` + network gate | [Story 0](./STORY_00_admin_security_hardening.md) |
| Admin auth | **`ADMIN_USER_IDS`** + session (not sufficient alone on WWW) | Same as Sprint 10; hardened by Story 0 |
| PII in admin views | **Ids + aggregates only** | No profile text, photos, or email in list APIs |
| Primary KPIs | **Adoption %**, **positive rate %**, **negative volume** | Defined in Story 1 |
| Engine audit source | **Reuse `MeMatchesService` / `match-quality-audit.ts`** | No alternate scoring path |
| Approval artifact | **Markdown sign-off + optional JSON export** | Lawyer/RBAC not required for internal ops |

### Engine change policy (Story 5)

1. **No deploy** — matcher/scoring changes require completed [ENGINE_CHANGE_APPROVAL.md](../../engine/ENGINE_CHANGE_APPROVAL.md) with PM + engineering sign-off.
2. **Baseline** — export `GET /api/v1/admin/match-quality/export` + adoption % from logs (runbook CloudWatch §).
3. **Drill-down** — top negatives audited via Story 4 UI before proposing changes.
4. **Post-validation** — Story 6 compare API fills approval §6 after any deploy.
5. **Example** — [docs/engine/examples/2026-06-10-no-op-week.md](../../engine/examples/2026-06-10-no-op-week.md).

---

## Product KPIs (this sprint)

Formulas, SQL, CloudWatch, and weekly ritual: **[MATCH_QUALITY_RUNBOOK.md](../../analytics/MATCH_QUALITY_RUNBOOK.md)** (§ Baseline targets).

| Metric | Target (week 1 — tune after baseline) |
|--------|---------------------------------------|
| Feedback adoption % | ≥ 15% |
| Positive rate % | ≥ 60% |
| Actionable negatives | Review top 10 weekly (≥ 3 distinct reporters) |
| Engine change gate | 100% — Story 5 sign-off before matcher deploy |

Events: [PRODUCT_FUNNEL.md](../../analytics/PRODUCT_FUNNEL.md). Admin API metrics in Stories 2–3 align with runbook definitions.

---

## Agent workflow (per story)

Orchestrator: `.cursor/skills/dating-agent-run/SKILL.md`

```text
--agent 0 sprint 11 story 1   → dating-architect
--agent 1 sprint 11 story 1   → dating-senior-dev
--agent 2 sprint 11 story 1   → dating-code-review
--agent 3 sprint 11 story 1   → dating-pm-contractor
```

Handoffs: `handoffs/<story-slug>/agent-*.md`

---

## Sprint outcome (shipped)

| Capability | Deliverable |
|------------|-------------|
| PM weekly ritual | [MATCH_QUALITY_RUNBOOK.md](../../analytics/MATCH_QUALITY_RUNBOOK.md) + SQL/Insights queries |
| Admin visibility | `/admin/match-quality` — positive rate, top negatives (adoption % via logs until later) |
| Root-cause drill-down | `/admin/match-quality` → **View audit** → score, chips, guards (CLI fallback) |
| Engine approval | Checklist + sign-off template before matcher changes |
| Post-change validation | `GET .../compare` + `npm run match-quality:compare` — before/after deltas |

**Deferred to Sprint 12+:** Feedback in live ranking, A/B framework, free-text “why not helpful?”, auto down-rank, PostHog dashboards.

---

## Manual smoke (sprint-level)

1. Submit thumbs up/down on staging → row in `MatchFeedback` + `match.feedback` log.
2. Admin opens `/admin/match-quality` → sees positive rate + negatives (non-zero after smoke); adoption from logs.
3. Click a high-negative candidate → audit panel shows `matchScore`, chips, guards.
4. Complete engine review checklist doc for a no-op week → all sections filled.
5. `GET .../compare?beforeDays=7&afterDays=7` (or `npm run match-quality:compare`) → paste `deltas` into approval §6.

---

## Pre-sprint checklist

- [ ] Sprint 10 operator smokes complete (or waived) — especially Story 4 feedback
- [ ] `npx prisma migrate deploy` includes `20260606240000_match_feedback`
- [ ] At least ~20 feedback rows in staging or prod (seed or real cohort) for dashboard smoke
- [ ] VPN / Cloudflare Access plan documented before prod `ADMIN_ENABLED=1`

---

## Agent commands (full sprint)

Run **one agent per message** in order. Handoffs: `handoffs/<story-slug>/agent-*.md`

### Story 0 — Admin security hardening

```text
--agent 0 sprint 11 story 0
--agent 1 sprint 11 story 0
--agent 2 sprint 11 story 0
--agent 3 sprint 11 story 0
```

### Story 1 — Feedback KPI runbook

```text
--agent 0 sprint 11 story 1
--agent 1 sprint 11 story 1
--agent 2 sprint 11 story 1
--agent 3 sprint 11 story 1
```

### Story 2 — Admin feedback aggregates API

```text
--agent 0 sprint 11 story 2
--agent 1 sprint 11 story 2
--agent 2 sprint 11 story 2
--agent 3 sprint 11 story 2
```

### Story 3 — Admin match quality dashboard

```text
--agent 0 sprint 11 story 3
--agent 1 sprint 11 story 3
--agent 2 sprint 11 story 3
--agent 3 sprint 11 story 3
```

### Story 4 — Feedback → audit drill-down

```text
--agent 0 sprint 11 story 4
--agent 1 sprint 11 story 4
--agent 2 sprint 11 story 4
--agent 3 sprint 11 story 4
```

### Story 5 — Engine review & approval workflow

```text
--agent 0 sprint 11 story 5
--agent 1 sprint 11 story 5
--agent 2 sprint 11 story 5
--agent 3 sprint 11 story 5
```

### Story 6 — Engine change validation

```text
--agent 0 sprint 11 story 6
--agent 1 sprint 11 story 6
--agent 2 sprint 11 story 6
--agent 3 sprint 11 story 6
```

**Start here:** `--agent 0 sprint 11 story 0`
