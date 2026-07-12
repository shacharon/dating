# Story 6: Launch UX polish

**Sprint:** 9  
**Status:** Done (engineering gate — manual smoke pending operator)  
**Depends on:** Stories 1–3 recommended (photos, gate, prefs inform copy)

---

## Why

Several authenticated routes are placeholders or thin empty states. First cohort users need **analysis progress**, **actionable empty match lists**, and **working settings navigation** — otherwise the engine feels broken even when it isn't.

---

## What

**As a** first-wave user  
**I want** clear status during analysis and helpful guidance when the pool is small  
**So that** I know the app is working and what to do next

### Acceptance criteria

- [x] **Analysis waiting page** (`/dating/analysis`):
  - States: submitted → analyzing → analyzed (poll or redirect when ready)
  - Copy with expected wait ("usually a few minutes")
  - Link to edit profile / add photo while waiting
- [x] **Empty match list** — replace generic "No matches yet" with:
  - Explain cohort liquidity ("More people joining in [city/cohort]")
  - Actions: Edit preferences, Edit profile, Invite a friend (copy link; mailto optional — not shipped)
- [x] **Settings profile pages** — replace TODO placeholders:
  - `/settings/profile` → redirect to `/dating/profile`
  - `/settings/profile/basic` and `/settings/profile/story` → redirect to onboarding edit paths (`?edit=1`)
- [x] **Match detail human-first** — reorder layout: photo hero (Story 1) → name/location → one-line takeaway → chips → de-emphasized score
- [x] **Launch runbook doc** — `docs/sprints/sprint-09-product-mvp/LAUNCH_COHORT_RUNBOOK.md`:
  - Cohort size target, manual moderation checklist, funnel KPI queries (CloudWatch Insights snippets from PRODUCT_FUNNEL.md)
- [x] **Hide internal routes in prod** — middleware 404 `/profiles`, `/evaluate`, `/auto-matches`, `/dev/*` when `NODE_ENV=production` (listed in runbook; escape hatch `NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES=1`)
- [x] **Tests** — analysis state component; empty state renders actions

### Out of scope (this story)

- Invite-code system
- Automated cohort emails
- PostHog dashboard
- Weekly match batch drops

---

## Technical notes (guidance, not prescriptive)

- Reuse existing profile status enums (`SUBMITTED`, `ANALYZING`, `ANALYZED`).
- Polling interval for analysis page: 5–10s with backoff; stop when `ANALYZED` or redirect to matches.
- i18n: at least en + es for new strings (match Sprint 8 pattern).

---

## Definition of done

- [x] No user-facing `TODO` placeholders in settings profile/account paths touched by this sprint
- [ ] Analysis and empty states tested manually *(operator waiver — same as Stories 1–5)*
- [x] Launch runbook committed
- [x] Prod internal routes gated

---

## Manual smoke

1. Submit profile → land on analysis page → see progress → auto-redirect to matches when analyzed. *(operator)*
2. User in empty pool → sees actionable empty state with pref/profile links. *(operator)*
3. Settings → Profile → reaches editable profile without TODO page. *(operator)*
4. Production build: `/evaluate` returns 404. *(operator — requires green `npm run build`; see sprint closeout for legacy `/dating/matches` blocker)*

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Analysis poll | `analysis-progress-poll.ts` — 5s→10s backoff, redirect guards |
| Waiting UI | `AnalysisProgressPanel` + `/dating/analysis` poll + auto-redirect |
| Empty matches | `MatchListEmptyState` — cohort copy, prefs/profile/invite actions |
| Match detail | Takeaway → chips → `Match score · N` (de-emphasized) |
| Settings | Server redirects for `/settings/profile`, `/basic`, `/story` |
| Prod gate | `internal-routes-gate.ts` + middleware 404 |
| Nav | Match preferences → `/settings/preferences` |
| Ops | `LAUNCH_COHORT_RUNBOOK.md` |
| i18n | `analysisProgress`, `launch.emptyMatches`, `launch.matchDetail` en + es |
| Tests | **267/267** UI |

Handoffs: `handoffs/STORY_06_launch_ux_polish/agent-*.md`

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Fix legacy `/dating/matches` build break or prod-gate `/matches` | Pre-deploy hygiene |
| Mailto invite secondary action | Growth polish |
| Match feedback ("good suggestion?") | Sprint 10+ |
| Weekly match drops | Sprint 10+ |
| Referral tracking | Growth sprint |
