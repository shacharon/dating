/**
 * Sub-split from me-profile-http-conversations.integration.spec.ts (Sprint 69 Story 02).
 * GET/DELETE /conversations/:id.
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

describe('me profile HTTP — conversations detail (integration)', () => {
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

  describe('Sprint 2 Story 3: GET /api/v1/me/conversations/:id', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_detail_1';

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .expect(401);
    });

    it('returns 404 when conversation does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}`)
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
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
      });

      await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);
    });

    it('returns 403 when session user is not a participant', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        id: CONVERSATION_ID,
        userId1: 'user_not_participant',
        userId2: CANDIDATE_USER_ID,
        status: 'ACTIVE',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(403);

      expect(res.body).toMatchObject({
        error: 'conversation_forbidden',
        message: 'You do not have access to this conversation.',
      });
    });

    it('returns 200 with conversation detail for participant', async () => {
      const raw = await loginAndCookie();
      const matchedAt = new Date('2026-05-31T14:00:00.000Z');
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        id: CONVERSATION_ID,
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt: matchedAt,
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
        photos: [{ id: 'photo_conv_primary', isPrimary: true }],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toMatchObject({
        id: CONVERSATION_ID,
        matchedAt: matchedAt.toISOString(),
        status: 'ACTIVE',
        lastReadAt: null,
        otherUser: {
          id: CANDIDATE_USER_ID,
          profileId: 'prof_action_cand',
          nickname: 'Yonatan',
          gender: 'MALE',
          locationLabel: 'Tel Aviv, IL',
          photoUrl:
            '/api/v1/me/matches/prof_action_cand/photos/photo_conv_primary/file',
        },
      });
    });
  });

  // ─── Sprint 2 Story 5: DELETE /api/v1/me/conversations/:id ──────────────

  describe('Sprint 2 Story 5: DELETE /api/v1/me/conversations/:id', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_unmatch_1';

    const activeMatch = {
      id: CONVERSATION_ID,
      userId1: CANDIDATE_USER_ID,
      userId2: USER_ID,
      status: 'ACTIVE' as const,
    };

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .expect(401);
    });

    it('returns 404 when conversation does not exist', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(res.body).toMatchObject({
        error: 'conversation_not_found',
        message: 'Conversation not found.',
      });
      expect(prismaMock.mutualMatch.update).not.toHaveBeenCalled();
    });

    it('returns 404 when conversation is already UNMATCHED', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        ...activeMatch,
        status: 'UNMATCHED',
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.mutualMatch.update).not.toHaveBeenCalled();
    });

    it('returns 403 when session user is not a participant', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue({
        ...activeMatch,
        userId1: 'user_not_participant',
        userId2: CANDIDATE_USER_ID,
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(403);

      expect(res.body).toMatchObject({
        error: 'conversation_forbidden',
        message: 'You do not have access to this conversation.',
      });
      expect(prismaMock.mutualMatch.update).not.toHaveBeenCalled();
    });

    it('returns 204 and soft-unmatches ACTIVE conversation for participant', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      prismaMock.mutualMatch.update.mockResolvedValue({});

      await request(app.getHttpServer())
        .delete(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(204);

      expect(prismaMock.mutualMatch.update).toHaveBeenCalledWith({
        where: { id: CONVERSATION_ID },
        data: expect.objectContaining({
          status: 'UNMATCHED',
          unmatchedByUserId: USER_ID,
          unmatchedAt: expect.any(Date),
        }),
      });
    });

    it('returns 404 on second DELETE after unmatch', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findUnique
        .mockResolvedValueOnce(activeMatch)
        .mockResolvedValueOnce({
          ...activeMatch,
          status: 'UNMATCHED',
        });
      prismaMock.mutualMatch.update.mockResolvedValue({});

      await request(app.getHttpServer())
        .delete(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(204);

      await request(app.getHttpServer())
        .delete(`/api/v1/me/conversations/${CONVERSATION_ID}`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(404);

      expect(prismaMock.mutualMatch.update).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Sprint 3 Story 1: POST /api/v1/me/conversations/:id/messages ───────

});
