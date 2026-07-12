# Handoff: Agent 3 — PM — Story 6

**Agent:** 3 pm  
**Story:** [STORY_06_invite_referral_tracking.md](../../STORY_06_invite_referral_tracking.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Story 6 closed as Done (engineering gate)** — `?ref=<userId>` attribution on new Google signups; `User.referredByUserId`; public landing beacon; empty-state invite link; `referral.*` analytics.
- Full pipeline: architect → dev → code review (deleted-ref + analytics PII hardening) → pm.
- **Sprint 10 engineering complete: 6/6 stories.**
- **Deploy:** API + UI after **`npx prisma migrate deploy`** (migrations: Story 2/3/4/6 as applicable on target DB).

---

## DoD verification

| Item | Status | Evidence |
|------|--------|----------|
| Referral stored on new signups | Done | Schema + `createFromGoogleIdentity` + HTTP tests |
| Empty state link includes ref | Done | `buildInviteUrl` + UI spec |
| Analytics in PRODUCT_FUNNEL | Done | `referral.landing_viewed`, `referral.signup_completed` |
| API + UI tests | Done | **1433/1433** API, **291/291** UI |
| Manual smoke (story §) | Pending operator | Steps 1–4 below |
| Browser E2E | Pending operator | Automated specs sufficient for gate |

---

## Acceptance criteria

**8 / 8** engineering AC met.

| AC | Status |
|----|--------|
| Landing `?ref=` + sessionStorage | Done + tested |
| Signup attribution (new users only) | Done + tested |
| Schema + migration | Done |
| Empty state invite URL | Done + tested |
| Analytics events (PII-safe) | Done + tested (+ CR) |
| Validation (self/deleted/invalid) | Done + tested |
| Privacy | Done (+ CR) |
| Tests | Done (+ CR hardening) |

**Product note:** Architect chose **raw `User.id` in URL** over opaque invite codes (Sprint 11 follow-up).

---

## Sprint 10 progress

| # | Story | Status |
|---|--------|--------|
| 1 | Prod deploy hygiene | **Done** (manual smoke pending operator) |
| 2 | Photo moderation pipeline | **Done** (migrate deploy + manual smoke pending operator) |
| 3 | Admin report queue | **Done** (migrate deploy + manual smoke pending operator) |
| 4 | Match feedback | **Done** (migrate deploy + manual smoke pending operator) |
| 5 | Candidate photo filter | **Done** (manual smoke pending operator) |
| 6 | Invite referral tracking | **Done** (migrate deploy + manual smoke pending operator) |

**Sprint status:** **Complete (6/6 engineering gate).** Operator manual smokes batched in launch runbook.

---

## Artifacts updated

| Path | Change |
|------|--------|
| `STORY_06_invite_referral_tracking.md` | Status Done, AC/DoD checked, shipped table |
| `README.md` (sprint-10) | Story 6 row; sprint complete; manual smoke step 6 clarified |
| `handoffs/STORY_06_invite_referral_tracking/agent-3-pm.md` | this file |

---

## Decisions (do not reverse without discussion)

- Story closes on **engineering gate**; operator manual smoke waived to launch runbook.
- **Create-only attribution** — returning logins never update `referredByUserId`.
- **Invalid/deleted ref** — signup always succeeds; attribution silently dropped.
- **Analytics** — referrer id in DB + ops trace only; not in product analytics properties.
- **Landing beacon** — `{ refPresent: boolean }` only; envelope `userId: anonymous` for pre-auth.
- **No invite gating** — tracking only per sprint lock.

---

## Tests / verification

- [x] API full suite — **1433/1433** pass
- [x] UI full suite — **291/291** pass
- [x] UI build — pass (Agent 1)
- [ ] `npx prisma migrate deploy` — pending operator (includes `20260606300000_user_referred_by` + prior sprint migrations)
- [ ] Manual smoke (story § steps 1–4) — pending operator

### Runtime verification

| Check | Result |
|-------|--------|
| Landing capture + beacon | UI + HTTP |
| Attributed new signup | HTTP + unit |
| Invalid/deleted ref ignored | HTTP + unit |
| Returning login ignores ref | HTTP |
| Browser invite → signup → DB | Deferred — operator |

---

## Operator manual smoke (Story 6)

**Prerequisites:** Migration deployed; User A authenticated with empty match list (or any path to copy invite).

1. User A: open match list empty state → **Copy invite link** → URL contains `/?ref=<A.userId>`.
2. User B: incognito → open link → landing loads → sign in with Google (new account).
3. DB: `User` row for B has `referredByUserId = A.id`.
4. Staging logs: `referral.signup_completed` for B (empty properties); optional `referral.landing_viewed` with `refPresent: true`.

**Deploy:** API + UI + **`npx prisma migrate deploy`**.

---

## Sprint 10 operator checklist (all stories)

Run once before cohort launch (see sprint README manual smoke):

1. Green prod build; prod gates on `/evaluate`, `/matches`.
2. Photo upload → PENDING → admin approve → visible in browse.
3. Admin report queue triage.
4. Match feedback thumbs on detail.
5. Zero-photo candidates excluded from browse.
6. Referral invite → signup attribution (this story).

Ensure **`npx prisma migrate deploy`** on target DB covers all pending migrations from Stories 2, 3, 4, and 6.

---

## Deferred / follow-up (not blocking)

| Item | Notes |
|------|--------|
| Opaque invite codes | Sprint 11 |
| Referral counts in settings | Growth polish |
| Invite-only launch | Ops playbook |
| Sprint 11 planning | Moderation provider, GDPR export, etc. (see sprint README) |

---

## Open questions / blockers

- None blocking sprint closeout.

---

## Next work

Sprint 10 engineering pipeline **complete**. Operator: batch manual smokes + deploy.

For product planning:

```text
--agent 0 sprint 11 story 1
```

(or define Sprint 11 backlog per deferred items in sprint README).
