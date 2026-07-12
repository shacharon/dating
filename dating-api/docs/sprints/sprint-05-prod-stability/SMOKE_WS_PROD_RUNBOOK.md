# WebSocket prod smoke runbook — Sprint 5 Story 1

Two-tier gate before enabling `NEXT_PUBLIC_REALTIME=ws` in staging/production.

| Tier | Owner | Command / doc |
|------|-------|----------------|
| **A — Automated** | CI / dev | `npm run smoke:ws` + optional preflight script |
| **B — Browser** | Operator | Checklist below + [PROD_STABILITY.md](./PROD_STABILITY.md) sign-off |

See also: [Sprint 4 PROD_REALTIME.md](../sprint-04-realtime-messaging/PROD_REALTIME.md)

---

## Tier A — Automated regression

### 1. WS integration specs

From `dating-api/`:

```bash
npm run smoke:ws
```

Runs:

- `src/messaging-realtime/messaging-realtime-ws.integration.spec.ts` — auth, subscribe denied, rate limit
- `src/me-profile/me-conversation-messages-ws.integration.spec.ts` — REST send → `message.new`

**Pass:** all tests green.

### 2. Deploy preflight (optional, against running API)

With API running (local or staging):

```bash
# default http://localhost:3001
npm run smoke:ws-preflight

# staging
SMOKE_BASE_URL=https://api.staging.example.com npm run smoke:ws-preflight
```

**Pass:** exit code 0; JSON includes `messaging.namespace`, `messaging.socketIoPath`, `messaging.sessionCookieName`.

Expected shape:

```json
{
  "ok": true,
  "service": "dating-api",
  "ts": "2026-06-03T...",
  "messaging": {
    "namespace": "/ws/messaging",
    "socketIoPath": "/socket.io",
    "redisAdapter": false,
    "sessionCookieName": "dating_session"
  }
}
```

`redisAdapter: true` only when `REDIS_URL` was set at API boot.

---

## Preflight — environment

| Variable | Where | Requirement |
|----------|--------|-------------|
| `NEXT_PUBLIC_REALTIME` | UI **build** env | Set to `ws` after this gate passes (requires UI redeploy) |
| `SESSION_SECRET_PEPPER` | API | Non-empty |
| `CORS_ORIGIN` | API | Includes UI origin |
| `REDIS_URL` | API | Required when API replicas > 1 |
| Cookie `Secure` | API auth config | `true` in production |
| `API_PROXY_TARGET` | UI server | Points to API when UI/API are separate |

### Preferred networking topology

```text
Browser → UI host (Next.js)
           ├─ /api/*        → rewrite → API
           └─ /socket.io/*  → rewrite → API
```

**Do not** point `NEXT_PUBLIC_API_URL` at a different host unless cookie domain is aligned — `SameSite=Lax` cookies may not reach the WS handshake.

Reference: `dating-ui/next.config.ts`

---

## Tier B — Manual browser checklist

Use two test accounts with an **active mutual match** and conversation.

Set `NEXT_PUBLIC_REALTIME=ws` in UI env and **rebuild/redeploy UI** before testing.

### Step 1 — WS 101 + cookie

1. Log in at the UI origin.
2. Open DevTools → **Network** → filter **WS**.
3. Open a conversation (or conversations list with WS mode).
4. Confirm connection to `/socket.io` with namespace `/ws/messaging`, status **101 Switching Protocols**.
5. Request headers include session cookie (e.g. `dating_session=...`).

**Expected log:** `MESSAGING_WS_CONNECT_OK`

### Step 2 — Near-instant message

1. Log in as User A and User B (two browsers or profiles).
2. Both open the same conversation.
3. User A sends a message.
4. User B sees it within **~1s** (not 3s poll interval).

**Expected:** `message.new` event in WS frames or UI append without poll.

### Step 3 — Reconnect + catch-up

1. On User B tab: DevTools → Network → **Offline** (or disable Wi‑Fi briefly).
2. User A sends another message while B is offline.
3. Restore network.
4. Confirm **Reconnecting…** banner (if shown) then missed message appears.

### Step 4 — Rollback drill

1. Set `NEXT_PUBLIC_REALTIME=poll`, rebuild/redeploy UI.
2. Open conversation → Network tab shows periodic `GET .../messages?after=` (~3s).
3. Restore `ws` when done.

### Step 5 — Non-participant subscribe denied

Using devtools console on an authenticated socket (or integration test client):

```javascript
// Must be logged in; socket from app or:
const { io } = await import('https://cdn.socket.io/4.8.1/socket.io.esm.min.js');
const s = io('/ws/messaging', { path: '/socket.io', withCredentials: true });
s.emit('conversation.subscribe', { conversationId: 'not-your-conversation-id' });
s.on('subscribe.denied', (p) => console.log('denied', p));
```

**Expected log:** `MESSAGING_WS_SUBSCRIBE_DENIED`

### Step 6 — Logout disconnects socket

1. With WS connected, log out.
2. WS connection closes; reconnect without cookie fails.

**Expected logs:** `MESSAGING_WS_DISCONNECT_OK`, then `MESSAGING_WS_AUTH_FAILED` on bad reconnect.

### Step 7 — Live unread (optional)

1. User B on `/dating/conversations` list (not inside thread).
2. User A sends message.
3. Unread badge on list updates without navigation.

---

## Multi-instance appendix (conditional)

**Run only if** staging/prod has `REDIS_URL` + ≥2 API replicas behind a load balancer.

1. User B connected (via LB — may land on replica 2).
2. `POST` message via REST (may hit replica 1).
3. User B receives `message.new`.

Local repro: see [LOAD_SMOKE_WS.md](../sprint-04-realtime-messaging/LOAD_SMOKE_WS.md).

If single replica: mark checklist row 8 **N/A** in [PROD_STABILITY.md](./PROD_STABILITY.md).

---

## Flag flip procedure

### Staging

1. Deploy API (Sprint 4 realtime code).
2. `npm run smoke:ws` green.
3. Tier B checklist on staging with `NEXT_PUBLIC_REALTIME=ws`.
4. Leave staging on `ws` if pass.

### Production

1. Tier B on prod (or accept staging sign-off + prod steps 1–6).
2. Set `NEXT_PUBLIC_REALTIME=ws` on **UI deployment** → rebuild/redeploy UI.
3. Monitor structured logs 24h: `MESSAGING_WS_CONNECT_OK`, `MESSAGING_WS_AUTH_FAILED`, `MESSAGING_WS_SUBSCRIBE_DENIED`.

### Rollback

Set `NEXT_PUBLIC_REALTIME=poll` on UI → rebuild/redeploy UI only. No API deploy required.

---

## Log codes reference

| Code | When |
|------|------|
| `MESSAGING_WS_CONNECT_OK` | Valid session cookie connect |
| `MESSAGING_WS_AUTH_FAILED` | Missing/invalid cookie |
| `MESSAGING_WS_DISCONNECT_OK` | Disconnect / logout |
| `MESSAGING_WS_SUBSCRIBE_OK` | Participant subscribe |
| `MESSAGING_WS_SUBSCRIBE_DENIED` | Non-participant subscribe |
| `MESSAGING_WS_RATE_LIMITED` | Inbound flood (Story 6) |

---

## Sign-off

Record results in [PROD_STABILITY.md](./PROD_STABILITY.md) checklist and PM handoff (Agent 3).
