# Handoff: Agent 1 — Dev — Story 6

**Agent:** 1 dev  
**Story:** [STORY_06_invite_referral_tracking.md](../../STORY_06_invite_referral_tracking.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Schema** — nullable `User.referredByUserId` self-FK with `SetNull` on referrer delete + index.
- **Signup attribution** — optional `referredByUserId` on `POST /api/v1/auth/google`; validated via `ReferralAttributionService`; **new-user create only**.
- **Public beacon** — `POST /api/v1/public/funnel/referral-landing-view` → `referral.landing_viewed`.
- **UI** — `?ref=` captured on landing (sessionStorage); empty-state copy link includes viewer ref; google exchange sends stored ref.
- **Analytics** — `referral.signup_completed` with empty properties; landing uses envelope `userId: anonymous`.
- **Tests** — **1428/1428** API, **291/291** UI; UI build passes.

---

## Files changed

| Path | Change |
|------|--------|
| **API — schema** | |
| `dating-api/prisma/schema.prisma` | `referredByUserId`, self-relation, index |
| `dating-api/prisma/migrations/20260606300000_user_referred_by/migration.sql` | column + FK + index |
| **API — attribution** | |
| `dating-api/src/auth/referral-attribution.service.ts` | validate/resolve referrer |
| `dating-api/src/auth/referral-attribution.service.spec.ts` | unit tests |
| `dating-api/src/auth/auth.service.ts` | create-path attribution + analytics/trace |
| `dating-api/src/auth/auth.dto.ts` | optional `referredByUserId` on google login |
| `dating-api/src/auth/auth.module.ts` | `AnalyticsModule` + service |
| `dating-api/src/auth/auth-http.integration.spec.ts` | HTTP referral + beacon tests |
| `dating-api/src/users/users.service.ts` | `createFromGoogleIdentity` options |
| `dating-api/src/users/users.service.spec.ts` | referredByUserId on create |
| **API — funnel** | |
| `dating-api/src/analytics/public-funnel.controller.ts` | landing-view beacon |
| `dating-api/src/analytics/dto/referral-landing-view.dto.ts` | `{ refPresent }` |
| `dating-api/src/analytics/analytics.module.ts` | register controller |
| `dating-api/src/analytics/public-funnel.controller.spec.ts` | unit test |
| `dating-api/src/analytics/analytics.constants.ts` | `ANONYMOUS_ANALYTICS_USER_ID` |
| `dating-api/src/analytics/product-analytics.events.ts` | referral events |
| `dating-api/src/logging/error-codes.ts` | `REFERRAL_SIGNUP_ATTRIBUTED` |
| **UI** | |
| `dating-ui/src/lib/referral-attribution.ts` | storage, capture, buildInviteUrl |
| `dating-ui/src/lib/referral-attribution.spec.ts` | unit tests |
| `dating-ui/src/lib/referral-attribution-api.ts` | landing beacon client |
| `dating-ui/src/lib/auth/auth-api.ts` | send ref on google POST; clear storage |
| `dating-ui/src/lib/auth/auth-api.spec.ts` | exchange with ref |
| `dating-ui/src/components/landing/public-landing-client.tsx` | capture + beacon |
| `dating-ui/src/components/landing/public-landing-client.spec.tsx` | capture test |
| `dating-ui/src/components/match-list-empty-state.tsx` | invite URL with `?ref=` |
| `dating-ui/src/components/match-list-empty-state.spec.tsx` | copy URL assert |
| `dating-ui/src/app/dating/me-matches/page.spec.tsx` | auth mock for empty state |
| **Docs** | |
| `dating-api/docs/analytics/PRODUCT_FUNNEL.md` | referral rows + PII note |
| `dating-api/docs/legal/DATA_RETENTION.md` | `referredByUserId` retention row |

---

## Verification

```powershell
cd dating-api
npx prisma migrate deploy
npx prisma generate   # if client stale
npm test              # 1428 passed

cd ../dating-ui
npm test              # 291 passed
npm run build
```

### Scenarios covered

**API**

- [x] New user + valid referrer → `createFromGoogleIdentity` with `referredByUserId`
- [x] New user + invalid/deleted referrer → create with null; **200**
- [x] Returning user + ref in body → ignored (no `findById`)
- [x] `POST .../referral-landing-view` → **204**
- [x] ReferralAttributionService unit cases

**UI**

- [x] Landing captures `?ref=` to sessionStorage
- [x] Google exchange sends stored ref; clears on success
- [x] Empty state copies `/?ref=<viewerId>`

---

## Operator notes

- Deploy API + UI after **`npx prisma migrate deploy`** (migration `20260606300000_user_referred_by`).
- Manual smoke: use a **real active user id** in `?ref=`, not `test`.

---

## Next agent

```text
--agent 2 sprint 10 story 6
```

**Notes for CR:**

1. Confirm returning-login path never updates `referredByUserId`.
2. Confirm analytics properties exclude referrer id (signup event `{}`).
3. Beacon body must not include raw ref (only `refPresent` boolean).
