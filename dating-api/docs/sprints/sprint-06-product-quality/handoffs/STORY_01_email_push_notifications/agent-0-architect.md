# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_email_push_notifications.md](../../STORY_01_email_push_notifications.md)  
**Sprint:** sprint-06-product-quality  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Prisma migration** — add `User.emailNotificationsEnabled Boolean @default(true)` for opt-out (no separate prefs table in v1).
- **Email provider** — **Resend** via thin adapter interface; **`noop`** when `EMAIL_PROVIDER=disabled` (local dev default).
- **New module** — `NotificationsModule` under `src/notifications/`; exported orchestrator `EmailNotificationService`.
- **Mutual match email** — best-effort send to **both users** only when `MutualMatchesService.detectAndCreateMutualMatch` returns **`created: true`** (no re-send on idempotent re-LIKE).
- **New message email** — best-effort to **recipient** after REST persist when recipient has **no active WS connection**; debounced **15 min** per `(conversationId, recipientUserId)` (in-memory, per-process — same limitation as WS rate limit).
- **Unsubscribe** — public `GET /api/v1/notifications/email/unsubscribe?token=...` (HMAC signed); sets `emailNotificationsEnabled = false`.
- **Privacy** — no message body in email; match/message templates use nickname + deep link only.
- **Observability** — structured trace/error codes; failures **non-blocking** (mirror `publishMessageNewBestEffort`). Sentry hook optional if Sprint 5 Story 2 landed; do not block on Sentry.
- **Registry extension** — `MessagingSocketRegistry.hasActiveConnection(userId)` required (today tracks sessionId only).

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/prisma/schema.prisma` | `User.emailNotificationsEnabled` |
| `dating-api/prisma/migrations/*` | forward migration |
| `dating-api/package.json` | add `resend` (prod dependency) |
| `dating-api/.env.example` | email + app URL env vars |
| `dating-api/src/notifications/notifications.module.ts` | created |
| `dating-api/src/notifications/email-notification-config.service.ts` | created |
| `dating-api/src/notifications/email-provider.interface.ts` | created |
| `dating-api/src/notifications/resend-email.provider.ts` | created |
| `dating-api/src/notifications/noop-email.provider.ts` | created |
| `dating-api/src/notifications/email-notification.service.ts` | created — templates + send |
| `dating-api/src/notifications/email-unsubscribe-token.service.ts` | created |
| `dating-api/src/notifications/email-unsubscribe.controller.ts` | created |
| `dating-api/src/notifications/mutual-match-email.service.ts` | created |
| `dating-api/src/notifications/new-message-email.service.ts` | created |
| `dating-api/src/notifications/message-email-debounce.service.ts` | created |
| `dating-api/src/messaging-realtime/messaging-socket-registry.service.ts` | add `hasActiveConnection(userId)` |
| `dating-api/src/messaging-realtime/messaging.gateway.ts` | register/unregister by userId index |
| `dating-api/src/me-profile/mutual-matches.service.ts` | return `{ mutualMatch, created }` |
| `dating-api/src/me-profile/me-match-actions.service.ts` | trigger mutual-match email after txn |
| `dating-api/src/me-profile/me-conversation-messages.service.ts` | trigger new-message email after persist |
| `dating-api/src/me-profile/me-profile.module.ts` | import `NotificationsModule` |
| `dating-api/src/app.module.ts` | import `NotificationsModule` (if not pulled via me-profile) |
| `dating-api/src/logging/error-codes.ts` | email notification codes |
| `dating-api/docs/sprints/sprint-06-product-quality/handoffs/STORY_01_email_push_notifications/agent-1-dev.md` | created by agent 1 |

**No UI changes** in Story 1 (email-only channel).

---

## Decisions (do not reverse without discussion)

### 1. Module placement — `NotificationsModule`

Top-level `src/notifications/`, imported by `MeProfileModule`. **Do not** put email logic inside `MeProfileModule` providers inline.

```typescript
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    MessagingSocketRegistryModule,
  ],
  controllers: [EmailUnsubscribeController],
  providers: [
    EmailNotificationConfigService,
    ResendEmailProvider,
    NoopEmailProvider,
    EmailProviderResolver, // picks resend vs noop from config
    EmailNotificationService,
    EmailUnsubscribeTokenService,
    MutualMatchEmailService,
    NewMessageEmailService,
    MessageEmailDebounceService,
  ],
  exports: [MutualMatchEmailService, NewMessageEmailService],
})
export class NotificationsModule {}
```

`MeProfileModule` imports `NotificationsModule` and injects exported services into match-actions / messages services.

**Do not** import `MeProfileModule` from `NotificationsModule` (avoid circular DI). Load display names via Prisma in notification services.

### 2. Prisma schema change

```prisma
model User {
  // ... existing fields ...
  emailNotificationsEnabled Boolean @default(true)
}
```

**Unsubscribe** sets this to `false`. **No** per-category prefs in v1 (mutual + message share one flag).

**Migration:** additive column with default `true` — no backfill script required.

### 3. Mutual match detect — return `created` flag

Current `upsert` with empty `update` re-triggers on every re-LIKE and cannot distinguish insert vs existing. **Change return type:**

```typescript
export type MutualMatchDetectResult = {
  mutualMatch: MutualMatch;
  /** True only when ACTIVE row was newly created in this call. */
  created: boolean;
};

