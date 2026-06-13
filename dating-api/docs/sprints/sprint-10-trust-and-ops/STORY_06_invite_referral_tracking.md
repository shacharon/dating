# Story 6: Invite referral tracking

**Sprint:** 10  
**Status:** Done (engineering gate — manual smoke pending operator)  
**Depends on:** — (builds on Sprint 9 empty-state "copy invite link")

---

## Why

Sprint 9 empty match state includes **copy invite link** (landing URL) but no **attribution**. Growth for early cohorts depends on knowing which invites convert. Full invite-code gating is out of scope; lightweight `?ref=` tracking is enough for v1.

---

## What

**As a** product owner  
**I want** to know when signups come from user-shared invite links  
**So that** we can measure word-of-mouth growth

**As a** user  
**I want** my invite link to stay simple to share  
**So that** I can help grow the local pool

### Acceptance criteria

- [x] **Landing URL** — optional `?ref=<referrerUserId>` (raw `User.id` per architect)
  - Persisted in `sessionStorage` on landing; survives Google OAuth redirect
- [x] **Signup attribution** — on `POST /api/v1/auth/google` for **new** users only, store `referredByUserId` on `User`
- [x] **Schema** — `User.referredByUserId` + index; migration `20260606300000_user_referred_by`
- [x] **Empty state link** — `MatchListEmptyState` invite URL includes viewer's `?ref=`
- [x] **Analytics** — `referral.landing_viewed` `{ refPresent }`; `referral.signup_completed` on attributed signup (referrer id DB-only, not in analytics props)
- [x] **Validation** — self-ref ignored; deleted/invalid ref → signup succeeds, no attribution
- [x] **Privacy** — no referrer PII in event properties
- [x] **Tests** — ref through auth flow; new user row; invalid/deleted ref ignored

### Out of scope (this story)

- Invite-only signup / codes required to register
- Referrer rewards or gamification
- Mailto invite button (Sprint 9 deferred)
- Admin dashboard for referral counts

---

## Technical notes (guidance, not prescriptive)

- Architect chose raw `User.id` in URL (opaque codes deferred to Sprint 11).
- Public beacon: `POST /api/v1/public/funnel/referral-landing-view`.
- Do not block login if ref missing or invalid.

---

## Definition of done

- [x] Referral stored on new signups
- [x] Empty state copy link includes ref
- [x] Analytics events documented in PRODUCT_FUNNEL.md
- [x] API + UI tests

---

## Manual smoke

1. User A copies invite link from empty state
2. User B opens link in incognito → signs up with Google
3. DB: B.`referredByUserId` = A.id
4. Logs: `referral.signup_completed`

**Operator:** see `handoffs/STORY_06_invite_referral_tracking/agent-3-pm.md`. Use a **real active user id** in `?ref=` (not placeholder `test`).

---

## Shipped (2026-06-06)

| Area | Deliverable |
|------|-------------|
| Schema | `User.referredByUserId` self-FK + migration |
| API | Optional `referredByUserId` on google login; `ReferralAttributionService` (create-only) |
| Public funnel | `POST /api/v1/public/funnel/referral-landing-view` → `referral.landing_viewed` |
| Analytics | `referral.signup_completed` with empty properties; ops trace on attribute |
| UI | `referral-attribution.ts`; landing capture; empty-state invite URL with ref |
| Docs | `PRODUCT_FUNNEL.md`, `DATA_RETENTION.md` |

**Deploy:** API + UI after `npx prisma migrate deploy`.

---

## Deferred / follow-up

| Item | Target |
|------|--------|
| Referral count in profile / settings | Growth polish |
| Opaque invite codes with expiry | Sprint 11 |
| Cohort invite-only launch | Ops playbook |
