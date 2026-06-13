# Handoff: Agent 0 — Architect — Story 6

**Agent:** 0 architect  
**Story:** [STORY_06_invite_referral_tracking.md](../../STORY_06_invite_referral_tracking.md)  
**Sprint:** sprint-10-trust-and-ops  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Lightweight attribution** — optional `?ref=<referrerUserId>` on public landing; persist in **sessionStorage** through Google OAuth; attach on **new-user signup only**.
- **Schema** — nullable `User.referredByUserId` FK + index; migration.
- **API** — optional `referredByUserId` on `POST /api/v1/auth/google`; server validates referrer (never trust blindly). Invalid/self/deleted ref → signup **still succeeds**, no attribution.
- **Public funnel beacon** — unauthenticated `POST /api/v1/public/funnel/referral-landing-view` for pre-auth `referral.landing_viewed`.
- **UI** — capture ref on landing; empty-state copy link includes viewer `?ref=`; shared `referral-attribution.ts` helper.
- **Analytics** — `referral.landing_viewed` `{ refPresent }`; `referral.signup_completed` with **empty properties** (referrer id DB + ops trace only).
- **No invite gating** — tracking only.

---

## Artifacts

| Path | Change |
|------|--------|
| **API — schema** | |
| `dating-api/prisma/schema.prisma` | `User.referredByUserId`, self-relation, `@@index([referredByUserId])` |
| `dating-api/prisma/migrations/*_user_referred_by/migration.sql` | add column + FK + index |
| **API — referral attribution** | |
| `dating-api/src/auth/referral-attribution.service.ts` | **created** — validate/resolve referrer |
| `dating-api/src/auth/referral-attribution.service.spec.ts` | **created** — valid/invalid/deleted/self |
| `dating-api/src/auth/auth.service.ts` | pass ref on **create-only** path; analytics signup |
| `dating-api/src/auth/auth.service.spec.ts` | new-user attribution + ignore on returning login |
| `dating-api/src/auth/auth.dto.ts` | extend `GoogleIdTokenLoginDto` with optional `referredByUserId` |
| `dating-api/src/auth/auth.module.ts` | import `AnalyticsModule`; register service |
| `dating-api/src/auth/auth-http.integration.spec.ts` | HTTP: valid ref, invalid ref, returning user unchanged |
| `dating-api/src/users/users.service.ts` | `createFromGoogleIdentity(..., referredByUserId?)` |
| `dating-api/src/users/users.service.spec.ts` | assert column on create |
| **API — public funnel** | |
| `dating-api/src/analytics/public-funnel.controller.ts` | **created** — landing-view beacon |
| `dating-api/src/analytics/dto/referral-landing-view.dto.ts` | **created** — `{ refPresent: boolean }` |
| `dating-api/src/analytics/analytics.module.ts` | register controller |
| `dating-api/src/analytics/public-funnel.controller.spec.ts` or integration | beacon + analytics |
| **API — observability** | |
| `dating-api/src/analytics/product-analytics.events.ts` | `REFERRAL_LANDING_VIEWED`, `REFERRAL_SIGNUP_COMPLETED` |
| `dating-api/src/analytics/analytics.constants.ts` | **created** — `ANONYMOUS_ANALYTICS_USER_ID = 'anonymous'` |
| `dating-api/src/logging/error-codes.ts` | `REFERRAL_SIGNUP_ATTRIBUTED` (optional structured trace) |
| **UI** | |
| `dating-ui/src/lib/referral-attribution.ts` | **created** — storage, capture, buildInviteUrl, cuid format check |
| `dating-ui/src/lib/referral-attribution.spec.ts` | **created** |
| `dating-ui/src/lib/auth/auth-api.ts` | send `referredByUserId` on google POST; clear storage on success |
| `dating-ui/src/lib/auth/auth-api.spec.ts` | body includes stored ref |
| `dating-ui/src/components/landing/public-landing-client.tsx` | capture `?ref=`; fire landing beacon |
| `dating-ui/src/components/match-list-empty-state.tsx` | copy link `/?ref=<viewerUserId>` |
| `dating-ui/src/components/match-list-empty-state.spec.tsx` | assert ref in copied URL |
| `dating-ui/src/components/landing/public-landing-client.spec.tsx` | capture + beacon (if missing, create) |
| **Docs** | |
| `dating-api/docs/analytics/PRODUCT_FUNNEL.md` | two referral rows + anonymous envelope note |
| `dating-api/docs/legal/DATA_RETENTION.md` | optional one-liner: `referredByUserId` retained on anonymized user row |

**No changes required:**

- Match engine / browse filters
- Admin dashboards
- Auth response DTO (do **not** expose `referredByUserId` to client)
- Invite-only signup gating

