/**
 * Sub-split from me-profile-http-conversations.integration.spec.ts (Sprint 69 Story 02).
 * GET /conversations, unread counts, lastMessage.
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

describe('me profile HTTP — conversations list (integration)', () => {
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

  describe('Sprint 2 Story 2: GET /api/v1/me/conversations', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';

    it('returns 401 without session', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .expect(401);
    });

    it('returns 200 with empty list when no ACTIVE mutual matches', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({
        conversations: [],
        nextCursor: null,
        hasMore: false,
      });
      expect(prismaMock.mutualMatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            OR: [{ userId1: USER_ID }, { userId2: USER_ID }],
          }),
        }),
      );
    });

    it('returns other user profile info for ACTIVE mutual match', async () => {
      const raw = await loginAndCookie();
      const matchedAt = new Date('2026-05-31T14:00:00.000Z');
      prismaMock.mutualMatch.findMany.mockResolvedValue([
        {
          id: 'mutual_row_list_1',
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          createdAt: matchedAt,
          user1LastReadAt: null,
          user2LastReadAt: null,
        },
      ]);
      prismaMock.userProfile.findMany.mockResolvedValue([
        {
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
        },
      ]);
      prismaMock.message.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.conversations).toHaveLength(1);
      expect(res.body.conversations[0]).toMatchObject({
        id: 'mutual_row_list_1',
        matchedAt: matchedAt.toISOString(),
        unreadCount: 0,
        lastMessage: null,
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
      expect(typeof res.body.conversations[0].otherUser.ageYears).toBe('number');
      expect(res.body.nextCursor).toBeNull();
      expect(res.body.hasMore).toBe(false);
    });

    it('GET match photo returns 200 when ACTIVE mutual exists despite gender ineligibility', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findFirst.mockResolvedValue({
        id: 'mutual_row_photo_1',
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
        unmatchedAt: null,
        unmatchedByUserId: null,
      });
      prismaMock.userProfile.findUnique.mockImplementation(
        async (args: { where: { id?: string } }) => {
          if (args.where.id === 'prof_action_cand') {
            return {
              id: 'prof_action_cand',
              userId: CANDIDATE_USER_ID,
              status: UserProfileStatus.ANALYZED,
              gender: 'MALE' as const,
              desiredPartnerGenders: ['MALE'],
              birthDate: new Date('1988-07-20T00:00:00.000Z'),
              city: 'TLV',
              country: 'IL',
              locationLabel: 'Tel Aviv, IL',
              aboutMe: null,
              aboutPartner: null,
              aboutRelationship: null,
              preference: null,
            };
          }
          return null;
        },
      );
      prismaMock.userProfilePhoto.findFirst.mockResolvedValue({
        mimeType: 'image/jpeg',
        storageKey: 'photos/conv-test.jpg',
      });
      photoStorageMock.read.mockResolvedValue(Buffer.from([9, 8, 7]));

      await request(app.getHttpServer())
        .get(
          '/api/v1/me/matches/prof_action_cand/photos/photo_conv_primary/file',
        )
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(prismaMock.mutualMatch.findFirst).toHaveBeenCalled();
      expect(photoStorageMock.read).toHaveBeenCalledWith('photos/conv-test.jpg');
    });
  });

  // ─── Sprint 3 Story 5: GET /api/v1/me/conversations unreadCount ────────

  describe('Sprint 3 Story 5: GET /api/v1/me/conversations unreadCount', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_unread_list_1';
    const CONVERSATION_READ_ID = 'mutual_row_unread_list_2';
    const matchedAtNewer = new Date('2026-05-31T14:00:00.000Z');
    const matchedAtOlder = new Date('2026-05-30T10:00:00.000Z');

    const listProfile = {
      id: 'prof_action_cand',
      userId: CANDIDATE_USER_ID,
      nickname: 'Yonatan',
      gender: 'MALE' as const,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      desiredPartnerGenders: ['FEMALE'],
      photos: [{ id: 'photo_conv_primary', isPrimary: true }],
    };

    it('returns unreadCount 3 when peer messages exist and lastReadAt is null', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findMany.mockResolvedValue([
        {
          id: CONVERSATION_ID,
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          createdAt: matchedAtNewer,
          user1LastReadAt: null,
          user2LastReadAt: null,
        },
      ]);
      prismaMock.userProfile.findMany.mockResolvedValue([listProfile]);
      prismaMock.$queryRaw.mockImplementation(
        async (sql: { strings?: readonly string[] }) => {
          const sqlText = Array.isArray(sql.strings) ? sql.strings.join(' ') : '';
          if (sqlText.includes('DISTINCT ON')) {
            return [];
          }
          if (sqlText.includes('UNNEST')) {
            return [{ conversationId: CONVERSATION_ID, cnt: 3 }];
          }
          return [];
        },
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.conversations[0].unreadCount).toBe(3);
      expect(res.body.conversations[0].lastMessage).toBeNull();
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      expect(prismaMock.message.count).not.toHaveBeenCalled();
    });

    it('returns unreadCount 0 after mark-as-read then list', async () => {
      const raw = await loginAndCookie();
      let user2LastReadAt: Date | null = null;
      prismaMock.mutualMatch.findUnique.mockImplementation(async () => ({
        id: CONVERSATION_ID,
        userId1: CANDIDATE_USER_ID,
        userId2: USER_ID,
        status: 'ACTIVE' as const,
        createdAt: matchedAtNewer,
        user1LastReadAt: null,
        user2LastReadAt,
      }));
      prismaMock.mutualMatch.findMany.mockImplementation(async () => [
        {
          id: CONVERSATION_ID,
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          createdAt: matchedAtNewer,
          user1LastReadAt: null,
          user2LastReadAt,
        },
      ]);
      prismaMock.mutualMatch.update.mockImplementation(
        async (args: { data: { user2LastReadAt?: Date } }) => {
          if (args.data.user2LastReadAt) {
            user2LastReadAt = args.data.user2LastReadAt;
          }
          return {};
        },
      );
      prismaMock.userProfile.findMany.mockResolvedValue([listProfile]);
      prismaMock.$queryRaw.mockImplementation(
        async (sql: { strings?: readonly string[] }) => {
          const sqlText = Array.isArray(sql.strings) ? sql.strings.join(' ') : '';
          if (sqlText.includes('DISTINCT ON')) {
            return [];
          }
          if (sqlText.includes('UNNEST')) {
            return user2LastReadAt == null
              ? [{ conversationId: CONVERSATION_ID, cnt: 3 }]
              : [];
          }
          return [];
        },
      );

      const before = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);
      expect(before.body.conversations[0].unreadCount).toBe(3);

      await request(app.getHttpServer())
        .put(`/api/v1/me/conversations/${CONVERSATION_ID}/read`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      const after = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);
      expect(after.body.conversations[0].unreadCount).toBe(0);
    });

    it('sorts conversations with unread before read', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findMany.mockResolvedValue([
        {
          id: CONVERSATION_READ_ID,
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          createdAt: matchedAtNewer,
          user1LastReadAt: null,
          user2LastReadAt: new Date('2026-06-01T12:00:00.000Z'),
        },
        {
          id: CONVERSATION_ID,
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          createdAt: matchedAtOlder,
          user1LastReadAt: null,
          user2LastReadAt: null,
        },
      ]);
      prismaMock.userProfile.findMany.mockResolvedValue([listProfile]);
      prismaMock.$queryRaw.mockImplementation(
        async (sql: { strings?: readonly string[] }) => {
          const sqlText = Array.isArray(sql.strings) ? sql.strings.join(' ') : '';
          if (sqlText.includes('DISTINCT ON')) {
            return [];
          }
          if (sqlText.includes('UNNEST')) {
            return [{ conversationId: CONVERSATION_ID, cnt: 2 }];
          }
          return [];
        },
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.conversations).toHaveLength(2);
      expect(res.body.conversations[0].id).toBe(CONVERSATION_ID);
      expect(res.body.conversations[0].unreadCount).toBe(2);
      expect(res.body.conversations[1].id).toBe(CONVERSATION_READ_ID);
      expect(res.body.conversations[1].unreadCount).toBe(0);
    });

    it('GET /api/v1/me/conversations/unread-total returns sum of unread', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findMany.mockResolvedValue([
        {
          id: CONVERSATION_ID,
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          status: 'ACTIVE' as const,
          createdAt: new Date('2026-05-31T10:00:00.000Z'),
          user1LastReadAt: null,
          user2LastReadAt: null,
        },
      ]);
      prismaMock.$queryRaw.mockImplementation(
        async (sql: { strings?: readonly string[] }) => {
          const sqlText = Array.isArray(sql.strings) ? sql.strings.join(' ') : '';
          if (sqlText.includes('UNNEST')) {
            return [{ conversationId: CONVERSATION_ID, cnt: 4 }];
          }
          return [];
        },
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/conversations/unread-total')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({ totalUnread: 4 });
    });
  });

  // ─── Sprint 34 Story 1: GET /api/v1/me/conversations lastMessage ───────

  describe('Sprint 34 Story 1: GET /api/v1/me/conversations lastMessage', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_last_msg_1';
    const matchedAt = new Date('2026-05-31T14:00:00.000Z');
    const listProfile = {
      id: 'prof_action_cand',
      userId: CANDIDATE_USER_ID,
      nickname: 'Yonatan',
      gender: 'MALE' as const,
      birthDate: new Date('1988-07-20T00:00:00.000Z'),
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      desiredPartnerGenders: ['FEMALE'],
      photos: [{ id: 'photo_conv_primary', isPrimary: true }],
    };

    it('returns lastMessage null when no SENT messages', async () => {
      const raw = await loginAndCookie();
      prismaMock.mutualMatch.findMany.mockResolvedValue([
        {
          id: CONVERSATION_ID,
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          createdAt: matchedAt,
          user1LastReadAt: null,
          user2LastReadAt: null,
        },
      ]);
      prismaMock.userProfile.findMany.mockResolvedValue([listProfile]);
      prismaMock.$queryRaw.mockImplementation(
        async (sql: { strings?: readonly string[] }) => {
          const sqlText = Array.isArray(sql.strings) ? sql.strings.join(' ') : '';
          if (sqlText.includes('DISTINCT ON') || sqlText.includes('UNNEST')) {
            return [];
          }
          return [];
        },
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.conversations[0].lastMessage).toBeNull();
      expect(res.body.conversations[0].unreadCount).toBe(0);
    });

    it('returns lastMessage for newest SENT row', async () => {
      const raw = await loginAndCookie();
      const sentAt = new Date('2026-08-01T16:00:00.000Z');
      prismaMock.mutualMatch.findMany.mockResolvedValue([
        {
          id: CONVERSATION_ID,
          userId1: CANDIDATE_USER_ID,
          userId2: USER_ID,
          createdAt: matchedAt,
          user1LastReadAt: null,
          user2LastReadAt: null,
        },
      ]);
      prismaMock.userProfile.findMany.mockResolvedValue([listProfile]);
      prismaMock.$queryRaw.mockImplementation(
        async (sql: { strings?: readonly string[] }) => {
          const sqlText = Array.isArray(sql.strings) ? sql.strings.join(' ') : '';
          if (sqlText.includes('DISTINCT ON')) {
            return [
              {
                conversationId: CONVERSATION_ID,
                text: 'latest preview',
                senderId: USER_ID,
                createdAt: sentAt,
              },
            ];
          }
          if (sqlText.includes('UNNEST')) {
            return [{ conversationId: CONVERSATION_ID, cnt: 1 }];
          }
          return [];
        },
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body.conversations[0].lastMessage).toEqual({
        text: 'latest preview',
        senderId: USER_ID,
        sentAt: sentAt.toISOString(),
      });
      expect(res.body.conversations[0].unreadCount).toBe(1);
    });
  });

  // ─── Sprint 2 Story 3: GET /api/v1/me/conversations/:id ─────────────────

});
