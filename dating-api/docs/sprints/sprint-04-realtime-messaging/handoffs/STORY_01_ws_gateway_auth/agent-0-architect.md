# Handoff: Agent 0 — Architect — Story 1

**Agent:** 0 architect  
**Story:** [STORY_01_ws_gateway_auth.md](../../STORY_01_ws_gateway_auth.md)  
**Sprint:** sprint-04-realtime-messaging  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **No Prisma migration** — WebSocket layer only; REST messaging unchanged.
- **Transport:** socket.io via `@nestjs/platform-socket.io`; namespace **`/ws/messaging`**; engine path **`/socket.io`** (default).
- **Auth:** Reuse HttpOnly session cookie on the socket.io **handshake** (`parseCookieHeader` + `SessionService.validateSessionToken` + active user check — same rules as `AuthGuard`).
- **Rooms:** On connect, socket joins **`user:<userId>`** only. No conversation rooms in Story 1.
- **`RealtimePublisher`** — thin injectable service bound to the namespace `Server` in `afterInit`; Story 2 emits through it; Story 6 can add Redis adapter without changing call sites.
- **Next proxy:** Add rewrite for **`/socket.io/*`** (not only `/api/*`) so same-origin browser connects with cookies.
- **Story 1 scope:** Gateway + auth + publisher skeleton + tests. **No `message.new` emit.** **No conversation-page polling removal** (Story 3). Optional: install `socket.io-client` + export `createMessagingSocket()` factory; do **not** wire the conversation page yet.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/package.json` | add `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` |
| `dating-api/src/main.ts` | `app.useWebSocketAdapter(new IoAdapter(app))` |
| `dating-api/src/messaging-realtime/messaging-realtime.module.ts` | created |
| `dating-api/src/messaging-realtime/messaging.gateway.ts` | created — connect/disconnect, room join |
| `dating-api/src/messaging-realtime/messaging-ws-auth.service.ts` | created — handshake validation |
| `dating-api/src/messaging-realtime/realtime-publisher.service.ts` | created — `publishToUser(s)` stub |
| `dating-api/src/messaging-realtime/messaging-realtime.constants.ts` | created — namespace, room prefix |
| `dating-api/src/messaging-realtime/messaging-ws-auth.service.spec.ts` | created (agent 2) |
| `dating-api/src/messaging-realtime/messaging.gateway.spec.ts` | created (agent 2) |
| `dating-api/src/app.module.ts` | import `MessagingRealtimeModule` |
| `dating-api/src/logging/error-codes.ts` | add WS connect/disconnect/auth codes |
| `dating-ui/package.json` | add `socket.io-client` (used Story 3; install Story 1) |
| `dating-ui/next.config.ts` | rewrite `/socket.io/:path*` → API |
| `dating-ui/src/lib/messaging-socket.ts` | created — `createMessagingSocket()` factory only (no page wiring) |

---

## Decisions (do not reverse without discussion)

### 1. Module placement — `MessagingRealtimeModule` (not inside `MeProfileModule`)

New top-level folder `src/messaging-realtime/` imported by `AppModule`. Keeps me-profile HTTP-focused; Story 2 injects `RealtimePublisher` into `MeConversationMessagesService` via module export.

```typescript
@Module({
  imports: [SessionModule, UsersModule, AuthSessionConfigModule, StructuredLoggingModule],
  providers: [MessagingGateway, MessagingWsAuthService, RealtimePublisher],
  exports: [RealtimePublisher],
})
export class MessagingRealtimeModule {}
```

`MeProfileModule` imports `MessagingRealtimeModule` when Story 2 wires emit (Story 1 may export publisher only; Story 2 adds import to me-profile).

**Story 1:** `MessagingRealtimeModule` + `AppModule` import is enough; me-profile import optional until Story 2.

### 2. socket.io paths (critical for Next proxy)

| Piece | Value |
|-------|--------|
| Engine HTTP path | `/socket.io` (default) |
| Namespace | `/ws/messaging` |
| Browser URL (same-origin) | `http://localhost:3000` + path `/socket.io` + namespace `/ws/messaging` |

**Next rewrite (add alongside existing `/api` rewrite):**

```typescript
{
  source: '/socket.io/:path*',
  destination: `${apiProxyTarget}/socket.io/:path*`,
},
```

Without this, the UI on `:3000` cannot reach the API socket.io engine on `:3001` when using same-origin mode (`getApiBase() === ''`).

### 3. Handshake auth — mirror `AuthGuard` semantics

Do **not** use `@UseGuards(AuthGuard)` on the gateway (HTTP guard does not apply to WS the same way). Extract validation into `MessagingWsAuthService`:

