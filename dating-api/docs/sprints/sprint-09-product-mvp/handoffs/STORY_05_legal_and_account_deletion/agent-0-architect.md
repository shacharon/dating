# Handoff: Agent 0 — Architect — Story 5

**Agent:** 0 architect  
**Story:** [STORY_05_legal_and_account_deletion.md](../../STORY_05_legal_and_account_deletion.md)  
**Sprint:** sprint-09-product-mvp  
**Date:** 2026-06-06  
**Status:** complete  

---

## Summary

- **Static legal pages** — public `/privacy` and `/terms` (markdown source + shared layout; draft footer marker).
- **Account settings UI** — replace `/settings/account` TODO with links (privacy, terms, notification prefs) + **Delete account** danger zone.
- **New `MeAccountModule`** — `DELETE /api/v1/me/account` with required `{ confirmation: "DELETE" }` body; soft-delete + PII scrub in one transaction; photo blob delete best-effort **before** DB txn.
- **Post-delete auth** — scrub `email` + `googleId` to free unique constraints → same Google account may sign up as **new User**; `deletedAt` + `status=DISABLED` blocks old row.
- **Product visibility** — deleted users excluded from match browse; ACTIVE mutual matches involving user → **UNMATCHED**; sender messages anonymized.
- **Sessions + WS** — revoke all user sessions, disconnect sockets, clear HttpOnly cookie (mirror logout).
- **Analytics** — `account.deleted` fired **before** mutation (`userId` only, empty properties).
- **Retention doc** — `dating-api/docs/legal/DATA_RETENTION.md` (factual table; linked from privacy page).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | `User.deletedAt DateTime?` + `@@index([deletedAt])` |
| `dating-api/prisma/migrations/*` | new migration |
| `dating-api/src/me-account/me-account.module.ts` | **created** |
| `dating-api/src/me-account/me-account.controller.ts` | `DELETE api/v1/me/account` |
| `dating-api/src/me-account/me-account.service.ts` | delete orchestration |
| `dating-api/src/me-account/dto/delete-account.dto.ts` | `{ confirmation: "DELETE" }` |
| `dating-api/src/me-account/me-account.service.spec.ts` | unit tests |
| `dating-api/src/me-account/me-account-http.integration.spec.ts` | delete + session invalid |
| `dating-api/src/session/session.service.ts` | `revokeAllSessionsForUser(userId)` |
| `dating-api/src/session/session.service.spec.ts` | revoke-all tests |
| `dating-api/src/messaging-realtime/messaging-socket-registry.service.ts` | `disconnectByUserId(userId)` |
| `dating-api/src/auth/auth.guard.ts` | reject `deletedAt != null` |
| `dating-api/src/me-profile/me-matches.service.ts` | candidate query excludes deleted users |
| `dating-api/src/analytics/product-analytics.events.ts` | `ACCOUNT_DELETED: 'account.deleted'` |
| `dating-api/docs/analytics/PRODUCT_FUNNEL.md` | document event |
| `dating-api/docs/legal/DATA_RETENTION.md` | **created** — retention table |
| `dating-api/src/logging/error-codes.ts` | `ACCOUNT_DELETE_*` codes |
| `dating-api/src/app.module.ts` | import `MeAccountModule` |
| `dating-ui/package.json` | add `react-markdown` (legal rendering) |
| `dating-ui/content/legal/privacy.md` | **created** — draft policy |
| `dating-ui/content/legal/terms.md` | **created** — draft terms |
| `dating-ui/src/components/legal/legal-document-page.tsx` | **created** — markdown + draft footer |
| `dating-ui/src/app/(public)/privacy/page.tsx` | **created** |
| `dating-ui/src/app/(public)/terms/page.tsx` | **created** |
| `dating-ui/src/components/landing/public-landing-client.tsx` | footer links Privacy / Terms |
| `dating-ui/src/app/(authenticated)/settings/account/page.tsx` | account settings + delete zone |
| `dating-ui/src/components/delete-account-section.tsx` | **created** — confirm + submit |
| `dating-ui/src/lib/delete-account-api.ts` | **created** — `deleteMyAccount()` |
| `dating-ui/src/components/notification-preferences-section.tsx` | add `id="notification-prefs"` anchor |
| `dating-ui/src/lib/i18n/types.ts`, `en.ts`, `es.ts` | `accountSettings`, `deleteAccount`, `legal` copy |
| `dating-ui/src/components/delete-account-section.spec.tsx` | confirm + API mock |
| `dating-ui/src/app/(public)/privacy/page.spec.tsx` | draft footer visible |

