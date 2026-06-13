# Sprint 10: Trust, ops, and deploy readiness

**Epic:** Scale manual ops into product tooling — ship safely, moderate content, learn from matches  
**Duration:** ~2 weeks (6 stories)  
**Goal:** Green production build, real photo moderation flow, admin report triage, match-quality signals, and cleaner browse pool.  
**Status:** Complete (6/6 engineering gate — operator smokes pending)  
**Depends on:** [Sprint 9](../sprint-09-product-mvp/README.md) (product MVP complete — reports, legal, photo gate, launch UX)

---

## Why this sprint

Sprint 9 closed the **product MVP** gap (photos, prefs, reports, legal, launch polish). Before and during the first cohort:

- ~~**`npm run build` fails** on legacy `/dating/matches`~~ — **resolved Story 1**
- ~~Photos **stub auto-approve**~~ — **resolved Story 2** (upload → PENDING + `/admin/photos` queue)
- ~~Reports **SQL-only triage**~~ — **resolved Story 3** (`/admin/reports` queue)
- ~~No signal on **match quality** for future ranking tweaks~~ — **resolved Story 4** (store + analytics; ranking unchanged)
- ~~Photo-less **candidates** can still appear in others' lists~~ — **resolved Story 5** (SQL filter + visibility 404s)

This sprint turns launch runbook manual steps into **product surfaces** and clears the deploy blocker.

---

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [Prod deploy hygiene](./STORY_01_prod_deploy_hygiene.md) | **Done** (manual smoke pending operator) | — |
| 2 | [Photo moderation pipeline](./STORY_02_photo_moderation.md) | **Done** (migrate deploy + manual smoke pending operator) | Story 1 (optional — parallel OK) |
| 3 | [Admin report queue](./STORY_03_admin_report_queue.md) | **Done** (migrate deploy + manual smoke pending operator) | Story 1 (admin route gating) |
| 4 | [Match feedback](./STORY_04_match_feedback.md) | **Done** (migrate deploy + manual smoke pending operator) | — |
| 5 | [Candidate photo filter](./STORY_05_candidate_photo_filter.md) | **Done** (manual smoke pending operator) | Story 2 (approved-only semantics) |
| 6 | [Invite referral tracking](./STORY_06_invite_referral_tracking.md) | **Done** (migrate deploy + manual smoke pending operator) | — |

**Recommended order:** 1 → 2 → 3 → 5 → 4 → 6 (or run 1 first, then 2 + 3 + 4 in parallel).

---

## Decisions (locked for this sprint)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Legacy compare UI | **Fix build or remove `/dating/matches`** + prod-gate `/matches` | Unblocks deploy; runbook already marks dev-only |
| Photo moderation v1 | **Upload → `PENDING`; ops approve/reject in admin** | Provider integration optional follow-up; schema already supports status |
| Moderation provider | **Manual admin queue first** | Small cohort; Rekognition/Moderation API deferred |
| Admin auth | **Env allowlist `ADMIN_USER_IDS`** + session | No full RBAC in v1 |
| Admin UI routes | **`/admin/*` — dev open; prod requires admin user** | Separate from public prod gate |
| Match feedback | **Thumbs on match detail only** | No re-ranking engine changes this sprint |
| Candidate filter | **Exclude profiles with 0 approved photos** | Aligns browse with Story 9 viewer gate |
| Invite codes | **Track `?ref=` signup only** | No gating / invite-only launch |

---

## Launch KPIs (unchanged)

Continue funnel from [PRODUCT_FUNNEL.md](../../analytics/PRODUCT_FUNNEL.md). Add Sprint 10 events:

```text
photo.moderation_pending | photo.moderation_decided
report.ops_resolved
match.feedback
referral.landing_viewed | referral.signup_completed
```

---

## Agent workflow (per story)

Orchestrator: `.cursor/skills/dating-agent-run/SKILL.md`

```text
--agent 0 sprint 10 story 1   → dating-architect
--agent 1 sprint 10 story 1   → dating-senior-dev
--agent 2 sprint 10 story 1   → dating-code-review
--agent 3 sprint 10 story 1   → dating-pm-contractor
```

Handoffs: `handoffs/<story-slug>/agent-*.md`

---

## Sprint outcome (target)

| Feature | API | UI | Notes |
|---------|-----|-----|-------|
| Green prod build | — | Fix/remove legacy matches | Story 1 |
| Photo moderation | Upload → PENDING; admin PATCH | Pending/rejected banners | Story 2 |
| Report triage | GET/PATCH admin reports | `/admin/reports` | Story 3 |
| Match feedback | PUT feedback | Match detail thumbs | Story 4 |
| Clean browse pool | Filter 0-photo candidates | — | Story 5 |
| Referral tracking | Persist ref on signup | Landing `?ref=` + analytics | Story 6 |

**Follow-up:** [Sprint 11 — Match quality intelligence](../sprint-11-match-quality-intelligence/README.md) (feedback analytics + engine approval).

**Deferred to Sprint 12+:** Moderation provider (Rekognition), auto-ban on N reports, GDPR export, web push, weekly match batch emails, invite-code gating, feedback-weighted ranking.

---

## Manual smoke (sprint-level)

1. `cd dating-ui && npm run build` succeeds; prod middleware 404 on `/evaluate` and `/matches`.
2. Upload photo → status `PENDING` → admin approves → appears on match list.
3. Admin opens report queue → dismisses or marks action taken.
4. User submits match feedback → event in structured logs.
5. User without approved photos does not appear in others' match lists.
6. User A copies invite link → User B incognito signup → `referredByUserId` set (use real user id in `?ref=`, not `test`).

---

## Pre-sprint checklist

- [ ] Sprint 9 operator smokes complete (or waived with notes)
- [ ] `npx prisma migrate deploy` on target environment
- [ ] Fill incident contacts in [LAUNCH_COHORT_RUNBOOK.md](../sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md)