---

## Decisions (do not reverse without discussion)

### 1. Ref wire format — raw `User.id` in `?ref=` (not opaque token)

| Approach | Verdict |
|----------|---------|
| Opaque short invite code table | **Rejected for v1** — Sprint 11 follow-up; extra schema + resolve endpoint |
| Raw `User.id` (cuid) in `?ref=` | **Chosen** — story allows; server validates existence; small cohort |

URL shape:

```text
https://<app-origin>/?ref=<referrerUserId>
```

Optional `next=` preserved by existing landing redirect logic (middleware passes query params on auth redirect).

---

### 2. Client persistence — sessionStorage (not cookie)

| Key | Value |
|-----|--------|
| Storage key | `dating_referral_ref` |
| Written | On landing when `?ref=` passes client format check |
| Read | On `POST /api/v1/auth/google` |
| Cleared | After successful google exchange (200), win or lose attribution |

**Why sessionStorage:** survives same-tab Google OAuth redirect; no new cookie policy work; cleared on tab close (acceptable v1).

Client format check (UX only — server re-validates):

```typescript
/^c[a-z0-9]{20,}$/i.test(trimmed) && trimmed.length <= 36
```

Last valid `?ref=` wins if user visits multiple invite links in same tab before signup.

---

### 3. Signup attribution — optional field on existing google login

**Request** — extend existing body (no new auth route):

```typescript
POST /api/v1/auth/google
{
  idToken: string;
  referredByUserId?: string;  // optional; from sessionStorage only
}
```

**Rules:**

| Case | Behavior |
|------|----------|
| New user + valid referrer | Set `User.referredByUserId`; fire `referral.signup_completed` |
| New user + invalid/missing ref | Create user; `referredByUserId` null; signup succeeds |
| Returning user login | **Ignore** `referredByUserId` (never update column) |
| Self-ref (`ref === newUser.id`) | Ignore (impossible on create unless tampered — still guard) |
| Referrer deleted (`deletedAt` set) | Ignore |
| Referrer not ACTIVE | Ignore |

Validation in `ReferralAttributionService.resolveReferrerUserId(raw, newUserId)`:

```typescript
// returns referrerUserId or null — never throws
```

---

### 4. Schema — `User.referredByUserId`

```prisma
model User {
  // ...existing fields...
  referredByUserId String?
  referredBy       User?  @relation("UserReferrals", fields: [referredByUserId], references: [id], onDelete: SetNull)
  referrals        User[] @relation("UserReferrals")

  @@index([referredByUserId])
}
```

- **On referrer account deletion:** FK `SetNull` on referred users' rows (referrer row scrubbed, not hard-deleted).
- **Do not expose** in `AuthMeResponseDto`.
- **No backfill** for existing users.

---

### 5. Pre-auth landing analytics — public funnel beacon

Product analytics today require server `AnalyticsService` (envelope `userId`). Pre-auth landing cannot use authenticated routes.

**Locked endpoint:**

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| `POST` | `/api/v1/public/funnel/referral-landing-view` | none | `{ refPresent: boolean }` | **204** |

Fire **`referral.landing_viewed`** with:

```typescript
analytics.track(ANONYMOUS_ANALYTICS_USER_ID, REFERRAL_LANDING_VIEWED, {
  refPresent: boolean,
});
```

`ANONYMOUS_ANALYTICS_USER_ID = 'anonymous'` — document in PRODUCT_FUNNEL (pre-auth envelope only).

**Do not send raw ref** in beacon body (privacy + enumeration). Client sets `refPresent` from whether valid ref was captured to sessionStorage.

Called once from `PublicLandingClient` on mount (fire-and-forget; failures ignored).

---

### 6. Signup analytics + structured trace

**On successful new-user create with resolved referrer:**

```typescript
analytics.track(newUser.id, REFERRAL_SIGNUP_COMPLETED, {});
// properties intentionally empty — referrer id NOT in analytics props
```

Optional structured trace (ops):

```text
event=referral_signup_attributed userId=<new> referredByUserId=<referrer>
```

Use `ErrorCodes.REFERRAL_SIGNUP_ATTRIBUTED`.

**PII:** no email/name in analytics properties for either event.

---

### 7. UI — empty state invite link

`MatchListEmptyState` copies:

```typescript
buildInviteUrl(window.location.origin, viewerUserId)
// => `${origin}/?ref=${encodeURIComponent(userId)}`
```

Get `viewerUserId` from `useAuth().user?.id` — component is only rendered on authenticated match list empty path.

Keep existing i18n button labels (`launch.emptyMatches.inviteCopyLink` / `inviteCopied`).

---

### 8. UI — landing capture flow