async detectAndCreateMutualMatch(
  actorUserId: string,
  targetUserId: string,
  tx?: Prisma.TransactionClient,
): Promise<MutualMatchDetectResult | null>;
```

**Logic (inside transaction):**

1. Reverse LIKE check (unchanged) — if not LIKE, return `null`.
2. `findUnique` on `(userId1, userId2)`.
3. If row exists with `status === ACTIVE` → return `{ mutualMatch, created: false }`.
4. If row exists with `status === UNMATCHED` → **Story 1:** treat like create path only if product later reactivates; for now return `{ mutualMatch, created: false }` unless unmatch rematch is implemented (do not email on stale UNMATCHED row).
5. Else `create` ACTIVE row → return `{ mutualMatch, created: true }`.

**Remove `upsert`** for mutual creation — use explicit find + create to preserve idempotency semantics.

**Email trigger:** `MeMatchActionsService.createAction` after transaction commits:

```typescript
if (detectResult?.created) {
  void this.mutualMatchEmail.notifyNewMutualMatchBestEffort(detectResult.mutualMatch);
}
```

Use `void` + best-effort wrapper — **never** fail the LIKE response on email errors.

### 4. Mutual match email — both users

`MutualMatchEmailService.notifyNewMutualMatchBestEffort(match)`:

- Load both users (`email`, `emailNotificationsEnabled`, profile nickname).
- Skip user if `emailNotificationsEnabled === false` or missing email.
- Send two emails (parallel `Promise.allSettled`):
  - To user1: "You matched with {user2 nickname}!"
  - To user2: "You matched with {user1 nickname}!"
- CTA link: `{APP_PUBLIC_URL}/dating/conversations/{match.id}`

**Do not** include photos or profile essays in email body.

### 5. New message email — offline recipient only

After `MeConversationMessagesService.sendMessage` persists and publishes WS:

```typescript
const recipientUserId =
  sessionUserId === match.userId1 ? match.userId2 : match.userId1;

void this.newMessageEmail.maybeNotifyBestEffort({
  conversationId,
  recipientUserId,
  senderUserId: sessionUserId,
  messageId: dto.id,
});
```

**Skip email when:**

| Condition | Reason |
|-----------|--------|
| `recipientUserId === senderUserId` | impossible guard |
| `MessagingSocketRegistry.hasActiveConnection(recipientUserId)` | user online via WS |
| `!user.emailNotificationsEnabled` | unsubscribed |
| debounce active for `(conversationId, recipientUserId)` | max 1 / 15 min |

**Do not** implement "offline > N minutes" in v1 — WS connection check is sufficient; document N-minute fallback as future if users disable WS but keep tab open.

### 6. `MessagingSocketRegistry` — track by userId

Extend registry (keep session map for logout disconnect):

```typescript
private readonly byUserId = new Map<string, Set<Socket>>();

register(client: Socket): void {
  // existing sessionId map...
  const userId = (client.data as MessagingSocketData).userId;
  if (userId) { /* add to byUserId */ }
}

hasActiveConnection(userId: string): boolean {
  const set = this.byUserId.get(userId);
  return !!set && set.size > 0;
}
```

Unregister must remove from both maps. `resetForTests()` clears both.

### 7. Message email debounce

`MessageEmailDebounceService` — in-memory sliding window (mirror `MessagingWsRateLimitService` / `ConversationMessageRateLimitService`):

```typescript
const DEFAULT_DEBOUNCE_MS = 15 * 60 * 1000; // EMAIL_MESSAGE_DEBOUNCE_MINUTES=15

