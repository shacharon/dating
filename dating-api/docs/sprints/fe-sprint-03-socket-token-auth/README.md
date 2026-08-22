# FE Sprint 03 — Socket Token Auth

**Status:** **Done** (code-complete; manual smoke optional)  
**Priority:** 🔴 **P0 BLOCKER** — Real-time messaging won't work on mobile without this  
**Depends on:** FE-01 Story 1 backend JWT + FE-01 Story 2 frontend tokens — ✅ satisfied  
**Companion:** [`AGENT_COMMANDS.md`](./AGENT_COMMANDS.md)  
**Repo:** `dating-ui` (frontend) + `dating-api` (backend)  
**Target:** Mobile real-time messaging

**Handoffs:** [Story 1](./handoffs/STORY_01_backend_socket_token_validation/) · [Story 2](./handoffs/STORY_02_frontend_socket_token_injection/) — pipelines complete through Agent 3 PM.

---

## Problem

**Current state:** WebSocket auth uses cookies.

```typescript
// dating-ui/src/hooks/use-socket.ts
const socket = io('https://api.example.com', {
  withCredentials: true // ← Cookie-based auth
});
```

**Backend (dating-api):**

```typescript
// dating-api/src/messaging-realtime/messaging-socket.gateway.ts
@WebSocketGateway({ cors: { credentials: true } })
export class MessagingSocketGateway {
  @SubscribeMessage('join')
  async handleJoin(@ConnectedSocket() client: Socket) {
    // Extract user from cookie (req.user)
  }
}
```

**Why it blocks Android:**
- Mobile WebSocket clients **cannot reliably send cookies**
- Cross-origin WebSocket from native app fails auth
- No standard cookie jar in native networking

---

## Goal

Implement **token-based WebSocket authentication** that works for:
- ✅ Web app (backward compatible, migrate gradually)
- ✅ Android app (primary driver)
- ✅ iOS app (future)

**Pattern:** Send access token during WebSocket handshake (query param or auth header).

---

## Success Criteria

### Backend (`dating-api`) — Story 1 ✅

- [x] Socket gateway accepts `handshake.auth.token` (primary) and `handshake.query.token` (secondary)
- [x] Socket gateway validates token via `TokenService.verifyAccessToken` and attaches user to socket context (`authKind: 'bearer'`)
- [x] Socket gateway still accepts cookie-based auth (web backward compat)
- [x] Invalid token (no cookie fallback) → disconnect on handshake

### Frontend (`dating-ui`) — Story 2 ✅

- [x] Socket client sends access token in handshake (`auth.token`)
- [x] Socket client refreshes token if expired/near-expiry before connecting (`REFRESH_LEAD_MS`)
- [x] Socket reconnects with new token after refresh (`reconnect_attempt` + `io server disconnect` recovery)
- [x] Handles server auth disconnect — refresh + reconnect, or `notifyAuthSessionRevoked()` on failure

### Testing

- [x] Backend: `73/73` tests (Story 1)
- [x] Frontend: `46/46` story-targeted tests (Story 2 + hook regression)
- [ ] Manual: DevTools WS handshake shows JWT — operator smoke
- [ ] Manual: Android emulator / Capacitor shell — deferred Android sprint
- [ ] Manual: live token expiry (~15m) — optional staging smoke

---

## Stories

### Story 1 — Backend Socket Token Validation ✅ Done
**Effort:** 1-2 days  
**Risk:** 🟡 MEDIUM (socket auth is tricky)  
**Completed:** 2026-08-22

**Implemented (actual codebase — not README sample):**

| Area | Path |
|------|------|
| Handshake auth | `messaging-ws-auth.service.ts`, `messaging-ws-handshake.util.ts` |
| Gateway | `messaging.gateway.ts` — `/ws/messaging`, `conversation.subscribe` / `message.new` |
| Session revalidation | `messaging-ws-session.service.ts` — `isBearerConnectionAllowed` |
| Presence / registry | `messaging-socket-registry.service.ts` — bearer `userId` indexing |
| Module | `messaging-realtime.module.ts` — imports `AuthModule` |

