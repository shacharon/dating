/**
 * Sub-split from me-profile-http-conversations.integration.spec.ts (Sprint 69 Story 02).
 * POST/GET messages, moderation, guardrails.
 */
/**
 * Split from me-profile-http.integration.spec.ts (Sprint 63 Story 2).
 * Shared bootstrap: ./me-profile-http.shared-harness.ts
 */
import request from 'supertest';
import { Prisma, UserProfileStatus, UserStatus } from '@prisma/client';
import { ConversationMessageRateLimitService } from './conversation-message-rate-limit.service';
import { MeConversationsService } from './me-conversations.service';
import type { MeProfileHttpHarness } from './me-profile-http.shared-harness';
import {
  createMeProfileHttpHarness,
  ME_PROFILE_HTTP_PEPPER,
  ME_PROFILE_HTTP_SESSION_COOKIE,
  ME_PROFILE_HTTP_USER_ID,
  parseStructuredJsonLogs,
} from './me-profile-http.shared-harness';

describe('me profile HTTP — conversations messages (integration)', () => {
  let h: MeProfileHttpHarness;
  let app: MeProfileHttpHarness['app'];
  let prismaMock: MeProfileHttpHarness['prismaMock'];
  let photoStorageMock: MeProfileHttpHarness['photoStorageMock'];
  let moderationClientMock: MeProfileHttpHarness['moderationClientMock'];
  let contentViolationsMock: MeProfileHttpHarness['contentViolationsMock'];
  let matchNarrativeGeneratorStub: MeProfileHttpHarness['matchNarrativeGeneratorStub'];
  let usersServiceMock: MeProfileHttpHarness['usersServiceMock'];
  let verifyIdToken: MeProfileHttpHarness['verifyIdToken'];
  const USER_ID = ME_PROFILE_HTTP_USER_ID;
  const SESSION_COOKIE = ME_PROFILE_HTTP_SESSION_COOKIE;
  const PEPPER = ME_PROFILE_HTTP_PEPPER;
  let loginAndCookie: () => Promise<string>;

  beforeAll(async () => {
    h = await createMeProfileHttpHarness();
    app = h.app;
    prismaMock = h.prismaMock;
    photoStorageMock = h.photoStorageMock;
    moderationClientMock = h.moderationClientMock;
    contentViolationsMock = h.contentViolationsMock;
    matchNarrativeGeneratorStub = h.matchNarrativeGeneratorStub;
    usersServiceMock = h.usersServiceMock;
    verifyIdToken = h.verifyIdToken;
    loginAndCookie = h.loginAndCookie;
  });

  afterAll(async () => {
    await h.close();
  });

  beforeEach(async () => {
    await h.resetForTest();
  });

  describe('Sprint 3 Story 1: POST /api/v1/me/conversations/:id/messages', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_message_1';

    const activeMatch = {
      id: CONVERSATION_ID,
      userId1: CANDIDATE_USER_ID,
      userId2: USER_ID,
      status: 'ACTIVE' as const,
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
    };

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .send({ text: 'Hello' })
        .expect(401);
    });

    it('returns 201 and creates message for ACTIVE participant', async () => {
      const raw = await loginAndCookie();
      const createdAt = new Date('2026-05-31T16:00:00.000Z');
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.message.create.mockResolvedValue({
        id: 'msg_created_1',
        conversationId: CONVERSATION_ID,
        senderId: USER_ID,
        text: 'Hello!',
        createdAt,
        status: 'SENT',
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'Hello!' })
        .expect(201);

      expect(res.body).toEqual({
        id: 'msg_created_1',
        conversationId: CONVERSATION_ID,
        senderId: USER_ID,
        text: 'Hello!',
        createdAt: createdAt.toISOString(),
        status: 'SENT',
      });
      expect(prismaMock.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: CONVERSATION_ID,
          senderId: USER_ID,
          text: 'Hello!',
          status: 'SENT',
        },
        select: expect.any(Object),
      });
    });

    it('returns 403 when session user is not a participant', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        ...activeMatch,
        userId1: 'user_not_participant',
        userId2: CANDIDATE_USER_ID,
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'Hello' })
        .expect(403);

      expect(res.body).toMatchObject({
        error: 'conversation_forbidden',
        message: 'You do not have access to this conversation.',
      });
      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('returns 404 when conversation does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'Hello' })
        .expect(404);

      expect(res.body).toMatchObject({
        error: 'conversation_not_found',
        message: 'Conversation not found.',
      });
      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('returns 404 when conversation is UNMATCHED', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        ...activeMatch,
        status: 'UNMATCHED',
      });

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'Hello' })
        .expect(404);

      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('returns 400 when text is empty', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: '' })
        .expect(400);

      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('returns 400 when text is whitespace only', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: '   ' })
        .expect(400);

      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('returns 400 when text exceeds 2000 characters', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'x'.repeat(2001) })
        .expect(400);

      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('persists trimmed text', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.message.create.mockResolvedValue({
        id: 'msg_trim',
        conversationId: CONVERSATION_ID,
        senderId: USER_ID,
        text: 'Hi',
        createdAt: new Date(),
        status: 'SENT',
      });

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: '  Hi  ' })
        .expect(201);

      expect(prismaMock.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ text: 'Hi' }),
        select: expect.any(Object),
      });
    });
  });

  describe('Sprint 30 Story 3: message content moderation', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_message_mod_1';

    const activeMatch = {
      id: CONVERSATION_ID,
      userId1: CANDIDATE_USER_ID,
      userId2: USER_ID,
      status: 'ACTIVE' as const,
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
    };

    it('returns 400 when message text is flagged', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      moderationClientMock.checkContent.mockResolvedValue({
        flagged: true,
        categories: ['harassment'],
        primaryCategory: 'harassment',
        score: 0.9,
        sexualScore: null,
        failOpen: false,
      });
      contentViolationsMock.getViolationCount.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'explicit harassment' })
        .expect(400);

      expect(res.body).toMatchObject({
        error: 'message_content_moderation_failed',
        details: expect.objectContaining({
          category: 'harassment',
          source: 'openai',
          flaggedText: expect.any(String),
          reason: expect.any(String),
          suggestion: expect.any(String),
        }),
      });
      expect(contentViolationsMock.recordViolation).toHaveBeenCalled();
      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('returns 403 when user is messaging_muted', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
    contentViolationsMock.getUserViolationStatus.mockResolvedValue({
      status: 'messaging_muted',
      mutedUntil: new Date(Date.now() + 60 * 60 * 1000),
      violationCount: 3,
    });
    contentViolationsMock.isUserBlocked.mockResolvedValue(true);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
      .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
      .send({ text: 'Hello' })
      .expect(403);

      expect(res.body).toMatchObject({ error: 'messaging_muted' });
      expect(moderationClientMock.checkContent).not.toHaveBeenCalled();
      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });
  });

  // ─── Sprint 3 Story 6: message safety guardrails ───────────────────────────

  describe('Sprint 3 Story 6: message safety guardrails', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_message_guardrails_1';

    const activeMatch = {
      id: CONVERSATION_ID,
      userId1: CANDIDATE_USER_ID,
      userId2: USER_ID,
      status: 'ACTIVE' as const,
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
    };

    beforeEach(async () => {
      await app.get(ConversationMessageRateLimitService).resetForTests();
    });

    it('returns 429 on 11th POST within the rate-limit window', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);

      let seq = 0;
      prismaMock.message.create.mockImplementation(
        async (args: {
          data: {
            conversationId: string;
            senderId: string;
            text: string;
            status: string;
          };
        }) => {
          seq += 1;
          return {
            id: `msg_rate_${seq}`,
            conversationId: args.data.conversationId,
            senderId: args.data.senderId,
            text: args.data.text,
            createdAt: new Date('2026-05-31T16:00:00.000Z'),
            status: 'SENT',
          };
        },
      );

      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .send({ text: `Message ${i}` })
          .expect(201);
      }

      const res = await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'Message 11' })
        .expect(429);

      expect(res.body).toMatchObject({
        message: 'Too many messages. Please wait.',
      });
      expect(prismaMock.message.create).toHaveBeenCalledTimes(10);
    });

    it('returns 400 when text exceeds 2000 characters (Story 6 guardrail)', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'x'.repeat(2001) })
        .expect(400);

      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });
  });

  // ─── Sprint 3 Story 2: GET /api/v1/me/conversations/:id/messages ──────────

  describe('Sprint 3 Story 2: GET /api/v1/me/conversations/:id/messages', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_message_list_1';

    const activeMatch = {
      id: CONVERSATION_ID,
      userId1: CANDIDATE_USER_ID,
      userId2: USER_ID,
      status: 'ACTIVE' as const,
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
    };

    const t1 = new Date('2026-05-31T10:00:00.000Z');
    const t2 = new Date('2026-05-31T11:00:00.000Z');
    const t3 = new Date('2026-05-31T12:00:00.000Z');

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .expect(401);
    });

    it('returns 200 with messages in chronological ASC order', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.message.findMany.mockResolvedValue([
        {
          id: 'msg_3',
          conversationId: CONVERSATION_ID,
          senderId: USER_ID,
          text: 'Third',
          createdAt: t3,
          status: 'SENT',
        },
        {
          id: 'msg_2',
          conversationId: CONVERSATION_ID,
          senderId: CANDIDATE_USER_ID,
          text: 'Second',
          createdAt: t2,
          status: 'SENT',
        },
        {
          id: 'msg_1',
          conversationId: CONVERSATION_ID,
          senderId: USER_ID,
          text: 'First',
          createdAt: t1,
          status: 'SENT',
        },
      ]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.messages.map((m: { id: string }) => m.id)).toEqual([
        'msg_1',
        'msg_2',
        'msg_3',
      ]);
      expect(res.body.pagination).toEqual({
        hasMore: false,
        nextCursor: null,
      });
    });

    it('returns 200 with empty array when no messages exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.message.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({
        messages: [],
        pagination: { hasMore: false, nextCursor: null },
      });
    });

    it('returns pagination when more messages exist than limit', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.message.findMany.mockResolvedValue([
        {
          id: 'msg_3',
          conversationId: CONVERSATION_ID,
          senderId: USER_ID,
          text: 'Third',
          createdAt: t3,
          status: 'SENT',
        },
        {
          id: 'msg_2',
          conversationId: CONVERSATION_ID,
          senderId: CANDIDATE_USER_ID,
          text: 'Second',
          createdAt: t2,
          status: 'SENT',
        },
        {
          id: 'msg_1',
          conversationId: CONVERSATION_ID,
          senderId: USER_ID,
          text: 'First',
          createdAt: t1,
          status: 'SENT',
        },
      ]);

      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/me/conversations/${CONVERSATION_ID}/messages?limit=2`,
        )
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.messages.map((m: { id: string }) => m.id)).toEqual([
        'msg_2',
        'msg_3',
      ]);
      expect(res.body.pagination).toEqual({
        hasMore: true,
        nextCursor: 'msg_2',
      });
    });

    it('returns earlier page when before cursor is provided', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.message.findFirst.mockResolvedValue({
        id: 'msg_2',
        createdAt: t2,
      });
      prismaMock.message.findMany.mockResolvedValue([
        {
          id: 'msg_1',
          conversationId: CONVERSATION_ID,
          senderId: USER_ID,
          text: 'First',
          createdAt: t1,
          status: 'SENT',
        },
      ]);

      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/me/conversations/${CONVERSATION_ID}/messages?before=msg_2`,
        )
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.messages).toHaveLength(1);
      expect(res.body.messages[0].id).toBe('msg_1');
      expect(prismaMock.message.findFirst).toHaveBeenCalled();
    });

    it('returns 403 when session user is not a participant', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        ...activeMatch,
        userId1: 'user_not_participant',
        userId2: CANDIDATE_USER_ID,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(403);

      expect(res.body).toMatchObject({
        error: 'conversation_forbidden',
        message: 'You do not have access to this conversation.',
      });
      expect(prismaMock.message.findMany).not.toHaveBeenCalled();
    });

    it('returns 404 when conversation does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(res.body).toMatchObject({
        error: 'conversation_not_found',
        message: 'Conversation not found.',
      });
      expect(prismaMock.message.findMany).not.toHaveBeenCalled();
    });

    it('returns 404 when conversation is UNMATCHED', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        ...activeMatch,
        status: 'UNMATCHED',
      });

      await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.message.findMany).not.toHaveBeenCalled();
    });

    it('returns 400 when before cursor is invalid', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.message.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(
          `/api/v1/me/conversations/${CONVERSATION_ID}/messages?before=msg_missing`,
        )
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(400);

      expect(prismaMock.message.findMany).not.toHaveBeenCalled();
    });

    it.each(['0', '101', 'abc'])(
      'returns 400 when limit is invalid (%s)',
      async (limit) => {
        const raw = await loginAndCookie();
        prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);

        await request(app.getHttpServer())
          .get(
            `/api/v1/me/conversations/${CONVERSATION_ID}/messages?limit=${limit}`,
          )
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .expect(400);

        expect(prismaMock.message.findMany).not.toHaveBeenCalled();
      },
    );
  });

  // ─── Sprint 3 Story 4: PUT /api/v1/me/conversations/:id/read ────────────

});
