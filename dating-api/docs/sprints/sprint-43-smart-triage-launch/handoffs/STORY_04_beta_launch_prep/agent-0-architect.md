# Handoff: Agent 0 — Architect — Sprint 43 Story 4

**Agent:** 0 architect  
**Story:** [STORY_04_beta_launch_prep.md](../../STORY_04_beta_launch_prep.md)  
**Sprint:** sprint-43-smart-triage-launch  
**Date:** 2026-08-05  
**Status:** complete  

**Mode:** Implementation lock. **No product code in Agent 0.** Both repos. **Skip Agent 4** (no eligibility / ranking / score formula).

---

## Summary

**Launch readiness gate for ~100 Tel Aviv beta users** — measure Smart Triage value, handle feedback, decide GREEN/YELLOW/RED at Week 4. Story drafts overshoot a 2-day ship (chart libs, support ticket DB, IssuesList). Lock **docs + thin admin metrics (Postgres) + mailto support**; reuse existing admin/analytics/opener plumbing.

---

## Baseline facts (verified)

| Surface | Today |
|---------|--------|
| Admin UI | `/admin` index + photos / reports / match-quality / content-violations |
| Admin API | `AuthGuard` + `AdminGuard` (`ADMIN_USER_IDS`); no DB `isAdmin` |
| Prod admin gate | `NEXT_PUBLIC_ADMIN_ENABLED=1` + network gate ([ADMIN_ACCESS.md](../../../ops/ADMIN_ACCESS.md)) |
| Beta metrics page | **Missing** |
| Product analytics | Structured logs `logKind: product_analytics` — **not** a DB table ([PRODUCT_FUNNEL.md](../../../analytics/PRODUCT_FUNNEL.md)) |
| Opener KPIs | `ConversationStarterCache` + `buildOpenerWeeklyReport` (service, no admin UI) |
| HIGH email volume | `HighPriorityMatchEmailLog` |
| Rank / priority | `MatchListRank.matchScore` (≥85 = HIGH) |
| Activity | `User.lastLoginAt` (Google login bump) |
| `/support` | **Missing** (Story 3 deferred) |
| Invite email template | **Missing** (referral `?ref=` links exist; no invite-only gate) |
| Kill / launch docs | Story sketches only — no `docs/beta/*` |
| Grafana / Metabase / PostHog | Out of story scope; absent |

---

## Decision 1 — Scope: launch ops pack, not a BI platform (locked)

| In scope | Out of scope |
|----------|--------------|
| `dating-api/docs/beta/` runbooks (decision, invite, schedule, smoke, metrics cookbook, user-list **template**) | Grafana / Metabase / Mixpanel / PostHog |
| Thin **admin** beta metrics page + `GET /api/v1/admin/beta-metrics` (Postgres numbers) | Chart libraries, FunnelChart, BarChart components |
| Public **`/support`** page → **mailto** ops (categories as copy) | `SupportTicket` Prisma model, Nest `/api/v1/support`, admin ticket queue |
| Invite email markdown (manual send via Gmail/Resend) | Automated bulk invite pipeline / invite-only auth |
| Kill criteria + Monday weekly ritual | Real-time Slack alerts / bots |
| Link from `/admin` index | Feedback voting system |
| Reuse opener report math where possible | Rebuilding funnel solely from log aggregation in Nest |
| | A/B infra; remounting Story 3 rejects |

**Effort budget:** ~2 days — **~60% docs/ops**, **~40% thin admin + support page**.

**Story risk note:** “non-coding” is aspirational; acceptance needs *some* clickable metrics + a support surface. Lock the **minimum** that satisfies DoD without inventing a support CRM.

---

## Decision 2 — Reject story sample invents (locked)