**Behavior:** Token-first (`auth.token` → `query.token`), cookie fallback; bearer joins `user:` room only; 60s JWT revalidation.

**Known limitation (accepted):** Cookie logout (`disconnectBySessionId`) does not disconnect bearer sockets — follow-up in Story 2 or auth logout path (`disconnectByUserId`).

**Tests:** `73/73` pass (unit + integration). Agent 2.5 recommended before prod.

---

### Story 2 — Frontend Socket Token Injection ✅ Done
**Effort:** 1 day  
**Risk:** 🟢 LOW  
**Completed:** 2026-08-22

**Implemented:**

| Area | Path |
|------|------|
| Token resolve/refresh | `messaging-socket-auth.ts` |
| Handshake + reconnect | `messaging-socket.ts` — `applyAuthAndConnect`, `wireMessagingSocketAuth` |
| Hook (unchanged) | `use-messaging-socket.ts` — lib-layer auth only |

**Behavior:** `withCredentials: true` + `auth.token` when JWT present; stale token refreshed via `coordinateRefreshAccessToken`; `io server disconnect` → refresh + manual reconnect.

**Known limitations (accepted):** Logout does not force-disconnect shared socket; backend bearer logout cluster disconnect deferred.

**Tests:** `46/46` pass. Agent 3.5 recommended before prod.

---

## Implementation

### Backend: Socket Token Validation

**File:** `dating-api/src/messaging-realtime/messaging-socket.gateway.ts`

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TokenService } from '../auth/token.service';
import { Logger, UnauthorizedException } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true
  }
})
export class MessagingSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('MessagingSocket');

  constructor(private tokenService: TokenService) {}

  async handleConnection(client: Socket) {
    try {
      // Option 1: Token in query param (?token=...)
      const tokenFromQuery = client.handshake.query.token as string;

      // Option 2: Token in auth object (socket.io v4+)
      const tokenFromAuth = client.handshake.auth?.token as string;

      const token = tokenFromQuery || tokenFromAuth;

      if (token) {
        // Validate token
        const payload = await this.tokenService.verifyAccessToken(token);
        client.data.user = payload; // Attach user to socket
        this.logger.log(`Socket connected with token: user ${payload.userId}`);
      } else {
        // Fallback: Cookie-based auth (web backward compat)
        const request = client.request as any;
        if (request.user) {
          client.data.user = request.user;
          this.logger.log(`Socket connected with cookie: user ${request.user.userId}`);
        } else {
          throw new UnauthorizedException('No authentication provided');
        }
      }
    } catch (err) {
      this.logger.error(`Socket auth failed: ${err.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user?.userId;
    this.logger.log(`Socket disconnected: user ${userId}`);
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    const userId = client.data.user?.userId;
    if (!userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    client.join(`conversation:${data.conversationId}`);
    this.logger.log(`User ${userId} joined conversation ${data.conversationId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; text: string }
  ) {
    const userId = client.data.user?.userId;
    if (!userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Save message to DB (existing logic)
    const message = await this.messagingService.sendMessage(userId, data.conversationId, data.text);

    // Broadcast to conversation room
    this.server.to(`conversation:${data.conversationId}`).emit('newMessage', message);
  }
}
```

---

### Frontend: Socket Token Injection

**File:** `dating-ui/src/hooks/use-socket.ts`

```typescript
'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/auth-context';

export function useSocket() {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      // Not logged in: disconnect if connected
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const connectSocket = async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.error('No access token available for socket connection');
        return;
      }

      // Create socket with token
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
        auth: {
          token: accessToken // ← Send token in handshake
        },
        transports: ['websocket'], // Prefer WebSocket (faster)
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);

        // If auth failed, try refreshing token
        if (reason === 'io server disconnect') {
          console.log('Socket disconnected by server (auth failed), will retry on reconnect');
        }
      });

      newSocket.on('error', (err) => {
        console.error('Socket error:', err);
      });

      // Handle reconnect: refresh token if needed
      newSocket.io.on('reconnect_attempt', async () => {
        console.log('Socket reconnecting, refreshing token...');
        const newAccessToken = await getAccessToken(); // Auth context handles refresh
        if (newAccessToken) {
          newSocket.auth = { token: newAccessToken };
        }
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isAuthenticated, getAccessToken]);

  return { socket, isConnected };
}
```

---

### Usage in Component

**File:** `dating-ui/src/app/dating/conversations/[id]/page.tsx`

```typescript
'use client';