In `PublicLandingClient` (client component):

1. On mount: `captureReferralFromSearchParams(searchParams)` → sessionStorage if valid.
2. On mount: `POST .../referral-landing-view` with `{ refPresent: readStoredReferralRef() != null }`.
3. Google sign-in unchanged UX; auth layer sends stored ref on exchange.

Preserve `next=` param behavior for post-login redirect.

---

### 9. Service signatures

```typescript
@Injectable()
export class ReferralAttributionService {
  resolveReferrerUserId(
    rawReferrerId: string | undefined,
    newUserId: string,
  ): Promise<string | null>;
}

// users.service.ts
createFromGoogleIdentity(
  identity: GoogleIdentity,
  options?: { referredByUserId?: string | null },
): Promise<User>;
```

AuthService change (conceptual):

```typescript
// inside resolveGoogleLoginUser, create branch only:
const referrerId = await this.referralAttribution.resolveReferrerUserId(
  body.referredByUserId,
  'pending', // resolve after create — pass ref to create after validation without newUserId
);
```

**Implementation note for dev:** validate referrer **before** create; self-ref check uses `profile` only after user id known — for create path, self-ref means client sent ref that equals... impossible before create. Guard tampered body where ref equals newly generated id is unnecessary. **Self-ref for returning login:** ignore body entirely.

**Deleted referrer:** `findById` + `deletedAt != null` → null.

---

### 10. Module wiring

```typescript
// auth.module.ts
imports: [SessionModule, UsersModule, MessagingSocketRegistryModule, AnalyticsModule],
providers: [AuthService, GoogleAuthService, ReferralAttributionService, ...],
```

`ReferralAttributionService` uses `UsersService.findById` + status/deleted checks.

---

## Runtime topology

| Step | Flow |
|------|------|
| 1 | User A copies `https://app/?ref=<A.id>` from empty state |
| 2 | User B opens link → sessionStorage set → beacon → `referral.landing_viewed` |
| 3 | B signs in with Google → `POST /auth/google` `{ idToken, referredByUserId: A.id }` |
| 4 | API creates B with `referredByUserId=A.id` → `referral.signup_completed` |
| 5 | sessionStorage cleared |

| Concern | Value |
|---------|--------|
| Auth | Existing session cookie flow |
| Engine | **Unchanged** |
| Socket | N/A |
| Expected Network tab | `POST .../referral-landing-view` → 204; `POST .../auth/google` → 200 |

---

## Tests / verification

Dev (agent 1):

```powershell
cd dating-api
npx prisma migrate deploy
npm test

cd ../dating-ui
npm test
npm run build
```

### Scenarios (must pass)

**API**

- [ ] `POST /auth/google` new user + valid referrer → row has `referredByUserId`
- [ ] `POST /auth/google` new user + invalid ref → row null; **200**
- [ ] `POST /auth/google` new user + deleted referrer → row null; **200**
- [ ] `POST /auth/google` returning user + ref in body → `referredByUserId` unchanged
- [ ] `referral.signup_completed` only when attribution applied; properties `{}`
- [ ] `POST .../referral-landing-view` → 204 + `referral.landing_viewed`
- [ ] Analytics props exclude referrer PII / raw ref on landing

**UI**

- [ ] Landing `?ref=` → sessionStorage set
- [ ] Google exchange sends stored ref
- [ ] Empty state copy URL includes `?ref=<viewerId>`
- [ ] Storage cleared after successful login

Manual smoke (operator): story manual smoke section (use real user id, not `test`).

---

## Docs updates (agent 1)

Add to `PRODUCT_FUNNEL.md`:

| Event | When | Properties |
|-------|------|------------|
| `referral.landing_viewed` | Public landing beacon | `refPresent` (boolean) — envelope `userId: anonymous` |
| `referral.signup_completed` | New user created with valid referrer | _(empty — new user id in envelope only)_ |

PII note: referrer id stored in DB only; not in analytics properties.

---

## Open questions / blockers

- None.

**Follow-up (not this story):** opaque invite codes, referral counts in settings, invite-only launch, mailto invite.

---

## Next agent

```text
--agent 1 sprint 10 story 6
```

**Notes for dev:**

1. Run migration before integration tests.
2. Attribution **create path only** — do not patch `referredByUserId` on returning login.
3. Register `PublicFunnelController` without auth guard; no ref value in beacon body.
4. Import `AnalyticsModule` into `AuthModule` for signup event.
5. Shared UI helper `referral-attribution.ts` — single storage key constant.
6. Empty state requires `useAuth()` — handle null user gracefully (copy plain `/` if missing).
7. Sprint README manual smoke uses `?ref=test` — operator must use a **real active user id** for DB check.