**No changes required:** Google OAuth verify flow, `POST /api/v1/auth/logout` (reuse cookie-clear helpers).

---

## Decisions (do not reverse without discussion)

### 1. Module placement — dedicated `me-account/` (not auth-only patch)

| Approach | Verdict |
|----------|---------|
| Add delete to `AuthService` only | **Rejected** — cross-cutting (profile, photos, messages, matches) |
| New `MeAccountModule` + `DELETE /api/v1/me/me/account` | **Rejected** — wrong path |
| New `MeAccountModule` + `DELETE /api/v1/me/account` | **Chosen** |

`MeAccountModule` imports: `PrismaModule`, `SessionModule`, `StructuredLoggingModule`, `AnalyticsModule`, `PhotoStorageModule`, `MessagingSocketRegistryModule` (standalone registry — same pattern as `AuthModule` logout).

---

### 2. API contract — `DELETE /api/v1/me/account`

```http
DELETE /api/v1/me/account
Auth: session cookie
Content-Type: application/json

{ "confirmation": "DELETE" }
```

| Field | Rules |
|-------|-------|
| `confirmation` | Required string; must equal **`DELETE`** exactly (case-sensitive) |

**Responses:**

| Status | When | Body |
|--------|------|------|
| **204** | Deleted | empty; **Set-Cookie** clears session (same options as logout) |
| **400** | Bad/missing confirmation | `{ error: 'account_delete_confirmation_invalid' }` |
| **401** | No session | AuthGuard |
| **404** | User already deleted (`deletedAt` set) | `{ error: 'account_already_deleted' }` |
| **500** | Unexpected persistence failure | existing error pattern |

Use `ValidationPipe` with whitelist on DTO. **Require body** — UI must send JSON on DELETE (`fetch` with `credentials: 'include'`).

**Idempotency:** second delete → **404** (not 204).

---

### 3. Prisma schema (locked)

```prisma
model User {
  // ... existing fields ...
  deletedAt DateTime?

  @@index([deletedAt])
}
```

**Do not** add `UserStatus.DELETED` enum value — use `deletedAt` + existing `DISABLED`.

---

### 4. Soft-delete + identity scrub (locked)

On successful delete, in one `$transaction`:

**`User` row (keep primary key for FK integrity):**

| Field | After delete |
|-------|----------------|
| `deletedAt` | `now()` |
| `status` | `DISABLED` |
| `email` | `deleted+{userId}@deleted.invalid` |
| `googleId` | `deleted+{userId}` |
| `displayName` | `null` |
| `avatarUrl` | `null` |
| `emailNotificationsEnabled` | `false` |
| `inAppNotificationsEnabled` | `false` |

