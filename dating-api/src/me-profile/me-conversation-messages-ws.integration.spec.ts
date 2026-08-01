/**
 * Sprint 4 Story 2: REST send emits `message.new` on `/ws/messaging`.
 * Run: `npx jest me-conversation-messages-ws.integration.spec.ts --runInBand`
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { UserStatus } from '@prisma/client';
import { io, type Socket } from 'socket.io-client';
import { AuthSessionConfigModule } from '../config/auth-session-config.module';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { SessionModule } from '../session/session.module';
import { hashSessionToken } from '../session/session-token.crypto';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { AuthModule } from '../auth/auth.module';
import { GoogleAuthService } from '../auth/google-auth.service';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { LLM_CONFIG } from '../llm/llm.constants';
import { PHOTO_STORAGE } from '../photo-storage/photo-storage.module';
import {
  MESSAGING_EVENT_MESSAGE_NEW,
  MESSAGING_WS_NAMESPACE,
} from '../messaging-realtime/messaging-realtime.constants';
import { MeProfileAnalysisService } from './me-profile-analysis.service';
import { ConversationMessageRateLimitService } from './conversation-message-rate-limit.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MeProfileModule } from './me-profile.module';
import { MeProfileValidationPipe } from './me-profile-validation.pipe';

function extractCookieValue(
  setCookie: string[] | undefined,
  name: string,
): string | undefined {
  if (!setCookie?.length) {
    return undefined;
  }
  for (const line of setCookie) {
    if (line.startsWith(`${name}=`)) {
      return line.split(';')[0].slice(name.length + 1);
    }
  }
  return undefined;
}

describe('me conversation messages WS (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;

  const PEPPER = 'msg-ws-integration-pepper';
  const SESSION_COOKIE = 'dating_session';
  const USER_ID = 'user_sender_ws';
  const RECIPIENT_USER_ID = 'user_recipient_ws';
  const CONVERSATION_ID = 'mutual_ws_emit_1';

  const prismaMock = {
    $transaction: jest.fn(),
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    userProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    userProfileEvaluation: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    mutualMatch: {
      findUnique: jest.fn(),
    },
    message: {
      create: jest.fn(),
    },
  };

  const usersServiceMock = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByGoogleId: jest.fn(),
    createFromGoogleIdentity: jest.fn(),
    updateLoginFields: jest.fn(),
  };

  const verifyIdToken = jest.fn();

  const configStub = {
    googleClientId: 'google-client-id',
    sessionSecretPepper: PEPPER,
    sessionCookieName: SESSION_COOKIE,
    sessionTtlDays: 14,
    cookieDomain: undefined as string | undefined,
    cookieSecure: false,
    corsOrigin: 'http://localhost:3000',
  };

  const RECIPIENT_RAW_TOKEN = 'recipient-ws-raw-token';
  const RECIPIENT_SESSION_HASH = hashSessionToken(
    RECIPIENT_RAW_TOKEN,
    PEPPER,
  );

  beforeAll(async () => {
    prismaMock.userSession.create.mockImplementation(async ({ data }) => ({
      id: 'sess_ws_emit',
      expiresAt: data.expiresAt,
    }));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AuthSessionConfigModule,
        PrismaModule,
        SessionModule,
        UsersModule,
        StructuredLoggingModule,
        SimpleLoggerModule,
        AnalyticsModule,
        AuthModule,
        MeProfileModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(AuthSessionConfigService)
      .useValue(configStub)
      .overrideProvider(GoogleAuthService)
      .useValue({ verifyIdToken })
      .overrideProvider(UsersService)
      .useValue(usersServiceMock)
      .overrideProvider(LLM_CONFIG)
      .useValue({ openai: { apiKey: 'test-key' }, models: new Map() })
      .overrideProvider(MeProfileAnalysisService)
      .useValue({ runForUser: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(MeProfileValidationPipe)
      .useValue({ transform: (v: unknown) => v })
      .overrideProvider(PHOTO_STORAGE)
      .useValue({
        driver: 'local',
        buildStorageKey: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
        read: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));
    app.use(cookieParser());
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

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
    );
    await app.get(ConversationMessageRateLimitService).resetForTests();
  });

  async function loginSenderCookie(): Promise<string> {
    verifyIdToken.mockResolvedValue({
      googleId: 'google-sender-ws',
      email: 'sender@example.com',
      displayName: 'Sender',
      avatarUrl: null,
    });
    usersServiceMock.findByGoogleId.mockResolvedValue(null);
    usersServiceMock.createFromGoogleIdentity.mockResolvedValue({
      id: USER_ID,
      email: 'sender@example.com',
      googleId: 'google-sender-ws',
      displayName: 'Sender',
      avatarUrl: null,
      status: UserStatus.ACTIVE,
    });

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/google')
      .send({ idToken: 'mock-jwt' })
      .expect(200);

    const raw = extractCookieValue(login.headers['set-cookie'], SESSION_COOKIE);
    expect(raw).toBeTruthy();
    return raw!;
  }

  function mockSessions(senderRaw: string): void {
    const senderHash = hashSessionToken(senderRaw, PEPPER);
    prismaMock.userSession.findUnique.mockImplementation(
      async (args: { where: { sessionTokenHash: string } }) => {
        const hash = args.where.sessionTokenHash;
        if (hash === senderHash) {
          return {
            id: 'sess_sender',
            userId: USER_ID,
            sessionTokenHash: senderHash,
            expiresAt: new Date('2038-01-01T00:00:00.000Z'),
            revokedAt: null,
          };
        }
        if (hash === RECIPIENT_SESSION_HASH) {
          return {
            id: 'sess_recipient',
            userId: RECIPIENT_USER_ID,
            sessionTokenHash: RECIPIENT_SESSION_HASH,
            expiresAt: new Date('2038-01-01T00:00:00.000Z'),
            revokedAt: null,
          };
        }
        return null;
      },
    );
    usersServiceMock.findById.mockImplementation(async (id: string) => ({
      id,
      email: `${id}@example.com`,
      displayName: id,
      avatarUrl: null,
      status: UserStatus.ACTIVE,
    }));
  }

  function connectSocket(cookieHeader: string): Socket {
    return io(`${baseUrl}${MESSAGING_WS_NAMESPACE}`, {
      path: '/socket.io',
      transports: ['websocket'],
      forceNew: true,
      extraHeaders: { cookie: cookieHeader },
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

  function waitForMessageNew(
    socket: Socket,
    timeoutMs = 5000,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off(MESSAGING_EVENT_MESSAGE_NEW, onMessage);
        reject(new Error('message.new timeout'));
      }, timeoutMs);

      const onMessage = (payload: Record<string, unknown>) => {
        clearTimeout(timer);
        resolve(payload);
      };

      socket.on(MESSAGING_EVENT_MESSAGE_NEW, onMessage);
    });
  }

  it('emits message.new to recipient and sender rooms after POST send', async () => {
    const senderRaw = await loginSenderCookie();
    mockSessions(senderRaw);

    const createdAt = new Date('2026-06-03T12:00:00.000Z');
    prismaMock.mutualMatch.findUnique.mockResolvedValue({
      id: CONVERSATION_ID,
      userId1: RECIPIENT_USER_ID,
      userId2: USER_ID,
      status: 'ACTIVE',
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
      user1LastReadAt: null,
      user2LastReadAt: null,
    });
    prismaMock.message.create.mockResolvedValue({
      id: 'msg_ws_emit_1',
      conversationId: CONVERSATION_ID,
      senderId: USER_ID,
      text: 'Hello via WS',
      createdAt,
      status: 'SENT',
    });

    const recipientSocket = connectSocket(
      `${SESSION_COOKIE}=${RECIPIENT_RAW_TOKEN}`,
    );
    const senderSocket = connectSocket(`${SESSION_COOKIE}=${senderRaw}`);

    try {
      await waitForConnect(recipientSocket);
      await waitForConnect(senderSocket);

      const recipientPromise = waitForMessageNew(recipientSocket);
      const senderPromise = waitForMessageNew(senderSocket);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${senderRaw}`])
        .send({ text: 'Hello via WS' })
        .expect(201);

      const expectedBody = {
        id: 'msg_ws_emit_1',
        conversationId: CONVERSATION_ID,
        senderId: USER_ID,
        text: 'Hello via WS',
        createdAt: createdAt.toISOString(),
        status: 'SENT',
      };
      expect(res.body).toEqual(expectedBody);

      const recipientPayload = await recipientPromise;
      const senderPayload = await senderPromise;

      expect(recipientPayload).toEqual(expectedBody);
      expect(senderPayload).toEqual(expectedBody);
    } finally {
      recipientSocket.disconnect();
      senderSocket.disconnect();
    }
  });
});