shouldSend(conversationId: string, recipientUserId: string): boolean;
recordSent(conversationId: string, recipientUserId: string): void;
```

Key: `` `${conversationId}:${recipientUserId}` ``. Document: **not shared across API replicas** (same as Sprint 4 inbound rate limit).

### 8. Email provider — Resend + noop

**Env:**

| Variable | Required | Default |
|----------|----------|---------|
| `EMAIL_PROVIDER` | no | `disabled` → noop provider |
| `RESEND_API_KEY` | yes when provider=resend | — |
| `EMAIL_FROM` | yes when sending | e.g. `Piza <notifications@yourdomain.com>` |
| `APP_PUBLIC_URL` | yes for links | e.g. `http://localhost:3000` |
| `EMAIL_UNSUBSCRIBE_SECRET` | yes in prod | HMAC pepper for tokens |
| `EMAIL_MESSAGE_DEBOUNCE_MINUTES` | no | `15` |

**Interface:**

```typescript
export interface EmailProvider {
  send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ id: string | null }>;
}
```

`EmailNotificationService` adds unsubscribe footer link to every transactional email.

**Local dev:** default noop — log structured `EMAIL_SEND_SKIPPED_PROVIDER_DISABLED` at debug/trace level, not error.

### 9. Unsubscribe — signed token, public GET

**Route:** `GET /api/v1/notifications/email/unsubscribe?token=<base64url>`

**Token payload (HMAC-SHA256 with `EMAIL_UNSUBSCRIBE_SECRET`):**

```typescript
{ userId: string; exp: number } // exp = now + 90 days at issue time
```

**Handler:**

1. Verify signature + expiry.
2. `prisma.user.update({ where: { id }, data: { emailNotificationsEnabled: false } })`.
3. Return minimal HTML page: "You have been unsubscribed from Piza email notifications."

**No auth cookie required** — one-click from email.

Issue token at send time via `EmailUnsubscribeTokenService.sign(userId)`.

**Security:** use constant-time compare; do not leak whether userId exists in error messages.

### 10. Email templates (plain + html)

**Mutual match:**

- Subject: `It's a match on Piza!`
- Text: `You matched with {nickname}. Start the conversation: {url}`

**New message:**

- Subject: `New message on Piza`
- Text: `{nickname} sent you a message. Read it here: {url}`

**No message body.** Footer: `Unsubscribe: {unsubscribeUrl}`

### 11. Observability — best-effort, non-blocking

Add to `error-codes.ts`:

```typescript
EMAIL_MUTUAL_MATCH_SEND_OK: 'EMAIL_MUTUAL_MATCH_SEND_OK',
EMAIL_MUTUAL_MATCH_SEND_FAILED: 'EMAIL_MUTUAL_MATCH_SEND_FAILED',
EMAIL_MESSAGE_SEND_OK: 'EMAIL_MESSAGE_SEND_OK',
EMAIL_MESSAGE_SEND_FAILED: 'EMAIL_MESSAGE_SEND_FAILED',
EMAIL_SKIPPED_UNSUBSCRIBED: 'EMAIL_SKIPPED_UNSUBSCRIBED',
EMAIL_SKIPPED_RECIPIENT_ONLINE: 'EMAIL_SKIPPED_RECIPIENT_ONLINE',
EMAIL_SKIPPED_DEBOUNCED: 'EMAIL_SKIPPED_DEBOUNCED',
EMAIL_SKIPPED_PROVIDER_DISABLED: 'EMAIL_SKIPPED_PROVIDER_DISABLED',
EMAIL_UNSUBSCRIBE_OK: 'EMAIL_UNSUBSCRIBE_OK',
EMAIL_UNSUBSCRIBE_INVALID: 'EMAIL_UNSUBSCRIBE_INVALID',
```

Pattern:

```typescript
private async sendBestEffort(...): Promise<void> {
  try {
    await this.provider.send(...);
    this.obs.trace(..., EMAIL_*_OK);
  } catch (err) {
    this.obs.error(..., EMAIL_*_FAILED, err);
    // optional: Sentry.captureException if @sentry/nestjs present — do not import if Story 5.2 not merged
  }
}
```

### 12. `APP_PUBLIC_URL` vs CORS

Use dedicated **`APP_PUBLIC_URL`** for email deep links (UI origin users click). Do not parse `CORS_ORIGIN` — may list multiple origins.

---

## Prisma schema

