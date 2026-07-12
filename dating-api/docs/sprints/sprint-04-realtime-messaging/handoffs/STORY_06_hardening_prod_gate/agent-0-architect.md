# Handoff: Agent 0 — Architect — Story 6

**Agent:** 0 architect  
**Story:** [STORY_06_hardening_prod_gate.md](../../STORY_06_hardening_prod_gate.md)  
**Sprint:** sprint-04-realtime-messaging  
**Date:** 2026-06-03  
**Status:** complete  

---

## Summary

- **Inbound `conversation.subscribe` / `conversation.unsubscribe`** — first client→server events; authz via **`MeConversationsService.assertActiveConversationParticipant`** (same semantics as REST).
- **Per-user inbound rate limit** — in-memory bucket (same pattern as Sprint 3 `ConversationMessageRateLimitService`); separate constants from REST message send.
- **Session lifecycle** — periodic re-validation on each socket **plus** disconnect all sockets for `sessionId` on `AuthService.logout` / revoke.
- **Multi-instance** — optional **`REDIS_URL`** → `@socket.io/redis-adapter` on custom `RedisIoAdapter`; when unset, document **single-instance** constraint.
- **Origin/CORS** — already shipped (`messaging-ws-cors.ts` mirrors HTTP); add regression test for disallowed origin.
- **Prod gate** — deployment checklist + UI flag `NEXT_PUBLIC_REALTIME=ws`; no forced prod flip in code.
- **Observability** — new error codes for subscribe, rate limit, session invalidation, optional connection gauge in traces.

**Push model unchanged:** server still emits only via `RealtimePublisher` to `user:<userId>` after REST `POST`. Subscribe is authz + future-proofing, not required for delivery today.

---

## Artifacts

| Path | Change |
|------|--------|
| `dating-api/package.json` | add `@socket.io/redis-adapter`, `redis` (or `ioredis`) |
| `dating-api/src/main.ts` | `RedisIoAdapter` when `REDIS_URL` set |
| `dating-api/src/messaging-realtime/redis-io.adapter.ts` | created — extends `IoAdapter`, wires Redis adapter |
| `dating-api/src/messaging-realtime/messaging.gateway.ts` | `@SubscribeMessage` subscribe/unsubscribe; session timer |
| `dating-api/src/messaging-realtime/messaging-ws-rate-limit.service.ts` | created — per-user inbound limit |
| `dating-api/src/messaging-realtime/messaging-socket-registry.service.ts` | created — sessionId → sockets |
| `dating-api/src/messaging-realtime/messaging-ws-session.service.ts` | created — `validateSessionById(sessionId)` |
| `dating-api/src/messaging-realtime/messaging-realtime.constants.ts` | client event names |
| `dating-api/src/messaging-realtime/messaging-realtime.module.ts` | import `forwardRef(() => MeProfileModule)`; export registry |
| `dating-api/src/me-profile/me-profile.module.ts` | `forwardRef` + **export `MeConversationsService`** |
| `dating-api/src/auth/auth.service.ts` | on logout → `registry.disconnectBySessionId` |
| `dating-api/src/logging/error-codes.ts` | subscribe / rate / session codes |
| `dating-api/src/messaging-realtime/*.spec.ts` | unit + integration extensions |
| `dating-ui/src/hooks/use-messaging-socket.ts` | emit subscribe/unsubscribe when `conversationId` set |
| `dating-ui/src/lib/messaging-socket.ts` | export event name constants (optional) |
| `dating-api/docs/sprints/.../PROD_REALTIME.md` | created — prod gate checklist (optional) |
| `README.md` (sprint-04) | Redis / single-instance ops notes |

**No Prisma migration.**

---

## Decisions (do not reverse without discussion)

### 1. Subscribe authz — add inbound events (deferred since Story 1)

Stories 1–5 use **`user:<userId>` rooms only**; clients filter `message.new` by `conversationId`. Story 6 AC still requires participant verification on “subscribe”.

| Approach | Verdict |
|----------|---------|
| Conversation rooms + join | Rejected for now — emit path stays `user:<id>` |
| Client `conversation.subscribe` + server authz | **Chosen** — minimal surface, testable |
| No inbound events; document emit-only security | Rejected — fails Story 6 AC / tests |

**Wire (client → server):**

| Event | Payload | Success | Failure |
|-------|---------|---------|---------|
| `conversation.subscribe` | `{ conversationId: string }` | `subscribe.ok` `{ conversationId }` | `subscribe.denied` `{ conversationId, reason }` |
| `conversation.unsubscribe` | `{ conversationId: string }` | (no ack required) | rate-limited only |