```typescript
export type MessagingSocketData = {
  userId: string;
  sessionId: string;
};

export type WsAuthResult =
  | { ok: true; userId: string; sessionId: string }
  | { ok: false; reason: 'missing_cookie' | 'invalid_session' | 'user_not_found' | 'user_disabled' };

async validateHandshake(cookieHeader: string | undefined): Promise<WsAuthResult>
```

**Steps (same as HTTP guard):**

1. `parseCookieHeader(cookieHeader)[sessionCookieName]` — reuse `auth-cookies.util.parseCookieHeader` (not Express `req.cookies`; handshake has raw header string).
2. `SessionService.validateSessionToken(raw)` → `ValidatedSession | null`.
3. `UsersService.findById(userId)` → must exist and `status === ACTIVE` (use same `USER_STATUS_ACTIVE` / forbidden semantics as HTTP; WS: disconnect, do not leave socket in limbo).
4. On success: attach `userId` / `sessionId` to `client.data`; `client.join(userRoom(userId))`.

**Reject:** `client.disconnect(true)` immediately; log `MESSAGING_WS_AUTH_FAILED` with reason (no raw token in logs).

**Cookie name:** `AuthSessionConfigService.sessionCookieName` (default `dating_session`).

### 4. Room naming

```typescript
export const MESSAGING_WS_NAMESPACE = '/ws/messaging';
export const USER_ROOM_PREFIX = 'user:';

export function userRoom(userId: string): string {
  return `${USER_ROOM_PREFIX}${userId}`;
}
```

Story 2 publishes with `realtimePublisher.publishToUsers([senderId, recipientId], 'message.new', payload)`.

**No `conversation:<id>` rooms in Story 1–2** — client filters events by `conversationId` in payload. Conversation subscribe authz is Story 6.

### 5. `RealtimePublisher` — bind in `afterInit`

Avoid circular DI gateway ↔ publisher:

```typescript
@Injectable()
export class RealtimePublisher {
  private namespaceServer: Namespace | null = null;

  bindNamespaceServer(server: Namespace): void {
    this.namespaceServer = server;
  }

  publishToUser(userId: string, event: string, payload: unknown): void {
    this.namespaceServer?.to(userRoom(userId)).emit(event, payload);
  }

  publishToUsers(userIds: string[], event: string, payload: unknown): void {
    for (const id of userIds) {
      this.publishToUser(id, event, payload);
    }
  }
}
```

```typescript
@WebSocketGateway({ namespace: MESSAGING_WS_NAMESPACE, ... })
export class MessagingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  afterInit(): void {
    this.publisher.bindNamespaceServer(this.server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const result = await this.wsAuth.validateHandshake(
      client.handshake.headers.cookie,
    );
    if (!result.ok) {
      this.obs.trace(/* auth fail */, MESSAGING_WS_AUTH_FAILED);
      client.disconnect(true);
      return;
    }
    client.data = { userId: result.userId, sessionId: result.sessionId } satisfies MessagingSocketData;
    await client.join(userRoom(result.userId));
    mergeRequestLogContext?. optional: generate connect requestId
    this.obs.trace(/* connect ok */, MESSAGING_WS_CONNECT_OK);
  }

  handleDisconnect(client: Socket): void {
    const data = client.data as MessagingSocketData | undefined;
    this.obs.trace(/* disconnect */, MESSAGING_WS_DISCONNECT_OK);
  }
}
```

Story 1: `publishToUser` may be unused until Story 2 — still implement and unit-test bind.

### 6. CORS on the gateway

Mirror HTTP `enableCors` intent: **credentials: true**, allow origins from `AuthSessionConfigService.corsOrigin` + local dev regex (extract shared helper or duplicate minimally).

```typescript
@WebSocketGateway({
  namespace: MESSAGING_WS_NAMESPACE,
  cors: {
    origin: /* same allowlist as main.ts */,
    credentials: true,
  },
})
```

**Dev default:** UI `http://localhost:3000` must be allowed.

**Cross-origin warning:** If `NEXT_PUBLIC_API_URL` points directly at `:3001`, the browser opens WS cross-origin; HttpOnly `SameSite=Lax` cookies from UI origin may **not** be sent. **Story 1–4 dev/testing:** use same-origin proxy (`getApiBase() === ''`). Document in README; prod should use same-site proxy or aligned cookie domain.

### 7. `main.ts` adapter

```typescript
import { IoAdapter } from '@nestjs/platform-socket.io';

const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useWebSocketAdapter(new IoAdapter(app));
```

No custom Redis adapter in Story 1.

### 8. Observability

Add to `error-codes.ts`:

```typescript
MESSAGING_WS_CONNECT_OK: 'MESSAGING_WS_CONNECT_OK',
MESSAGING_WS_DISCONNECT_OK: 'MESSAGING_WS_DISCONNECT_OK',
MESSAGING_WS_AUTH_FAILED: 'MESSAGING_WS_AUTH_FAILED',
```