**Re-login (manual smoke #3 — locked):**

Same Google account → `findByGoogleId` misses scrubbed id → **new `User` row** created (fresh account). Document in privacy + DATA_RETENTION.

**`UserProfile` (if exists) — scrub PII, keep row:**

- Clear text/scalars: `name`, `nickname`, `aboutMe`, `aboutPartner`, `aboutRelationship`, `birthDate`, `city`, `country`, `locationLabel`, HG self fields, `interestsTop`, all `sig*`, `lastAnalysisError`
- `nickname` → `null` (unique constraint)
- `desiredPartnerGenders` → `null`
- `status` → `DRAFT` (removed from match pool)
- Keep `id`, `userId`, timestamps for FK / audit

**Delete child rows (hard delete):**

- `UserProfilePhoto` (+ storage blobs — see §5)
- `UserProfileEvaluation`, `UserProfileSignal`, `UserProfileInterest`
- `UserProfilePreference` row
- `MatchAction` where `actorUserId = userId`

**Keep (ops / other users):**

- `UserReport` rows (reporter/reported ids point at anonymized user)
- `MatchAction` where `targetUserId = userId` (other actors’ history)
- `MutualMatch` rows — status updated (§6)
- `Message` rows — text anonymized (§6)

---

### 5. Photo storage — best-effort before transaction

```typescript
const photos = await prisma.userProfilePhoto.findMany({ where: { profileId } });
await Promise.all(
  photos.map((p) =>
    photoStorage.delete(p.storageKey).catch(() => undefined),
  ),
);
```

Failures: log `ACCOUNT_DELETE_PHOTO_STORAGE_FAILED` with `photoId` / `storageKey`; **do not** abort delete.

---

### 6. Mutual matches + messages

**Mutual matches** — all `ACTIVE` rows where `userId1 = userId OR userId2 = userId`:

```typescript
await tx.mutualMatch.updateMany({
  where: {
    status: 'ACTIVE',
    OR: [{ userId1: userId }, { userId2: userId }],
  },
  data: {
    status: 'UNMATCHED',
    unmatchedAt: now,
    unmatchedByUserId: userId,
  },
});
```

Reuses Story 2 unmatch semantics — conversations disappear from list/detail (existing ACTIVE filters).

**Messages** from deleted user:

```typescript
await tx.message.updateMany({
  where: { senderId: userId },
  data: { text: '[deleted user]', status: 'DELETED' },
});
```

Other participant sees placeholder text; no message body retained in product UI.

---

### 7. Match browse exclusion

Extend candidate query in `MeMatchesService.list` / detail loaders:

```typescript
where: {
  userId: { not: userId },
  status: STATUS_ANALYZED,
  user: { deletedAt: null },
}
```

No engine/scoring changes.

---

### 8. Auth guard + sessions + WebSocket

**AuthGuard** — after loading user, before ACTIVE check:

```typescript
if (user.deletedAt != null) {
  throw new UnauthorizedException(); // same as missing user
}
```

**SessionService** — add:

```typescript
async revokeAllSessionsForUser(userId: string): Promise<number>
```

**MessagingSocketRegistry** — add:

```typescript
disconnectByUserId(userId: string): void
```

**Controller** after successful delete (same order as logout):

1. `socketRegistry.disconnectByUserId(userId)`
2. `sessions.revokeAllSessionsForUser(userId)` (includes current session)
3. `res.clearCookie(sessionCookieName, httpOnlyLaxSessionCookieBase(...))`
4. `obs.trace(..., ACCOUNT_DELETE_SUCCESS)`

---

### 9. Analytics vs observability

| Channel | Event | Payload |
|---------|-------|---------|
| Product analytics | `analytics.track(userId, 'account.deleted', {})` | **empty properties** — envelope has `userId` (pre-delete id) |
| Ops structured log | `ACCOUNT_DELETE_SUCCESS` | `userId` only — no email/name |

Fire analytics **before** DB transaction starts. Update `PRODUCT_FUNNEL.md`.

---

### 10. Static legal pages (UI)

**Routes (public — no auth shell):**

| Path | Source |
|------|--------|
| `/privacy` | `content/legal/privacy.md` |
| `/terms` | `content/legal/terms.md` |

**Shared component:** `LegalDocumentPage`

- Renders markdown via **`react-markdown`**
- Footer on every page: **`[DRAFT — legal review pending]`** (visible, not hidden in metadata)
- Link to `/privacy` from privacy body → `DATA_RETENTION` summary (short inline section + link to repo doc path for operators; UI may summarize key bullets)

**Landing footer** — add to `PublicLandingClient` bottom:

```text
Privacy · Terms
```

(ltr links; landing remains rtl/he — legal pages default `dir="ltr"` `lang="en"`)

**No i18n for legal body v1** — English draft only; page chrome may use minimal i18n for nav back link.

---

### 11. Account settings page

Replace TODO at `/settings/account`:

| Section | Content |
|---------|---------|
| Legal | Links → `/privacy`, `/terms` |
| Notifications | Link → `/dating/profile#notification-prefs` |
| Danger zone | `DeleteAccountSection` |

**Notification prefs:** Sprint 8 UI lives on `/dating/profile` (`NotificationPreferencesSection`). Add `id="notification-prefs"` on section wrapper; account page links there — **do not duplicate** prefs form on account page.

**Delete UX** (mirror report/block two-step):

1. Explain irreversible action
2. User types **`DELETE`** in text input (enabled only when exact match)
3. Submit → `deleteMyAccount()` → on **204**: call auth `logout()` or `refresh()` + `router.replace('/')`
4. Errors: invalid confirmation (400), network — role=alert

**i18n:** `accountSettings` + `deleteAccount` keys en + es for chrome; legal links labels.

---

### 12. DATA_RETENTION.md (locked outline)

Path: `dating-api/docs/legal/DATA_RETENTION.md`

Sections:

1. **Deleted on account delete** — profile text, photos (DB + storage), evaluations/signals/interests, preference row, actor match actions, session rows revoked, sender message text replaced
2. **Retained** — anonymized `User.id`, `UserReport` rows, mutual match metadata, messages as placeholders, match actions by others toward deleted user
3. **Re-signup** — new user row; prior id not linked in product UI
4. **Ops access** — DB queries for moderation reports; no admin UI in v1

Privacy markdown should include a short user-facing summary table matching this doc.

---

## Runtime topology

```text
Browser (session cookie)
  → DELETE /api/v1/me/account { confirmation: "DELETE" }
  → MeAccountService
       → analytics.track(account.deleted)
       → load profile + photos
       → photoStorage.delete(*) best-effort
       → prisma.$transaction (scrub user/profile, delete children, unmatch, anonymize messages)
       → obs.trace(ACCOUNT_DELETE_SUCCESS)
  → disconnectByUserId + revokeAllSessions + clearCookie
  ← 204

Post-delete login (same Google):
  → findByGoogleId miss → createFromGoogleIdentity → new session
```

---

## Tests / verification (for agents 1–2)

| Layer | Scope |
|-------|--------|
| API unit | `me-account.service.spec.ts` — scrub fields, unmatch, message anonymization, idempotent 404 |
| API integration | `me-account-http.integration.spec.ts` — 204 + cookie cleared; 400 bad confirmation; 401; GET /auth/me 401 after delete |
| Session | `revokeAllSessionsForUser` revokes all rows for user |
| Auth guard | deleted user with valid session cookie → 401 |
| Match list | deleted candidate excluded (mock profile with deleted user) |
| Analytics | `account.deleted` with empty properties before txn |
| UI unit | `delete-account-section.spec.tsx` — requires DELETE, calls API |
| UI legal | privacy/terms render draft footer |
| Landing | footer links present |
| Account page | links to privacy, terms, notification anchor |
| Regression | full `npm test` dating-api + dating-ui |

**Manual smoke:** story file steps 1–3.

---

## Open questions / blockers

- None blocking agent 1.

**Product note:** Legal copy is **draft** — footer marker mandatory until ops legal review.

---

## Next agent

```text
--agent 1 sprint 9 story 5
```

**Notes for next agent:**

1. Run `prisma migrate dev` for `User.deletedAt` first.
2. Implement `MeAccountService.deleteAccountForUser` with transaction order in §4–§6.
3. Add `revokeAllSessionsForUser` + `disconnectByUserId` before wiring controller cookie clear.
4. Install `react-markdown`; keep legal markdown in `dating-ui/content/legal/`.
5. Wire account settings delete → redirect landing; verify notification link `#notification-prefs`.
6. Manual smoke: re-login same Google → **new** user (not 403 on old row).
