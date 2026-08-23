/**
 * WebSocket integration: `/ws/messaging` namespace + session cookie + JWT auth.
 * Run: `npx jest messaging-realtime-ws.integration.spec.ts --runInBand`
 */
import { ForbiddenException } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { UserStatus } from '@prisma/client';
import { io, type Socket } from 'socket.io-client';
import { AuthSessionConfigModule } from '../config/auth-session-config.module';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { MeConversationsService } from '../me-profile/conversations/me-conversations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { SessionModule } from '../session/session.module';
import { hashSessionToken } from '../session/session-token.crypto';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import {
  MESSAGING_EVENT_CONVERSATION_SUBSCRIBE,
  MESSAGING_EVENT_SUBSCRIBE_DENIED,
  MESSAGING_EVENT_SUBSCRIBE_OK,
  MESSAGING_WS_NAMESPACE,
} from './messaging-realtime.constants';
import { WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW } from './messaging-ws-inbound.constants';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MessagingRealtimeModule } from './messaging-realtime.module';
import { MessagingSocketRegistry } from './messaging-socket-registry.service';
import { MessagingWsRateLimitService } from './messaging-ws-rate-limit.service';

describe('Messaging realtime WS (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let rateLimit: MessagingWsRateLimitService;
  let socketRegistry: MessagingSocketRegistry;
  let jwtService: JwtService;

  const JWT_SECRET = 'ws-integration-jwt-secret';

  const PEPPER = 'messaging-ws-test-pepper';
  const SESSION_COOKIE = 'dating_session';
  const RAW_TOKEN = 'ws-integration-raw-token';
  const SESSION_HASH = hashSessionToken(RAW_TOKEN, PEPPER);

  const configStub = {
    sessionSecretPepper: PEPPER,
    sessionCookieName: SESSION_COOKIE,
    sessionTtlDays: 14,
    corsOrigin: 'http://localhost:3000',
  };

  const prismaMock = {
    userSession: {
      findUnique: jest.fn(),
    },
  };

  const usersServiceMock = {
    findById: jest.fn(),
  };

  const conversationsMock = {
    assertActiveConversationParticipant: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_SECRET })],
        }),
        AuthSessionConfigModule,
        PrismaModule,
        SessionModule,
        UsersModule,
        StructuredLoggingModule,
        AnalyticsModule,
        MessagingRealtimeModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(AuthSessionConfigService)
      .useValue(configStub)
      .overrideProvider(UsersService)
      .useValue(usersServiceMock)
      .overrideProvider(MeConversationsService)
      .useValue(conversationsMock)
      .compile();

    app = moduleFixture.createNestApplication();
    rateLimit = app.get(MessagingWsRateLimitService);
    socketRegistry = app.get(MessagingSocketRegistry);
    jwtService = app.get(JwtService);
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.init();
    await app.listen(0);

    const addr = app.getHttpServer().address();
    const port =
      typeof addr === 'object' && addr && 'port' in addr ? addr.port : 3001;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimit.resetForTests();
    prismaMock.userSession.findUnique.mockResolvedValue({
      id: 'sess_ws_1',
      userId: 'user_ws_1',
      sessionTokenHash: SESSION_HASH,
      expiresAt: new Date('2038-01-01T00:00:00.000Z'),
      revokedAt: null,
    });
    usersServiceMock.findById.mockResolvedValue({
      id: 'user_ws_1',
      status: UserStatus.ACTIVE,
      deletedAt: null,
    });
    conversationsMock.assertActiveConversationParticipant.mockResolvedValue({
      id: 'conv_allowed',
    });
  });

  function connectWithToken(accessToken: string): Socket {
    return io(`${baseUrl}${MESSAGING_WS_NAMESPACE}`, {
      path: '/socket.io',
      transports: ['websocket'],
      forceNew: true,
      auth: { token: accessToken },
    });
  }

  function mintAccessToken(userId: string, expiresIn: string | number = '15m'): string {
    return jwtService.sign(
      { sub: userId, typ: 'access' },
      { secret: JWT_SECRET, expiresIn },
    );
  }

  function connectSocket(
    cookieHeader?: string,
    extraHeaders?: Record<string, string>,
  ): Socket {
    return io(`${baseUrl}${MESSAGING_WS_NAMESPACE}`, {
      path: '/socket.io',
      transports: ['websocket'],
      forceNew: true,
      ...(cookieHeader || extraHeaders
        ? { extraHeaders: { ...(extraHeaders ?? {}), ...(cookieHeader ? { cookie: cookieHeader } : {}) } }
        : {}),
    });
  }

  function waitForConnect(socket: Socket, timeoutMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('connect timeout'));
      }, timeoutMs);

      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        clearTimeout(timer);
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
      };

      if (socket.connected) {
        cleanup();
        resolve();
        return;
      }

      socket.on('connect', onConnect);
      socket.on('connect_error', onError);
    });
  }

  function waitForEvent<T>(
    socket: Socket,
    event: string,
    timeoutMs = 5000,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off(event, handler);
        reject(new Error(`timeout waiting for ${event}`));
      }, timeoutMs);

      const handler = (payload: T) => {
        clearTimeout(timer);
        resolve(payload);
      };

      socket.once(event, handler);
    });
  }

  it('connects to /ws/messaging with valid JWT access token', async () => {
    const socket = connectWithToken(mintAccessToken('user_ws_1'));
    try {
      await waitForConnect(socket);
      expect(socket.connected).toBe(true);
    } finally {
      socket.disconnect();
    }
  });

  it('drops connection with invalid JWT and no cookie', async () => {
    const socket = connectWithToken('not.a.valid.jwt');
    try {
      await new Promise((r) => setTimeout(r, 500));
      expect(socket.connected).toBe(false);
    } finally {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  });

  it('connects with valid JWT when cookie is also present (token first)', async () => {
    const socket = io(`${baseUrl}${MESSAGING_WS_NAMESPACE}`, {
      path: '/socket.io',
      transports: ['websocket'],
      forceNew: true,
      auth: { token: mintAccessToken('user_ws_1') },
      extraHeaders: { cookie: `${SESSION_COOKIE}=${RAW_TOKEN}` },
    });
    try {
      await waitForConnect(socket);
      expect(socket.connected).toBe(true);
    } finally {
      socket.disconnect();
    }
  });

  it('falls back to session cookie when JWT is expired', async () => {
    const socket = io(`${baseUrl}${MESSAGING_WS_NAMESPACE}`, {
      path: '/socket.io',
      transports: ['websocket'],
      forceNew: true,
      auth: { token: mintAccessToken('user_ws_1', '-1s') },
      extraHeaders: { cookie: `${SESSION_COOKIE}=${RAW_TOKEN}` },
    });
    try {
      await waitForConnect(socket);
      expect(socket.connected).toBe(true);
    } finally {
      socket.disconnect();
    }
  });

  it('returns subscribe.ok over JWT-authenticated socket', async () => {
    const socket = connectWithToken(mintAccessToken('user_ws_1'));
    try {
      await waitForConnect(socket);
      const ackPromise = waitForEvent<{ conversationId: string }>(
        socket,
        MESSAGING_EVENT_SUBSCRIBE_OK,
      );
      socket.emit(MESSAGING_EVENT_CONVERSATION_SUBSCRIBE, {
        conversationId: 'conv_allowed',
      });
      const ack = await ackPromise;
      expect(ack.conversationId).toBe('conv_allowed');
    } finally {
      socket.disconnect();
    }
  });

  it('connects to /ws/messaging with valid session cookie', async () => {
    const socket = connectSocket(`${SESSION_COOKIE}=${RAW_TOKEN}`);
    try {
      await waitForConnect(socket);
      expect(socket.connected).toBe(true);
    } finally {
      socket.disconnect();
    }
  });

  it('drops connection without session cookie after handshake auth', async () => {
    const socket = connectSocket();
    try {
      await new Promise((r) => setTimeout(r, 500));
      expect(socket.connected).toBe(false);
    } finally {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  });

  it('returns subscribe.ok for allowed conversation', async () => {
    const socket = connectSocket(`${SESSION_COOKIE}=${RAW_TOKEN}`);
    try {
      await waitForConnect(socket);
      const ackPromise = waitForEvent<{ conversationId: string }>(
        socket,
        MESSAGING_EVENT_SUBSCRIBE_OK,
      );
      socket.emit(MESSAGING_EVENT_CONVERSATION_SUBSCRIBE, {
        conversationId: 'conv_allowed',
      });
      const ack = await ackPromise;
      expect(ack.conversationId).toBe('conv_allowed');
    } finally {
      socket.disconnect();
    }
  });

  it('returns subscribe.denied for forbidden conversation', async () => {
    conversationsMock.assertActiveConversationParticipant.mockRejectedValue(
      new ForbiddenException(),
    );
    const socket = connectSocket(`${SESSION_COOKIE}=${RAW_TOKEN}`);
    try {
      await waitForConnect(socket);
      const deniedPromise = waitForEvent<{
        conversationId: string;
        reason: string;
      }>(socket, MESSAGING_EVENT_SUBSCRIBE_DENIED);
      socket.emit(MESSAGING_EVENT_CONVERSATION_SUBSCRIBE, {
        conversationId: 'conv_forbidden',
      });
      const denied = await deniedPromise;
      expect(denied).toEqual({
        conversationId: 'conv_forbidden',
        reason: 'forbidden',
      });
    } finally {
      socket.disconnect();
    }
  });

  it('disconnects when inbound rate limit is exceeded', async () => {
    const socket = connectSocket(`${SESSION_COOKIE}=${RAW_TOKEN}`);
    try {
      await waitForConnect(socket);

      for (let i = 0; i < WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW; i++) {
        await rateLimit.consumeInboundSlot('user_ws_1');
      }

      socket.emit(MESSAGING_EVENT_CONVERSATION_SUBSCRIBE, {
        conversationId: 'conv_allowed',
      });

      await new Promise((r) => setTimeout(r, 500));
      expect(socket.connected).toBe(false);
    } finally {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  });

  it('drops soft-deleted user on handshake', async () => {
    usersServiceMock.findById.mockResolvedValue({
      id: 'user_ws_1',
      status: UserStatus.ACTIVE,
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const socket = connectSocket(`${SESSION_COOKIE}=${RAW_TOKEN}`);
    try {
      await new Promise((r) => setTimeout(r, 500));
      expect(socket.connected).toBe(false);
    } finally {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  });

  it('disconnects connected client when session is force-disconnected (logout path)', async () => {
    const socket = connectSocket(`${SESSION_COOKIE}=${RAW_TOKEN}`);
    try {
      await waitForConnect(socket);
      expect(socket.connected).toBe(true);

      const disconnectPromise = new Promise<void>((resolve) => {
        socket.once('disconnect', () => resolve());
      });
      await socketRegistry.disconnectBySessionId('sess_ws_1');
      await disconnectPromise;

      expect(socket.connected).toBe(false);
    } finally {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  });
});