Trace messages (no secrets):

- connect: `messaging ws connect userId=... sessionId=... socketId=...`
- disconnect: `messaging ws disconnect userId=... socketId=...`
- auth fail: `messaging ws auth failed reason=invalid_session` (no cookie value)

Optional: set `requestId` on connect via `runWithRequestLogContext` if easy; not blocking.

### 9. UI in Story 1 — factory only

Install `socket.io-client`. Add:

```typescript
// dating-ui/src/lib/messaging-socket.ts
import { io, type Socket } from 'socket.io-client';
import { getApiBase } from '@/lib/api-base';

const MESSAGING_NAMESPACE = '/ws/messaging';

export function createMessagingSocket(): Socket {
  const base = getApiBase();
  // same-origin: base '' → window.location.origin
  const url = base || (typeof window !== 'undefined' ? window.location.origin : '');
  return io(`${url}${MESSAGING_NAMESPACE}`, {
    path: '/socket.io',
    withCredentials: true,
    autoConnect: false, // Story 3 calls .connect()
  });
}
```

**Do not** import this from `conversations/[id]/page.tsx` in Story 1. Manual smoke: temporary dev-only connect in console or a one-line test harness.

### 10. Session lifecycle (Story 1 minimum)

- **On connect:** full validation (above).
- **On disconnect:** log only.
- **Periodic re-validation / logout disconnect:** Story 6. Story 1 acceptable: invalid session only blocked at connect; reconnect after expiry will fail auth.

### 11. No inbound client events in Story 1

Gateway has **no** `@SubscribeMessage` handlers. Story 6 may add `subscribe:conversation` with authz. Reduces attack surface for Story 1.

---

## Prisma schema

**No changes.**

---

## Migration plan

None.

---

## API / wire contract (Story 1)

No new REST routes. WebSocket only.

| Endpoint | Protocol | Auth |
|----------|----------|------|
| `/socket.io/` (engine) | HTTP upgrade → WS | Session cookie on handshake |
| Namespace `/ws/messaging` | socket.io | After auth, joined `user:<userId>` |

**No server→client events required in Story 1** (Story 2 adds `message.new`).

---

## UI contract (Story 1)

| Item | Story 1 |
|------|---------|
| `createMessagingSocket()` | Export factory; `autoConnect: false` |
| Conversation page | **Unchanged** (polling remains) |
| `NEXT_PUBLIC_REALTIME` flag | Story 3 |

---

## Test plan (for Agent 2)

### Unit — `messaging-ws-auth.service.spec.ts`

| Case | Expected |
|------|----------|
| Valid cookie + active session + active user | `{ ok: true, userId, sessionId }` |
| Missing cookie | `{ ok: false, reason: 'missing_cookie' }` |
| Invalid/expired session | `invalid_session` |
| User not found | `user_not_found` |
| User disabled | `user_disabled` |

### Unit — `messaging.gateway.spec.ts`

| Case | Expected |
|------|----------|
| Valid handshake | `client.join('user:<id>')`, `data.userId` set, connect trace |
| Invalid handshake | `disconnect(true)`, auth-fail trace, no join |
| Disconnect | disconnect trace |

Mock `MessagingWsAuthService`, `RealtimePublisher`, `StructuredObservabilityService`.

### Integration (optional Story 1 / defer Story 2)

- Spin Nest app (or use existing integration harness), `socket.io-client` connect with session cookie from `loginAndCookie()` pattern in `me-profile-http.integration.spec.ts`.
- Expect connection established to namespace `/ws/messaging`.
- No cookie → connection error / disconnect.

### UI

**None in Story 1** (factory untested or trivial export test).

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Next dev proxy for `/socket.io`** — must be verified manually in Story 1 DoD; architect considers it required.
2. **`NEXT_PUBLIC_API_URL` set** — WS may not receive cookies; document; prefer proxy mode for messaging QA.
3. **Multi-instance** — Story 6; Story 1 single-process only.

---

## Next agent

```text
--agent 1 sprint 4 story 1
```

**Notes for next agent:**

1. Add deps + `IoAdapter` in `main.ts`.
2. Implement `MessagingRealtimeModule` + gateway + `MessagingWsAuthService` + `RealtimePublisher`.
3. Add Next rewrite for `/socket.io/:path*`.
4. Add `createMessagingSocket()` in UI (no page wiring).
5. Do **not** emit `message.new` or change conversation polling.
6. Log connect/disconnect/auth-fail with new error codes.
7. After Story 1 PM close, proceed Story 2 (`RealtimePublisher.publishToUsers` from `sendMessage`).
