# Load smoke — WebSocket messaging (Story 6)

Lightweight manual check; not a full benchmark.

## Prerequisites

- API running with valid session pepper and test users.
- Optional: `REDIS_URL` + two API instances for multi-instance step.

## Procedure

1. Start the API (`npm run start:dev` or deployed env).
2. Log in as user A and user B (mutual conversation).
3. Open **N = 20** browser tabs or scripted `socket.io-client` connections with valid session cookies on `/ws/messaging`.
4. From user A, `POST` a message via REST.
5. Confirm user B’s connected socket(s) receive exactly one `message.new` per send.
6. Optionally compare CPU/memory vs Sprint 3 `poll` mode on the conversation page (polling removed when `ws`).

## Multi-instance (local)

```bash
# Terminal 1
REDIS_URL=redis://127.0.0.1:6379 PORT=3001 npm run start:dev

# Terminal 2
REDIS_URL=redis://127.0.0.1:6379 PORT=3002 npm run start:dev
```

Connect B to port 3002, send message via REST on port 3001 — B should still receive the event.

## Pass criteria

- No duplicate `message.new` per message id on a single client.
- No unauthenticated sockets staying connected after handshake.
- Rate limit disconnects after >30 inbound events/minute per user (abuse test).