```prisma
model User {
  id                          String     @id @default(cuid())
  email                       String     @unique
  googleId                    String     @unique
  displayName                 String?
  avatarUrl                   String?
  status                      UserStatus @default(ACTIVE)
  emailNotificationsEnabled   Boolean    @default(true)
  lastLoginAt                 DateTime?
  createdAt                   DateTime   @default(now())
  updatedAt                   DateTime   @updatedAt
  // relations unchanged...
}
```

---

## Migration plan

1. Add column `emailNotificationsEnabled BOOLEAN NOT NULL DEFAULT true` on `"User"`.
2. `npx prisma migrate dev --name user_email_notifications_enabled`
3. Rollback: drop column (safe — no data loss beyond opt-out flags).

---

## API specs

### Unsubscribe (public)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/v1/notifications/email/unsubscribe?token=` | none | `200 text/html` confirmation page |

Invalid/expired token → `400` HTML or plain "Invalid link".

**No new authenticated REST routes** for Story 1.

Existing routes unchanged; LIKE / send message responses unchanged (email is side effect).

---

## Service signatures

```typescript
// mutual-matches.service.ts
export type MutualMatchDetectResult = {
  mutualMatch: MutualMatch;
  created: boolean;
};

// notifications/mutual-match-email.service.ts
@Injectable()
export class MutualMatchEmailService {
  notifyNewMutualMatchBestEffort(match: MutualMatch): Promise<void>;
}

// notifications/new-message-email.service.ts
@Injectable()
export class NewMessageEmailService {
  maybeNotifyBestEffort(params: {
    conversationId: string;
    recipientUserId: string;
    senderUserId: string;
    messageId: string;
  }): Promise<void>;
}

// messaging-socket-registry.service.ts
hasActiveConnection(userId: string): boolean;

// notifications/email-unsubscribe-token.service.ts
sign(userId: string): string;
verify(token: string): { userId: string } | null;
```

---

## UI contract

| Item | Story 1 |
|------|---------|
| UI changes | **None** |
| Deep links | `/dating/conversations/:conversationId` on `APP_PUBLIC_URL` |
| In-app match modal | unchanged (Sprint 2 Story 4) |

---

## Test plan (for Agent 2)

### Unit — `mutual-matches.service.spec.ts` (extend)

| Case | Expected |
|------|----------|
| First mutual create | `created: true` |
| Re-LIKE when ACTIVE exists | `created: false`, no second create |

### Unit — `messaging-socket-registry.spec.ts` (extend or new)

| Case | Expected |
|------|----------|
| register + hasActiveConnection | true |
| unregister | false |

### Unit — `message-email-debounce.service.spec.ts`

| Case | Expected |
|------|----------|
| First send allowed | true |
| Within 15 min window | false |

### Unit — `email-unsubscribe-token.service.spec.ts`

| Case | Expected |
|------|----------|
| sign + verify | userId round-trip |
| tampered token | null |

### Unit — `mutual-match-email.service.spec.ts` / `new-message-email.service.spec.ts`

Mock `EmailProvider` + Prisma — assert send called/skipped per rules.

### Integration — extend `me-profile-http.integration.spec.ts` or new spec

| Case | Expected |
|------|----------|
| Reciprocal LIKE with mock provider | 2 sends (both users) |
| Re-LIKE idempotent | 0 additional sends |
| POST message, recipient offline | 1 send |
| POST message, registry shows recipient online | 0 send |

Use noop provider or jest mock bound in test module.

### Manual smoke

Story file steps 1–4 (requires Resend API key + real inbox).

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Resend domain verification** — operator must configure DNS for `EMAIL_FROM` domain; out of repo scope.
2. **UNMATCHED rematch** — if product adds rematch later, define whether `created: true` on reactivation sends email again (default: yes once on re-ACTIVE).
3. **Sentry** — wire if Sprint 5 Story 2 merged; otherwise structured logs only.
4. **Multi-instance debounce** — in-memory; document same limitation as WS rate limit (Sprint 7 Story 3 pattern if Redis needed later).

---

## Next agent

```text
--agent 1 sprint 6 story 1
```

**Notes for next agent:**

1. Run Prisma migration for `emailNotificationsEnabled`.
2. Implement `NotificationsModule` + Resend/noop providers.
3. Change `detectAndCreateMutualMatch` to return `{ created }` — update all callers/tests.
4. Extend `MessagingSocketRegistry.hasActiveConnection(userId)`.
5. Hook mutual + message emails best-effort after existing business logic.
6. Public unsubscribe GET route + HTML response.
7. Update `.env.example`; default `EMAIL_PROVIDER=disabled` for local dev.
8. Do **not** add SMS, in-app notification center, or message body in emails.