| Story draft | Verdict |
|-------------|---------|
| Full dashboard with FunnelChart / BarChart / IssuesList | **Reject charts & issues feed** — number cards + last-updated timestamp only |
| `BetaMetricsService` inventing D7 from `lastLoginAt` without small-n guardrails | **Allow D7** but show **cohort size**; treat % as advisory when `n < 20` |
| Support form → `POST /api/v1/support/submit` + DB | **Reject** — mailto / optional Google Form URL in env copy |
| Dashboard “password-protected” | **Reject new password** — existing session + `ADMIN_USER_IDS` + prod admin gate |
| Priority distribution hard-coded 20/40/40 | **Reject as targets** — show **observed** HIGH/GOOD/OTHER share from `MatchListRank` |
| Beta user emails committed to git | **Reject** — template columns only; live sheet stays outside repo |
| Discord as primary support (must) | **Optional** — default mailto; Discord link allowed in docs if PM sets one up |

---

## Decision 3 — Metrics definitions (locked)

All **primary** KPIs for the admin page come from **Postgres** (stable for Monday review). CloudWatch Insights remain **secondary** (volume / event mix) — extend [PRODUCT_FUNNEL.md](../../../analytics/PRODUCT_FUNNEL.md) cookbook, do not require CW for the page to load.

| KPI | Definition (v1) | Source | Story target (Week 4) |
|-----|-----------------|--------|------------------------|
| **Active users (7d)** | Distinct non-deleted users with `lastLoginAt ≥ now−7d` | `User` | Approach **100** invited / signed-up (recruitment); active is health |
| **Sign-ups (beta window)** | Users with `createdAt ≥ betaStart` (query param or fixed env/doc date) | `User` | Recruitment progress |
| **D7 retention** | Of users with `createdAt` in `[now−8d, now−7d)`, share with `lastLoginAt ≥ now−1d` | `User` | ≥40% **if cohort n≥20**; else report raw returned/cohort |
| **Opener usage rate** | `used / displayed` (null if displayed=0) | `ConversationStarterCache` (reuse report builder) | ≥30% |
| **Opener response rate** | `receivedReply / sent` (null if sent=0) | same | Compare vs non-opener messaging later; show rate |
| **HIGH browse share** | Among non-hardBlocked ranks with score≥0: share with score≥85 | `MatchListRank` | Observational (not a kill gate alone) |
| **HIGH email sends (7d)** | Count rows `sentAt ≥ now−7d` | `HighPriorityMatchEmailLog` | Health of Story 2 |
| **Browse→message (proxy)** | Distinct users with ≥1 `Message` among users with ≥1 `match.list` activity — **prefer** CW distinct `message.sent` / distinct `match.list_viewed` in cookbook; **admin page may omit** if join is ambiguous | Logs / optional | ≥30% aspirational — **do not block ship** if only in CW cookbook |

**Do not** treat browser `emitProductLog` (`algorithm_explainer_viewed`, `match_breakdown_expanded`) as Week 4 kill gates — console-only today.

**Bands for kill framework** (same spirit as story; apply only when denominator healthy):

| Band | D7 (n≥20) | Opener usage | Opener response (sent≥10) | Action |
|------|-----------|--------------|---------------------------|--------|
| GREEN | ≥40% | ≥30% | ≥ story baseline or improving | Scale toward 500 |
| YELLOW | 20–39% | 15–29% | flat / mixed feedback | Fix top complaint; +4 weeks |
| RED | <20% | <15% | collapsing + negative feedback | Pivot / shutdown plan |

Qualitative feedback (support mail, 1:1 chats) is a **required** input at Week 4 — metrics alone do not kill.

---

## Decision 4 — Admin metrics surface (locked)

```text
GET /api/v1/admin/beta-metrics
UI: dating-ui /admin/beta-metrics
```

- Guards: existing `AuthGuard` + `AdminGuard`; UI behind existing admin route gate.
- Response: JSON of the table above + `generatedAt` + optional `betaStart` echo.
- UI: zinc/emerald admin style (match `/admin` index) — **metric cards only**, English-only (admin is not localized).
- Link from `/admin` index.
- Unit-test pure helpers for rates / D7 / priority share with known fixtures (Agent 2 cares about accuracy).
- Reuse `buildOpenerWeeklyReport` / `OpenerTrackingService` read path if already queryable; do not duplicate rate math.