**Handler (gateway):**

```typescript
@SubscribeMessage('conversation.subscribe')
async onSubscribe(
  client: Socket,
  payload: { conversationId?: string },
): Promise<void> {
  const data = client.data as MessagingSocketData;
  this.rateLimit.assertCanReceive(data.userId);
  const conversationId = payload?.conversationId?.trim();
  if (!conversationId) {
    client.emit('subscribe.denied', { conversationId: '', reason: 'invalid' });
    return;
  }
  try {
    await this.conversations.assertActiveConversationParticipant(
      data.userId,
      conversationId,
    );
  } catch {
    this.obs.trace(
      `messaging ws subscribe denied userId=${data.userId} conversationId=${conversationId}`,
      ErrorCodes.MESSAGING_WS_SUBSCRIBE_DENIED,
    );
    client.emit('subscribe.denied', { conversationId, reason: 'forbidden' });
    return;
  }
  const set = getSubscribedIds(client);
  set.add(conversationId);
  this.obs.trace(
    `messaging ws subscribe ok userId=${data.userId} conversationId=${conversationId}`,
    ErrorCodes.MESSAGING_WS_SUBSCRIBE_OK,
  );
  client.emit('subscribe.ok', { conversationId });
}
```

Store subscribed ids on `client.data.subscribedConversationIds: Set<string>` (for debugging/metrics; not used for emit routing).

**Do not** `client.join('conversation:…')` in Story 6 unless product later needs room-scoped emits — keeps Story 2 publisher unchanged.

### 2. Reuse `assertActiveConversationParticipant` — no duplicate Prisma query

Inject `MeConversationsService` into gateway.

**Circular DI:** `MeProfileModule` imports `MessagingRealtimeModule`; gateway needs `MeConversationsService`.

**Fix:**

```typescript
// me-profile.module.ts
imports: [forwardRef(() => MessagingRealtimeModule)],
exports: [MeConversationsService, MeMatchesService],

// messaging-realtime.module.ts
imports: [
  forwardRef(() => MeProfileModule),
  SessionModule,
  UsersModule,
  AuthSessionConfigModule,
],
```

Forbidden → `subscribe.denied` (not 404 over the wire). Log `MESSAGING_WS_SUBSCRIBE_DENIED`.

### 3. UI — emit subscribe on detail route only

| Page | Subscribe |
|------|-----------|
| `/dating/conversations/[id]` | `conversation.subscribe` on mount; `conversation.unsubscribe` on cleanup |
| `/dating/conversations` (list) | **No subscribe** — list only listens on `user:<id>` |

In `useMessagingSocket`, when `conversationId` is set and socket connects:

```typescript
socket.emit('conversation.subscribe', { conversationId });
// return cleanup: socket.emit('conversation.unsubscribe', { conversationId });
```

List mode (`conversationId` omitted) — unchanged.

Optional: treat `subscribe.denied` as non-fatal trace in dev; user still has REST.

### 4. Per-user inbound rate limit

Mirror Sprint 3 in-memory bucket (`ConversationMessageRateLimitService`):

```typescript
export const WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW = 30;
export const WS_INBOUND_RATE_LIMIT_WINDOW_MS = 60_000;
```

| REST (Sprint 3) | WS inbound (Story 6) |
|-----------------|----------------------|
| 10 sends / 60s | 30 events / 60s (subscribe + unsubscribe + future) |

On exceed: disconnect socket **`true`** (hard stop) or emit error then ignore — **prefer disconnect + log `MESSAGING_WS_RATE_LIMITED`** (abuse signal).

`assertCanReceive(userId)` at start of every `@SubscribeMessage` handler.

**Not shared across API instances** (same limitation as Sprint 3 message limit — document).

### 5. Session lifecycle

**A. Periodic re-validation (required)**

After successful connect, start interval on socket (e.g. **60s**):

```typescript
const valid = await this.wsSession.isSessionActive(data.sessionId);
if (!valid) {
  this.obs.trace(
    `messaging ws session invalid userId=${data.userId} sessionId=${data.sessionId}`,
    ErrorCodes.MESSAGING_WS_SESSION_INVALIDATED,
  );
  client.disconnect(true);
}
```

Add `MessagingWsSessionService.isSessionActive(sessionId)`:

```typescript
const row = await prisma.userSession.findUnique({ where: { id: sessionId } });
return row && row.revokedAt == null && row.expiresAt > new Date();
```

Clear interval on `handleDisconnect`.

**B. Logout hook (required for instant disconnect)**

`MessagingSocketRegistry`:

- `register(client)` on connect (key `sessionId`)
- `unregister(client)` on disconnect
- `disconnectBySessionId(sessionId)` — iterate and `disconnect(true)`

`AuthService.logout` after `revokeSession`:

```typescript
this.socketRegistry.disconnectBySessionId(validated.sessionId);
```

Inject registry into `AuthModule` via `MessagingRealtimeModule` export (avoid Auth → Gateway circular: registry is standalone `@Injectable()`).

**Cookie re-check on reconnect:** handshake already re-validates; sufficient with (A)+(B).

### 6. Multi-instance — Redis adapter optional

When `process.env.REDIS_URL` is set:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor = createAdapter;

  async connectToRedis(): Promise<void> {
    const url = process.env.REDIS_URL?.trim();
    if (!url) return;
    const pubClient = createClient({ url });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
```

```typescript
// main.ts
const wsAdapter = new RedisIoAdapter(app);
await wsAdapter.connectToRedis();
app.useWebSocketAdapter(wsAdapter);
if (!process.env.REDIS_URL?.trim()) {
  logger.warn('REDIS_URL unset — socket.io single-instance mode; scale-out requires Redis adapter');
}
```

**`RealtimePublisher` unchanged** — `namespace.to(userRoom).emit` fans out via adapter automatically.

**Single-instance alternative (if Redis deferred):** Document in `PROD_REALTIME.md`:

- Run **one** API replica for WS, **or**
- LB **sticky sessions** by cookie (fragile); cross-instance emit **will not** reach users on other nodes.

**Verdict:** Implement Redis adapter behind env var; document fallback.

### 7. Origin / CORS — verify, do not rewrite

`messaging-ws-cors.ts` already mirrors `main.ts` (`CORS_ORIGIN`, local dev regex, `credentials: true`).

Story 6:

- [ ] Integration/unit test: handshake from disallowed origin rejected (socket not authenticated / disconnected).
- [ ] Ensure prod `CORS_ORIGIN` lists UI origin(s).

**Do not** widen `!origin` allow in production — keep current dev behavior (no origin → allow) only if needed for non-browser clients; document.

### 8. Observability

Add to `error-codes.ts`:

```typescript
MESSAGING_WS_SUBSCRIBE_OK: 'MESSAGING_WS_SUBSCRIBE_OK',
MESSAGING_WS_SUBSCRIBE_DENIED: 'MESSAGING_WS_SUBSCRIBE_DENIED',
MESSAGING_WS_RATE_LIMITED: 'MESSAGING_WS_RATE_LIMITED',
MESSAGING_WS_SESSION_INVALIDATED: 'MESSAGING_WS_SESSION_INVALIDATED',
```

Existing: `MESSAGING_WS_CONNECT_OK`, `MESSAGING_WS_DISCONNECT_OK`, `MESSAGING_WS_AUTH_FAILED`.

**Connection counts (lightweight):** on connect/disconnect, trace aggregate:

`messaging ws connections active=N` (registry size) — optional, not a metric backend.

### 9. Prod gate (operator checklist)

Create `PROD_REALTIME.md` (or section in sprint README):

| Gate | Requirement |
|------|-------------|
| UI flag | `NEXT_PUBLIC_REALTIME=ws` in prod UI env when rolling out |
| Same-origin | UI proxies `/socket.io` and `/api` (or shared parent domain + `CORS_ORIGIN`) |
| Session | `SESSION_SECRET_PEPPER` set; cookie `Secure` in prod |
| CORS | `CORS_ORIGIN` includes production UI URL |
| Scale | `REDIS_URL` set if API replicas > 1 |
| Rollback | Set `NEXT_PUBLIC_REALTIME=poll` (no deploy API rollback) |
| Smoke | Stories 1–5 manual smoke pass |

**Do not** auto-set `ws` in code — env-only.

### 10. Load smoke (documented, not full benchmark)

**Script / manual procedure** (Agent 1 adds `docs/.../LOAD_SMOKE_WS.md` or section in story):

1. Start API (+ Redis if testing multi-instance).
2. Connect **N=20** `socket.io-client` sessions (distinct users or shared test users).
3. `POST` message via REST from user A.
4. Assert all recipient sockets receive exactly one `message.new`.
5. Compare rough CPU vs Sprint 3 polling (optional note — “polling removed on detail route”).

Automated: extend `messaging-realtime-ws.integration.spec.ts` with 2 clients + Redis skip if no `REDIS_URL` in CI.

**Out of scope:** k6 suite, autoscaling policy.

---

## Prisma schema

**No changes.**

---

## API / wire contract

### New client → server events

| Event | Payload |
|-------|---------|
| `conversation.subscribe` | `{ conversationId: string }` |
| `conversation.unsubscribe` | `{ conversationId: string }` |

### New server → client events

| Event | Payload |
|-------|---------|
| `subscribe.ok` | `{ conversationId: string }` |
| `subscribe.denied` | `{ conversationId: string, reason: 'forbidden' \| 'invalid' }` |

### Unchanged

| Event | Direction | Notes |
|-------|-----------|-------|
| `message.new` | server → client | Still via `RealtimePublisher` after REST send |

---

## UI contract

| Mode | Story 6 change |
|------|----------------|
| `ws` + detail | emit subscribe/unsubscribe around thread lifecycle |
| `ws` + list | no subscribe |
| `poll` | unchanged |

---

## Test plan (for Agent 2)

### Unit — `messaging-ws-rate-limit.service.spec.ts`

| Case | Expected |
|------|----------|
| Under limit | passes |
| At limit | throws / signals disconnect |
| Window reset | allows again |

### Unit — `messaging.gateway.spec.ts`

| Case | Expected |
|------|----------|
| subscribe valid participant | `subscribe.ok`, trace OK |
| subscribe non-participant | `subscribe.denied`, no throw |
| subscribe invalid payload | `subscribe.denied` reason invalid |
| rate limit exceeded | disconnect + `MESSAGING_WS_RATE_LIMITED` |
| session timer invalid | disconnect + `MESSAGING_WS_SESSION_INVALIDATED` |

### Unit — `messaging-socket-registry.spec.ts`

| Case | Expected |
|------|----------|
| disconnectBySessionId | all registered sockets disconnected |

### Unit — `auth.service.spec.ts` (extend)

| Case | Expected |
|------|----------|
| logout | registry `disconnectBySessionId` called |

### Integration — `messaging-realtime-ws.integration.spec.ts`

| Case | Expected |
|------|----------|
| subscribe forbidden conversation | `subscribe.denied` |
| subscribe allowed | `subscribe.ok` |
| flood subscribe | rate limited |
| (optional, local only) `REDIS_URL` two-process fan-out | skip in CI without Redis |

### CORS

| Case | Expected |
|------|----------|
| Disallowed `Origin` header | connection not established as authenticated user |

### UI — `use-messaging-socket.spec.ts`

| Case | Expected |
|------|----------|
| with `conversationId` | emits `conversation.subscribe` on connect; unsubscribe on unmount |

---

## Manual smoke

1. Non-participant emits `conversation.subscribe` for another user's thread → `subscribe.denied`  
2. Flood subscribe/unsubscribe (>30/min) → socket disconnects, log rate limit  
3. Log out → socket disconnects within seconds (registry), reconnect fails auth  
4. Revoked session (DB) → periodic check disconnects within ~60s  
5. `REDIS_URL` set, two API processes, user on B, send on A → `message.new` received  
6. Prod checklist: `CORS_ORIGIN`, `NEXT_PUBLIC_REALTIME=ws`, proxy `/socket.io`

---

## Tests / verification

- [ ] Command run: N/A (design only)
- [ ] Result: not run (architect)

---

## Open questions / blockers

1. **Redis in CI** — default skip multi-instance test; run locally with Docker Redis.
2. **Rate limit disconnect vs soft reject** — disconnect chosen for abuse; revisit if UX issues.
3. **Instant logout** — requires `AuthService` → registry wiring; periodic alone is insufficient for AC.
4. **List + detail two sockets** — subscribe only on detail; acceptable (Story 5).

---

## Next agent

```text
--agent 1 sprint 4 story 6
```

**Notes for Agent 1:**

1. Implement subscribe/unsubscribe handlers + UI emits on detail route.
2. Add rate limit, session service, socket registry, logout disconnect.
3. Add `RedisIoAdapter` behind `REDIS_URL`.
4. Extend error codes and tests per plan.
5. Add prod checklist doc; do not enable `ws` in prod automatically.
6. CORS: add test only unless gap found in review.
