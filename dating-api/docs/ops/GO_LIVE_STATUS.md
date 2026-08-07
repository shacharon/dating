# Go-live status snapshot

**Last updated:** 2026-08-07  
**Purpose:** What is ready vs what still blocks or needs operator action before first real users.

---

## Summary

| Area | Status |
|------|--------|
| **Core product loop** | Built — profile → analysis → matches → like → mutual → chat |
| **Trust & moderation (code)** | Built — photo queue, reports, content safety, admin surfaces |
| **Smart triage UI (Sprint 41–44)** | Mostly done — human validation on Sprint 41 Story 03 still pending |
| **AWS dev deploy (Sprint 20)** | Prep complete — **live apply parked** |
| **Seed profiles for empty pool** | **Not built** — planned in [GO_LIVE_SEED_PROFILES.md](./GO_LIVE_SEED_PROFILES.md) |
| **Operator manual smokes** | Many sprints “done” at engineering gate — **operator has not run full prod checklist** |

---

## What you already have (product)

- Google auth + session cookies
- Full profile onboarding, photo upload, analysis pipeline
- Match list with photos, scoring, holy-grail gates, priority tiers (Sprint 41)
- Match card teaser modes by dating chapter (Sprint 44)
- Mutual match + realtime messaging
- Legal pages, account deletion, report user
- Photo moderation admin queue (`/admin/photos`)
- Report triage (`/admin/reports`)
- Content safety gates (OpenAI moderation on profile + messages)
- i18n EN / ES / HE on main flows
- Invite referral tracking (`?ref=` on signup)
- Empty match state UX when pool is zero
- Local QA tools: `seed-mock-candidates.ts`, `seed-qa50-pool.ts` (dev only)

---

## Open issues / blockers

### P0 — Must resolve before public go-live

| # | Issue | Notes |
|---|-------|-------|
| 1 | **No production seed profile system** | Users may see empty matches. Plan: [GO_LIVE_SEED_PROFILES.md](./GO_LIVE_SEED_PROFILES.md) |
| 2 | **AWS live deploy not applied** | Sprint 20 parked — no verified `dev`/prod URL yet. See [Sprint 20 README](../sprints/sprint-20-aws-dev-deployment/README.md) |
| 3 | **Operator manual smokes not signed off** | Sprints 9–13, 10, 12, etc. list “pending operator” — run [LAUNCH_COHORT_RUNBOOK.md](../sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md) checklist |
| 4 | **Content moderation prod rollout** | Code done (Sprint 30); prod needs DPA check + **7-day policy notice** before enabling gates |
| 5 | **Incident contacts empty** | Launch runbook §7 — fill on-call / product / moderation contacts |
| 6 | **Cohort size targets empty** | Launch runbook §2 — define min profiles per city (e.g. Tel Aviv: 20) |

### P1 — Should resolve soon after / parallel

| # | Issue | Notes |
|---|-------|-------|
| 7 | **Sprint 41 human validation** | Smart triage UI — 3–5 user tests before betting on priority ranking UX |
| 8 | **Gated admin hostname (Sprint 20 Stories 06–07)** | Parked until after live apply — public admin API should be denied in prod |
| 9 | **Real user acquisition plan** | Waitlist, single-city launch, or invite wave — no invite-only gating in product yet |
| 10 | **Expansion signals roadmap** | Separate 6-sprint signal expansion in `/docs/sprints/` — planning phase, not launch blocker |

### Explicitly deferred (not blocking first cohort)

- HG DB retrieval path (stubbed; legacy scoring active)
- Invite-code gating / cohort-only launch in product
- Web push / SMS notifications
- Full GDPR hard purge / data export
- PostHog / external analytics dashboard

---

## Recommended go-live sequence

```text
1. Finish seed profile implementation (5 profiles, browse-only)
2. Lift Sprint 20 hold → terraform apply → deploy dev → VERIFIED_DEV smoke
3. Run full operator checklist (photos, reports, matches, delete account)
4. Deploy privacy/terms → wait 7 days → enable content moderation in prod
5. Seed 5 profiles + onboard first real cohort (single city)
6. Monitor funnel KPIs weekly (runbook §4)
7. Fade out seeds when real density threshold hit
```

---

## Quick links

| Doc | Purpose |
|-----|---------|
| [GO_LIVE_SEED_PROFILES.md](./GO_LIVE_SEED_PROFILES.md) | Seed profile strategy (agreed approach) |
| [LAUNCH_COHORT_RUNBOOK.md](../sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md) | Day-of launch checklist |
| [Sprint 30 — Content safety](../sprints/sprint-30-content-safety/README.md) | Moderation rollout |
| [Sprint 20 — AWS deploy](../sprints/sprint-20-aws-dev-deployment/README.md) | Infra (parked) |
| [DEPLOY_AWS_DEV.md](../../../DEPLOY_AWS_DEV.md) | Operational deploy runbook |
