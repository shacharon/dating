---
name: dating-runtime-verification
description: >-
  Browser and local-dev runtime verification for the dating app — WebSocket,
  Next.js proxy, cookies, migrations. Loaded by architect, dev, and CR agents
  when stories touch realtime, auth transport, or cross-origin setup.
disable-model-invocation: true
---

# Dating App — Runtime / browser verification

Unit tests with mocked `socket.io-client`, `fetch`, or Next proxy **do not** prove real browser behavior. Use this skill whenever a story touches **realtime**, **auth cookies**, **Next rewrites**, or **cross-service transport**.

## When this skill is mandatory

| Signal in story / diff | Why |
|------------------------|-----|
| `socket.io`, WebSocket, SSE, `NEXT_PUBLIC_REALTIME` | Transport can fall back to HTTP polling silently |
| `next.config` rewrites, `/socket.io`, `API_PROXY_TARGET` | Next dev proxy often breaks WS upgrade (`ECONNRESET`) |
| Session cookies + cross-origin API/socket origin | `localhost` ≠ `127.0.0.1` — cookies won't attach |
| Prisma migration + code reading new columns | Local DB without `migrate deploy` → 500 on login |
| Multiple hooks/providers opening the same connection | Duplicate handshakes look like “polling every few seconds” |

---

## Architect — must document in handoff

Add a **Runtime topology** subsection:

1. **Browser target** — same-origin `/api` vs explicit `NEXT_PUBLIC_API_URL`
2. **Socket target** — same as REST or direct API origin (if proxy is unreliable, say so)
3. **Cookie host rule** — socket origin must match UI hostname for credentialed handshake
4. **Connection policy** — one shared socket vs per-page (prefer singleton)
5. **Dev vs prod** — what differs (proxy, ports, env vars)
6. **Expected Network tab** — e.g. `transport=websocket` → **101**; no repeating `transport=polling` every few seconds after connect

**Gate:** If topology is unspecified for a realtime story → architect handoff is **incomplete**.

---

## Dev (agent 1) — must smoke before handoff

Minimum for realtime / auth stories:

- [ ] `npx prisma migrate deploy` (API) if schema changed
- [ ] API + UI dev servers running
- [ ] Happy path in **real browser** (not only terminal curl)
- [ ] DevTools → Network: confirm expected transport (see architect topology)
- [ ] Wait 30s after connect: **no** repeating `socket.io` polling storm
- [ ] Record results in `agent-1-dev.md` under **Tests / verification**

If browser smoke not run, handoff must say **deferred** and list exact operator steps.

---

## Code review (agent 2) — must verify (not only mocks)

### CR gate — realtime / proxy stories

- [ ] Read architect **Runtime topology**; implementation matches it
- [ ] Grep for `vi.mock('socket.io-client')` / `createMessagingSocket` mocks — mocked tests alone are **insufficient** for transport stories
- [ ] Require at least one of:
  - API integration test with real `socket.io-client` to Nest (existing pattern in `*-ws.integration.spec.ts`), or
  - Documented browser Network checklist with pass/fail in CR handoff, or
  - New thin integration test covering socket origin / singleton policy
- [ ] Flag **Critical** if socket goes through Next `/socket.io` rewrite in dev without documented WS upgrade risk
- [ ] Flag **Major** if multiple `useMessagingSocket` / `createMessagingSocket` calls can run concurrently without shared connection
- [ ] Flag **Critical** if migration exists but dev handoff omits `prisma migrate deploy`

### Verdict rule

**Do not approve** realtime stories when:

- Only mocked UI socket tests exist **and**
- No browser/operator Network verification **and**
- Architect topology missing or contradicted by code

Use verdict `fixed` only after transport/topology issues are resolved or explicitly deferred with a tracked follow-up story.

---

## Operator browser checklist (copy into handoffs)

```text
1. Log in on http://localhost:3000
2. Open DevTools → Network → filter "socket.io"
3. Expect: one brief polling handshake, then transport=websocket status 101
4. Wait 30s / send a message: no new polling request every few seconds
5. Socket host: localhost:3001 (direct) or documented prod URL — not stuck on failed proxy
```

---

## Known project defaults (post Sprint 8 fix)

- REST (browser): same-origin `/api/*` → Next rewrite → `127.0.0.1:3001`
- Socket (browser): **direct** `http://<ui-host>:3001/ws/messaging` — bypasses Next WS proxy
- Shared socket: `acquireMessagingSocket()` / `releaseMessagingSocket()` in `dating-ui/src/lib/messaging-socket.ts`
- Realtime flag: `NEXT_PUBLIC_REALTIME=ws` in `dating-ui/.env.local`

Architects should reference these when extending realtime; do not reintroduce per-page sockets or proxy-only socket paths without explicit justification.
