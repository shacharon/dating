# Story 3: Admin match quality dashboard

**Sprint:** 11  
**Status:** **Done** (engineering gate; operator staging smoke pending)  
**Depends on:** [Story 2](./STORY_02_admin_feedback_aggregates_api.md)

**Operator:** see `handoffs/STORY_03_admin_match_quality_dashboard/agent-3-pm.md`.

---

## Why

API aggregates (Story 2) need a **product surface** so PM/ops run the weekly ritual in the browser, not curl.

---

## What

**As a** product owner  
**I want** an admin page for match feedback health  
**So that** I can review quality at a glance each week

### Acceptance criteria

- [x] **Route** — `/admin/match-quality` (admin session required; prod gate same as `/admin/reports`)
- [x] **Summary cards** — window selector (7 / 30 days): total feedback, positive rate %, distinct reporters
- [x] **Table** — top negative candidates (`matchProfileId`, count, last negative) with link to drill-down (Story 4)
- [x] **Navigation** — `/admin` index links: Photos, Reports, **Match quality**
- [x] **Empty state** — “No feedback yet” + link to runbook
- [x] **i18n** — en only OK for admin v1
- [x] **Tests** — page renders summary from mocked API; non-admin redirected

### Out of scope (this story)

- Charts / time series (table + cards sufficient for v1)
- Public or user-facing quality scores
- Editing or deleting feedback rows

---

## Definition of done

- [x] PM can complete weekly ritual steps 1–2 using only `/admin/match-quality` (Postgres metrics; adoption still logs)
- [x] UI tests + manual smoke on staging (tests done; operator smoke pending)

---

## Manual smoke

1. Log in as admin → open `/admin/match-quality`.
2. Cards match API summary for 7-day window.
3. Click candidate row → navigates to drill-down (Story 4).

---

## Shipped (2026-06-10)

| Area | Deliverable |
|------|-------------|
| UI | `/admin/match-quality` — window 7/30d, summary cards, negative table |
| Client | `dating-ui/src/lib/admin-match-quality-api.ts` |
| Nav | `/admin` index → Match quality |
| Tests | Page + API client + middleware/gate paths |

**Deploy:** UI only — requires gated staging (`NEXT_PUBLIC_ADMIN_ENABLED=1`) + `ADMIN_USER_IDS` + Story 2 API.

---

## Product action items (owner)

| Cadence | Action |
|---------|--------|
| Weekly ritual steps 1–2 | Use dashboard on gated staging (Postgres metrics) |
| Weekly ritual step 3 | Adoption % still from CloudWatch / log grep (runbook) |
| Story 4 | **View audit** → `/admin/match-quality/[profileId]` (**Done**) |

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Adoption % on dashboard | Logs/API later; not in Story 3 v1 |
| Audit drill-down page | Story 4 |
| Charts / time series | Out of scope |