import { useSocket } from '@/hooks/use-socket';
import { useEffect, useState } from 'react';

export default function ConversationPage({ params }: { params: { id: string } }) {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join conversation room
    socket.emit('join', { conversationId: params.id });

    // Listen for new messages
    socket.on('newMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off('newMessage');
    };
  }, [socket, isConnected, params.id]);

  const sendMessage = (text: string) => {
    if (socket && isConnected) {
      socket.emit('sendMessage', { conversationId: params.id, text });
    }
  };

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>
        {messages.map((msg, i) => (
          <div key={i}>{msg.text}</div>
        ))}
      </div>
      <button onClick={() => sendMessage('Hello')}>Send</button>
    </div>
  );
}
```

---

## Testing

### Manual Testing

**1. Web app (token-based):**
- Log in
- Go to conversation page
- Check DevTools → Network → WS tab
- Verify WebSocket handshake includes `auth.token`
- Send message → verify received

**2. Web app (cookie fallback):**
- Comment out token in socket config
- Verify still works (cookie-based)

**3. Token expiry:**
- Wait for token to expire
- Verify socket disconnects and reconnects with refreshed token

**4. Android (mock):**
- Use Android emulator
- Verify socket connects with token
- Send message → verify received

---

### Automated Tests

**Backend test:**

```typescript
// dating-api/src/messaging-realtime/messaging-socket.gateway.spec.ts
describe('MessagingSocketGateway', () => {
  it('accepts socket connection with valid token', async () => {
    const token = await tokenService.generateAccessToken({ userId: '123', email: 'test@example.com' });
    const client = io('http://localhost:3000', {
      auth: { token }
    });

    await new Promise((resolve) => client.on('connect', resolve));
    expect(client.connected).toBe(true);
    client.disconnect();
  });

  it('rejects socket connection with invalid token', async () => {
    const client = io('http://localhost:3000', {
      auth: { token: 'invalid' }
    });

    await new Promise((resolve) => client.on('error', resolve));
    expect(client.connected).toBe(false);
  });
});
```

---

## Files Changed

### Backend
- ✅ `dating-api/src/messaging-realtime/messaging-socket.gateway.ts` (token validation)

### Frontend
- ✅ `dating-ui/src/hooks/use-socket.ts` (token injection)
- ✅ `dating-ui/src/app/dating/conversations/[id]/page.tsx` (use updated hook)

---

## Success Criteria (sprint-level)

### Backend — Story 1 ✅
- [x] Backend accepts `auth.token` and `query.token`
- [x] Backend validates token and attaches user (`authKind` on socket data)
- [x] Backend still accepts cookie auth (web backward compat)
- [x] Invalid token → disconnect (trace `invalid_token` / cookie reasons)

### Frontend — Story 2 ✅
- [x] Frontend sends token in socket handshake
- [x] Frontend refreshes token before connect/reconnect
- [x] Automated regression (hooks + socket lib)

### E2E / manual (optional before prod)
- [ ] Web app messaging smoke (cookie or token)
- [ ] Android mock with `NEXT_PUBLIC_API_URL` + token
- [ ] Live token expiry reconnect in staging

---

## Launch Readiness

**Socket token auth (FE-03):** ✅ **Code-complete** — deploy backend Story 1 + frontend Story 2 together with `JWT_SECRET`.

**Production Android messaging:** Still requires Android shell sprint + optional manual smoke + Agent 3.5 review.

**Deferred follow-ups:** Logout socket teardown; backend `disconnectByUserId` on bearer logout.

---

## References

- [Socket.IO Authentication](https://socket.io/docs/v4/middlewares/#sending-credentials)
- [Socket.IO Client Options](https://socket.io/docs/v4/client-options/)
