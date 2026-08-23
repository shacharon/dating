/**
 * Sub-split from me-profile-http-conversations.integration.spec.ts (Sprint 69 Story 02).
 * PUT /conversations/:id/read.
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

describe('me profile HTTP — conversations read (integration)', () => {
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

  describe('Sprint 3 Story 4: PUT /api/v1/me/conversations/:id/read', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_mark_read_1';
    const matchedAt = new Date('2026-05-31T10:00:00.000Z');

    function mockActiveMatchWithReadState() {
      let user2LastReadAt: Date | null = null;
      prismaMock.mutualMatch.findUnique.mockImplementation(async () => ({
        id: CONVERSATION_ID,
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE' as const,
        createdAt: matchedAt,
        user1LastReadAt: null,
        user2LastReadAt,
      }));
      prismaMock.mutualMatch.update.mockImplementation(
        async (args: { data: { user2LastReadAt?: Date } }) => {
          if (args.data.user2LastReadAt) {
            user2LastReadAt = args.data.user2LastReadAt;
          }
          return {};
        },
      );
      return {
        getUser2LastReadAt: () => user2LastReadAt,
      };
    }

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/me/conversations/${CONVERSATION_ID}/read`)
        .expect(401);
    });

    it('returns 200 with lastReadAt and updates DB column for recipient', async () => {
      const raw = await loginAndCookie();
      mockActiveMatchWithReadState();

      const res = await request(app.getHttpServer())
        .put(`/api/v1/me/conversations/${CONVERSATION_ID}/read`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.lastReadAt).toEqual(expect.any(String));
      expect(prismaMock.mutualMatch.update).toHaveBeenCalledWith({
        where: { id: CONVERSATION_ID },
        data: { user2LastReadAt: expect.any(Date) },
      });
    });

    it('GET detail returns lastReadAt after mark-as-read', async () => {
      const raw = await loginAndCookie();
      const readAt = new Date('2026-06-01T18:30:00.000Z');
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        id: CONVERSATION_ID,
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt: matchedAt,
        user1LastReadAt: null,
        user2LastReadAt: readAt,
      });
      prismaMock.userProfile.findUnique.mockResolvedValue({
        id: 'prof_action_cand',
        userId: CANDIDATE_USER_ID,
        nickname: 'Yonatan',
        gender: 'MALE',
        birthDate: new Date('1988-07-20T00:00:00.000Z'),
        city: 'TLV',
        country: 'IL',
        locationLabel: 'Tel Aviv, IL',
        desiredPartnerGenders: ['FEMALE'],
        photos: [],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.lastReadAt).toBe(readAt.toISOString());
    });

    it('countUnreadForParticipant is 3 before read and 0 after PUT', async () => {
      const raw = await loginAndCookie();
      mockActiveMatchWithReadState();
      prismaMock.message.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);

      const conversations = app.get(MeConversationsService);

      const before = await conversations.countUnreadForParticipant(
        USER_ID,
        CONVERSATION_ID,
      );
      expect(before).toBe(3);

      await request(app.getHttpServer())
        .put(`/api/v1/me/conversations/${CONVERSATION_ID}/read`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      const after = await conversations.countUnreadForParticipant(
        USER_ID,
        CONVERSATION_ID,
      );
      expect(after).toBe(0);
      expect(prismaMock.message.count).toHaveBeenCalledTimes(2);
    });

    it('returns 403 when session user is not a participant', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        id: CONVERSATION_ID,
        userId1: 'user_not_participant',
        userId2: CANDIDATE_USER_ID,
        status: 'ACTIVE',
        createdAt: matchedAt,
        user1LastReadAt: null,
        user2LastReadAt: null,
      });

      const res = await request(app.getHttpServer())
        .put(`/api/v1/me/conversations/${CONVERSATION_ID}/read`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(403);

      expect(res.body).toMatchObject({
        error: 'conversation_forbidden',
        message: 'You do not have access to this conversation.',
      });
      expect(prismaMock.mutualMatch.update).not.toHaveBeenCalled();
    });

    it('returns 404 when conversation does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .put(`/api/v1/me/conversations/${CONVERSATION_ID}/read`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(res.body).toMatchObject({
        error: 'conversation_not_found',
        message: 'Conversation not found.',
      });
    });

    it('returns 404 when conversation is UNMATCHED', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        id: CONVERSATION_ID,
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'UNMATCHED',
        createdAt: matchedAt,
        user1LastReadAt: null,
        user2LastReadAt: null,
      });

      await request(app.getHttpServer())
        .put(`/api/v1/me/conversations/${CONVERSATION_ID}/read`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.mutualMatch.update).not.toHaveBeenCalled();
    });
  });
});
