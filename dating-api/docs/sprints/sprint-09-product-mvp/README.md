# Sprint 9: Product MVP (real-user launch readiness)

**Epic:** Trust, browse UX, and settings — make the dating loop usable by strangers  
**Duration:** ~2 weeks (6 stories)  
**Goal:** Users see faces in the feed, control match preferences, report bad actors, manage their account legally, and get guided through sparse/empty states.  
**Status:** Complete (6/6 engineering gate — manual smoke pending operator)  
**Depends on:** [Sprint 8](../sprint-08-in-app-notifications/README.md) (notifications complete), [Sprint 7 Story 4](../sprint-07-tech-debt/STORY_04_product_funnel_analytics.md) (funnel events for launch KPIs)

---

## Why this sprint

Sprints 1–8 shipped the **core loop** (match → like → mutual → chat) and retention plumbing (email, in-app toast, nav unread, prefs). The product is still not launch-ready for real users:

- Match browse lacked **photos in list/detail** *(Story 1 done)*
- **Legal + account deletion** shipped (Story 5); photos still stub auto-approved
- **Settings** — match preferences + account (privacy, delete) wired; **photo gate** shipped (Story 2)
- **Empty pool** and **analysis waiting** UX shipped (Story 6); cohort runbook in `LAUNCH_COHORT_RUNBOOK.md`

This sprint closes the gap between “engineering MVP” and “product MVP.”

---

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [Photos in match browse](./STORY_01_photos_in_match_browse.md) | **Done** (engineering gate — manual smoke pending operator) | — |
| 2 | [Photo gate + profile completeness](./STORY_02_photo_gate_profile_completeness.md) | **Done** (engineering gate — manual smoke pending operator) | Story 1 (display patterns) |
| 3 | [Match preferences UI](./STORY_03_match_preferences_ui.md) | **Done** (engineering gate — manual smoke pending operator) | — |
| 4 | [Report user](./STORY_04_report_user.md) | **Done** (engineering gate — manual smoke pending operator) | — |
| 5 | [Legal pages + account deletion](./STORY_05_legal_and_account_deletion.md) | **Done** (engineering gate — manual smoke pending operator) | — |
| 6 | [Launch UX polish](./STORY_06_launch_ux_polish.md) | **Done** (engineering gate — manual smoke pending operator) | Stories 1–3 (recommended) |

**Recommended order:** 1 → 3 → 4 → 5 → 2 → 6 (or run 1 + 3 + 4 + 5 in parallel, then 2, then 6).

---

## Decisions (locked for this sprint)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Photo moderation | **Keep stub auto-approve**; gate on presence only | Real moderation provider deferred; launch cohort is small + manual ops |
| Report storage | **DB row + structured log + optional ops email** | No admin dashboard in v1 |
| Legal copy | **Static markdown pages in UI** | Lawyer review out of repo scope; placeholders marked clearly |
| Account deletion | **Soft-delete user + cascade profile** | Hard purge / GDPR export deferred |
| Match preferences | **Edit `UserProfilePreference` only** | Engine already reads this row; no scoring changes |
| Cohort / invite codes | **Out of scope** | Ops playbook in Story 6 doc only |
| Web push / SMS | **Deferred** | Sprint 8+ future |

---

## Launch KPIs (use existing funnel)

Track via `logKind: product_analytics` ([PRODUCT_FUNNEL.md](../../analytics/PRODUCT_FUNNEL.md)):

```text
profile.submitted → match.list_viewed → match.action (like)
  → match.mutual_created → conversation.opened → message.sent
```

**Cohort success (first 30 days):** define targets in Story 6 launch runbook after baseline week.

---

## Agent workflow (per story)

Orchestrator: `.cursor/skills/dating-agent-run/SKILL.md`

Run **one agent at a time**:

```text
--agent 0 sprint 9 story 1   → dating-architect
--agent 1 sprint 9 story 1   → dating-senior-dev
--agent 2 sprint 9 story 1   → dating-code-review
--agent 3 sprint 9 story 1   → dating-pm-contractor
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
| Photos on match list + detail | `primaryPhotoUrl` already on DTO | Thumbnails + hero | Story 1 |
| Photo required for match-ready | Submit / list gate | Onboarding nudge | Story 2 |
| Match preferences editor | PATCH preference fields | `/settings/preferences` | Story 3 |
| Report user | POST report | Match detail + conversation | Story 4 |
| Privacy + terms + delete account | DELETE me | Static pages + settings | Story 5 |
| Analysis wait + empty states | — | `/dating/analysis`, empty list | Story 6 |

**Deferred:** Real photo moderation, admin report queue UI, invite codes, web push, match feedback loop, weekly match drops.

---

## Manual smoke (sprint-level)

1. New user uploads photo → sees photos on match list and detail (Story 1).
2. User without photo cannot reach match list as `ready` (Story 2).
3. User edits age range / partner prefs → match list reflects filters (Story 3).
4. User reports a match → row persisted; block still works independently (Story 4).
5. User reads privacy/terms; deletes account → cannot log in; data gone from product views (Story 5).
6. User on empty pool sees actionable empty state; analysis page shows progress copy (Story 6).

---

## End-to-end smoke (after all stories)

1. `cd dating-api && npx prisma migrate deploy && npm test`
2. `cd dating-ui && npm test && npm run build` *(build currently fails on legacy `/dating/matches` — fix or gate before prod deploy)*
3. Login → onboarding → photo → submit → matches (with photos) → like → mutual → chat
4. Settings: prefs save; notifications toggles still work (Sprint 8)
5. Report + block flows independent
6. Delete account removes session access