---

## Decision 5 — Support workflow (locked)

| Item | Lock |
|------|------|
| Channel | **Email** primary — `mailto:` to ops address |
| Env | Prefer new optional `SUPPORT_OPS_EMAIL`; if unset, fall back to `REPORT_OPS_EMAIL` or document a hard-coded founder inbox in the page copy via public env `NEXT_PUBLIC_SUPPORT_EMAIL` |
| UI | Public `dating-ui` `/support` — issue-type select (copy), description textarea, email field → builds `mailto:?subject&body` (no server POST) |
| SLA | Critical &lt;24h; non-critical &lt;3 days (docs) |
| Intake storage | Inbox / optional Google Form — **not** Postgres |
| Link from | Footer or profile/settings “Get help” if a natural spot exists; at minimum `/support` route + docs |

Reject Nest support API for v1.

---

## Decision 6 — Docs pack (locked)

Create under **`dating-api/docs/beta/`** (not only sprint sketches):

| Doc | Purpose |
|-----|---------|
| `README.md` | Index + Monday ritual |
| `BETA_DECISION_FRAMEWORK.md` | GREEN/YELLOW/RED + small-n rules |
| `INVITE_EMAIL_TEMPLATE.md` | Piza-branded invite; CTA to app origin + optional `?ref=` |
| `BETA_LAUNCH_WEEK_SCHEDULE.md` | Day −3 → Week 4 checklist |
| `PRE_LAUNCH_SMOKE_TEST.md` | Full flow + Story 1–3 surfaces |
| `BETA_METRICS_COOKBOOK.md` | SQL + CloudWatch snippets for KPIs |
| `BETA_USER_LIST_TEMPLATE.md` | Columns only — **no real PII in git** |

Agent 3 owns filling the external spreadsheet + executing smoke/recruitment — Agent 1 ships templates.

---

## Decision 7 — Beta parameters (locked)

| Item | Value |
|------|--------|
| Size | ~100 users, Tel Aviv focus |
| Product name in copy | **Piza** |
| Kill review | **Week 4** checkpoint (not earlier for kill; weekly monitor) |
| Metrics refresh | On page load (no background job); Monday manual review |
| User updates | Weekly email during beta (process in schedule doc; not automated) |
| Agent 4 | **Skip** |

---

## Acceptance mapping

| Criterion | How we meet it |
|-----------|----------------|
| Metrics dashboard shows key numbers | `/admin/beta-metrics` + admin API |
| Support intake exists | `/support` mailto flow |
| Invite email template | `docs/beta/INVITE_EMAIL_TEMPLATE.md` |
| 100-user target list | Template in docs; live sheet external (Agent 3) |
| Kill criteria documented | `BETA_DECISION_FRAMEWORK.md` |
| Launch week schedule | `BETA_LAUNCH_WEEK_SCHEDULE.md` |
| Pre-launch smoke checklist | `PRE_LAUNCH_SMOKE_TEST.md` |
| Admin-only dashboard | Existing admin guards |
| No Grafana / PostHog | Explicit reject |

---

## Agent 1 checklist

1. Add `docs/beta/*` pack (framework, invite, schedule, smoke, metrics cookbook, user-list template, index).  
2. Implement `GET /api/v1/admin/beta-metrics` + pure metric helpers + specs (Postgres definitions above).  
3. Implement `/admin/beta-metrics` UI (cards) + link on admin index.  
4. Implement public `/support` mailto page (+ i18n EN/ES/HE if product shell is localized; admin stays EN).  
5. Wire `NEXT_PUBLIC_SUPPORT_EMAIL` (or documented fallback).  
6. **No** SupportTicket migration, **no** chart deps, **no** Agent 4 / ranking changes, **no** PII user lists in git.  
7. Skip inventing browse→message on admin if ambiguous — put CW recipe in cookbook instead.

---

## Next

```text
--agent 1 sprint 43 story 4
```
