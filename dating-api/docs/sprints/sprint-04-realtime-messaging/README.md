# Sprint 4: Real-time Messaging (WebSocket)

**Epic:** [Mutual Match & Messaging](../../epics/EPIC_MUTUAL_MATCH_MESSAGING.md)  
**Duration:** ~1-1.5 weeks (4 core + 2 optional stories)  
**Goal:** Replace 3s HTTP polling on the conversation route with a WebSocket push channel, while keeping REST (`send` / `history` / `read`) as the source of truth.  
**Status:** **Complete** — 6/6 stories done

---

## Story checklist

| # | Story | Status | Depends on |
|---|--------|--------|------------|
| 1 | [WebSocket gateway + auth](./STORY_01_ws_gateway_auth.md) | Done | Sprint 3 |
| 2 | [Emit message.new on send](./STORY_02_emit_message_new.md) | Done | Story 1 |
| 3 | [UI subscribe on conversation route](./STORY_03_ui_subscribe_conversation.md) | Done | Story 2 |
| 4 | [Reconnect + catch-up](./STORY_04_reconnect_catchup.md) | Done | Story 3 |
| 5 | [Live unread badges on list](./STORY_05_live_unread_badges.md) *(optional)* | Done | Story 2 |
| 6 | [Hardening + prod gate](./STORY_06_hardening_prod_gate.md) *(optional)* | Done | Story 4 |

**Recommended order:** 1 → 2 → 3 → 4 → (5) → (6)

---

## Decisions (locked for this sprint)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Transport | **socket.io** (`@nestjs/platform-socket.io` + `socket.io-client`) | rooms, auto-reconnect/backoff, acks out of the box |
| Auth | **reuse HttpOnly session cookie** on the WS handshake | no new token system; handshake is HTTP → reuse `SessionService.validateSessionToken` |
| Namespace | `/ws/messaging` | dedicated namespace; same-origin via Next proxy |
| Rooms | `user:<userId>` (per authenticated user) | emit to both participants by user id; conversation membership checked on subscribe |
| Fallback | **feature flag** `NEXT_PUBLIC_REALTIME=ws\|poll` | one-line rollback to Sprint 3 polling during rollout |
| Scale | **Redis adapter when `REDIS_URL` set** | `RealtimePublisher` unchanged; single-instance documented otherwise |
| Source of truth | **REST unchanged** | sockets are push-only; `POST/GET/PUT` still persist + validate |

---

## Agent workflow (per story)

Orchestrator: `.cursor/skills/dating-agent-run/SKILL.md`

Run **one agent at a time**:

```text
--agent 0 sprint 4 story 1   → dating-architect
--agent 1 sprint 4 story 1   → dating-senior-dev
--agent 2 sprint 4 story 1   → dating-code-review
--agent 3 sprint 4 story 1   → dating-pm-contractor
```

Handoffs: `handoffs/<story-slug>/agent-*.md`

| Agent | Role |
|-------|------|
| 0 | Architect |
| 1 | Senior dev |
| 2 | Code review |
| 3 | PM / close |

---

## Sprint outcome

| Feature | API | UI | Notes |
|---------|-----|-----|-------|
| WS gateway + auth | `/ws/messaging` namespace, cookie auth | `useMessagingSocket` on conversation route | **shipped (Story 1)** |
| Push new message | emit `message.new` after `POST` persist | append on event; no 3s poll when `ws` | **shipped (Stories 2–3)** |
| Reconnect + catch-up | (client-driven) | backoff + `GET ?after=` on connect + Reconnecting… banner | **shipped (Story 4)** |
| Live unread | (reuse `message.new`) | list badge updates without navigation | **shipped (Story 5)** |
| Hardening | subscribe authz, rate limit, session disconnect, Redis adapter | subscribe emits + prod checklist | **shipped (Story 6)** |

**What this supersedes:** the conversation-route 3s polling loop from Sprint 3 Story 3 (kept behind `NEXT_PUBLIC_REALTIME=poll` for rollback).

**Deferred to future:** typing indicators, presence/online status, delivery/read-receipt push, media attachments, nav-wide unread total.

**Production rollout:** see [PROD_REALTIME.md](./PROD_REALTIME.md).

---

## Manual smoke (end user)

1. Two tabs / two accounts on the same conversation → message appears **near-instantly** with `NEXT_PUBLIC_REALTIME=ws`  
2. Kill network briefly → reconnecting → missed messages backfill (**Story 4**)  
3. With `NEXT_PUBLIC_REALTIME=poll` → Sprint 3 polling behavior (rollback)  
4. Receiver on `/dating/conversations` → unread badge bumps live (**Story 5**)  
5. Log out → socket disconnects; non-participant subscribe rejected (**Story 6**)  
6. (Ops) `REDIS_URL` + two API instances → cross-instance `message.new` fan-out

---

## Operator docs

- [PROD_REALTIME.md](./PROD_REALTIME.md) — production gate checklist  
- [LOAD_SMOKE_WS.md](./LOAD_SMOKE_WS.md) — lightweight load smoke  

---

## Open risks (rollout)

1. **Cookie on WS through the Next proxy** — confirm browser 101 in manual smoke.  
2. **Inbound rate limit** — in-memory per API process (not shared across replicas).  
3. **Multi-instance** — require `REDIS_URL` when replicas > 1.  
4. **Manual smoke** — pending user verification before prod flag flip.
