# Sprint 9 Closeout

**Sprint:** product-mvp (real-user launch readiness)  
**Status:** **6/6 engineering stories done** · operator smokes pending  
**Last updated:** 2026-06-06

---

## Done (engineering gate)

| # | Story | What shipped |
|---|--------|--------------|
| 1 | [Photos in match browse](./STORY_01_photos_in_match_browse.md) | `primaryPhotoUrl` thumbnails + detail hero |
| 2 | [Photo gate + profile completeness](./STORY_02_photo_gate_profile_completeness.md) | `no_photo` list gate, submit 422, UI redirect + banner |
| 3 | [Match preferences UI](./STORY_03_match_preferences_ui.md) | `/settings/preferences` editor |
| 4 | [Report user](./STORY_04_report_user.md) | POST report + dialog on match detail / conversation |
| 5 | [Legal + account deletion](./STORY_05_legal_and_account_deletion.md) | `/privacy`, `/terms`, `DELETE /api/v1/me/account` |
| 6 | [Launch UX polish](./STORY_06_launch_ux_polish.md) | Analysis wait + poll, empty match state, settings redirects, prod route gate, [LAUNCH_COHORT_RUNBOOK.md](./LAUNCH_COHORT_RUNBOOK.md) |

**Test baseline (Story 6 close):** **267/267** UI (`cd dating-ui && npm test`).

---

## Operator-only (not blocking engineering closeout)

Batch before cohort launch:

1. **Sprint smoke (Stories 1–6)** — see [README.md](./README.md) manual smoke section.
2. **Story 6 analysis flow** — submit → progress panel → auto-redirect matches.
3. **Empty pool UX** — actionable empty state links.
4. **Settings profile redirects** — no TODO pages.
5. **Prod internal routes** — `/evaluate` → 404 in production build.

---

## Pre-deploy blocker (resolved Sprint 10 Story 1)

~~`cd dating-ui && npm run build` fails on legacy `/dating/matches/children-unsure-badge.tsx`.~~

**Resolved (2026-06-06):** [Sprint 10 Story 1](../sprint-10-trust-and-ops/STORY_01_prod_deploy_hygiene.md) — legacy detail UI removed, prod gates `/matches` + `/dating/matches`, **`npm run build` green**.

---

## Launch ops

Use [LAUNCH_COHORT_RUNBOOK.md](./LAUNCH_COHORT_RUNBOOK.md) for cohort checklist, moderation, funnel KPI queries, and incident placeholders.

Funnel events: [PRODUCT_FUNNEL.md](../../analytics/PRODUCT_FUNNEL.md).

---

## Deferred (explicit out of sprint)

Real photo moderation provider, admin report queue, invite codes, web push, match feedback loop, weekly match drops, GDPR export.
