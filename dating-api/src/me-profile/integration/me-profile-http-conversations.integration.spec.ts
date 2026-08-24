/**
 * Split from me-profile-http.integration.spec.ts (Sprint 63 Story 2).
 * Shared bootstrap: ./me-profile-http.shared-harness.ts
 */
import request from 'supertest';
import { Prisma, UserProfileStatus, UserStatus } from '@prisma/client';
import { ConversationMessageRateLimitService } from '../conversations/conversation-message-rate-limit.service';
import { MeConversationsService } from '../conversations/me-conversations.service';
import type { MeProfileHttpHarness } from './me-profile-http.shared-harness';
import {
  createMeProfileHttpHarness,
  ME_PROFILE_HTTP_PEPPER,
  ME_PROFILE_HTTP_SESSION_COOKIE,
  ME_PROFILE_HTTP_USER_ID,
  parseStructuredJsonLogs,
} from './me-profile-http.shared-harness';
import { createConversationsQueryRawMock } from './repositories/inbox-list-page.spec-support';

describe('me profile HTTP — conversations (integration)', () => {
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
      prismaMock.$queryRaw.mockImplementation(
        createConversationsQueryRawMock({ inboxFixtures: [] }),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/me/conversations')
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .expect(200);

      expect(res.body).toEqual({
        conversations: [],
        nextCursor: null,
        hasMore: false,
      });
      expect(prismaMock.mutualMatch.findMany).not.toHaveBeenCalled();
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it('returns other user profile info for ACTIVE mutual match', async () => {
      const raw = await loginAndCookie();
      const matchedAt = new Date('2026-05-31T14:00:00.000Z');
      prismaMock.$queryRaw.mockImplementation(
        createConversationsQueryRawMock({
          inboxFixtures: [
            {
              id: 'mutual_row_list_1',
              userId1: CANDIDATE_USER_ID,
              userId2: USER_ID,
              matchedAt,
              unreadCount: 0,
            },
          ],
        }),
      );
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
      prismaMock.$queryRaw.mockImplementation(
        createConversationsQueryRawMock({
          inboxFixtures: [
            {
              id: CONVERSATION_ID,
              userId1: CANDIDATE_USER_ID,
              userId2: USER_ID,
              matchedAt: matchedAtNewer,
              unreadCount: 3,
            },
          ],
        }),
      );
      prismaMock.userProfile.findMany.mockResolvedValue([listProfile]);

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
      prismaMock.mutualMatch.update.mockImplementation(
        async (args: { data: { user2LastReadAt?: Date } }) => {
          if (args.data.user2LastReadAt) {
            user2LastReadAt = args.data.user2LastReadAt;
          }
          return {};
        },
      );
      prismaMock.userProfile.findMany.mockResolvedValue([listProfile]);
      prismaMock.$queryRaw.mockImplementation(async (sql) => {
        const handler = createConversationsQueryRawMock({
          inboxFixtures: [
            {
              id: CONVERSATION_ID,
              userId1: CANDIDATE_USER_ID,
              userId2: USER_ID,
              matchedAt: matchedAtNewer,
              user2LastReadAt,
              unreadCount: user2LastReadAt == null ? 3 : 0,
            },
          ],
        });
        return handler(sql);
      });

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
      prismaMock.$queryRaw.mockImplementation(
        createConversationsQueryRawMock({
          inboxFixtures: [
            {
              id: CONVERSATION_READ_ID,
              userId1: CANDIDATE_USER_ID,
              userId2: USER_ID,
              matchedAt: matchedAtNewer,
              user2LastReadAt: new Date('2026-06-01T12:00:00.000Z'),
              unreadCount: 0,
            },
            {
              id: CONVERSATION_ID,
              userId1: CANDIDATE_USER_ID,
              userId2: USER_ID,
              matchedAt: matchedAtOlder,
              unreadCount: 2,
            },
          ],
        }),
      );
      prismaMock.userProfile.findMany.mockResolvedValue([listProfile]);

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
      prismaMock.$queryRaw.mockImplementation(
        createConversationsQueryRawMock({
          inboxFixtures: [
            {
              id: CONVERSATION_ID,
              userId1: CANDIDATE_USER_ID,
              userId2: USER_ID,
              matchedAt,
              unreadCount: 0,
            },
          ],
        }),
      );
      prismaMock.userProfile.findMany.mockResolvedValue([listProfile]);

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
      prismaMock.$queryRaw.mockImplementation(
        createConversationsQueryRawMock({
          inboxFixtures: [
            {
              id: CONVERSATION_ID,
              userId1: CANDIDATE_USER_ID,
              userId2: USER_ID,
              matchedAt,
              unreadCount: 1,
            },
          ],
          lastMessageRows: [
            {
              conversationId: CONVERSATION_ID,
              text: 'latest preview',
              senderId: USER_ID,
              createdAt: sentAt,
            },
          ],
        }),
      );
      prismaMock.userProfile.findMany.mockResolvedValue([listProfile]);

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
        clientMessageId: null,
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
        clientMessageId: null,
        createdAt: createdAt.toISOString(),
        status: 'SENT',
      });
      expect(prismaMock.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: CONVERSATION_ID,
          senderId: USER_ID,
          text: 'Hello!',
          clientMessageId: null,
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

  describe('Sprint 68 Story 2: message send idempotency', () => {
    const CANDIDATE_USER_ID = 'user_match_action_cand_1';
    const CONVERSATION_ID = 'mutual_row_message_idem_1';
    const CLIENT_MESSAGE_ID = '550e8400-e29b-41d4-a716-446655440000';

    const activeMatch = {
      id: CONVERSATION_ID,
      userId1: CANDIDATE_USER_ID,
      userId2: USER_ID,
      status: 'ACTIVE' as const,
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
    };

    type StoredMessage = {
      id: string;
      conversationId: string;
      senderId: string;
      text: string;
      clientMessageId: string | null;
      createdAt: Date;
      status: 'SENT';
    };

    const storedByClientKey = new Map<string, StoredMessage>();

    function clientKey(
      conversationId: string,
      senderId: string,
      clientMessageId: string,
    ): string {
      return `${conversationId}:${senderId}:${clientMessageId}`;
    }

    function installIdempotentMessageMocks(): void {
      storedByClientKey.clear();
      prismaMock.message.findFirst.mockImplementation(
        async (args: {
          where?: {
            conversationId?: string;
            senderId?: string;
            clientMessageId?: string;
          };
        }) => {
          const where = args?.where;
          if (
            where?.conversationId &&
            where?.senderId &&
            where?.clientMessageId
          ) {
            return (
              storedByClientKey.get(
                clientKey(
                  where.conversationId,
                  where.senderId,
                  where.clientMessageId,
                ),
              ) ?? null
            );
          }
          return null;
        },
      );
      prismaMock.message.create.mockImplementation(
        async (args: {
          data: {
            conversationId: string;
            senderId: string;
            text: string;
            clientMessageId?: string | null;
            status: string;
          };
        }) => {
          const row: StoredMessage = {
            id: `msg_idem_${storedByClientKey.size + 1}`,
            conversationId: args.data.conversationId,
            senderId: args.data.senderId,
            text: args.data.text,
            clientMessageId: args.data.clientMessageId ?? null,
            createdAt: new Date('2026-05-31T16:00:00.000Z'),
            status: 'SENT',
          };
          if (args.data.clientMessageId) {
            storedByClientKey.set(
              clientKey(
                args.data.conversationId,
                args.data.senderId,
                args.data.clientMessageId,
              ),
              row,
            );
          }
          return row;
        },
      );
    }

    beforeEach(async () => {
      installIdempotentMessageMocks();
      prismaMock.mutualMatch.findUnique.mockResolvedValue(activeMatch);
      await app.get(ConversationMessageRateLimitService).resetForTests();
    });

    it('returns 201 on idempotent replay with same clientMessageId and one insert', async () => {
      const raw = await loginAndCookie();
      const body = { text: 'Hello!', clientMessageId: CLIENT_MESSAGE_ID };

      const first = await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send(body)
        .expect(201);

      const second = await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send(body)
        .expect(201);

      expect(second.body).toEqual(first.body);
      expect(second.body.clientMessageId).toBe(CLIENT_MESSAGE_ID);
      expect(prismaMock.message.create).toHaveBeenCalledTimes(1);
    });

    it('returns 400 when clientMessageId is not a UUID v4', async () => {
      const raw = await loginAndCookie();

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'Hello!', clientMessageId: 'not-a-uuid' })
        .expect(400);

      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('returns 409 when clientMessageId matches but text differs', async () => {
      const raw = await loginAndCookie();
      storedByClientKey.set(clientKey(CONVERSATION_ID, USER_ID, CLIENT_MESSAGE_ID), {
        id: 'msg_conflict',
        conversationId: CONVERSATION_ID,
        senderId: USER_ID,
        text: 'Original',
        clientMessageId: CLIENT_MESSAGE_ID,
        createdAt: new Date('2026-05-31T16:00:00.000Z'),
        status: 'SENT',
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'Different', clientMessageId: CLIENT_MESSAGE_ID })
        .expect(409);

      expect(res.body).toMatchObject({
        error: 'message_idempotency_conflict',
      });
      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });

    it('does not consume rate limit on idempotent replay', async () => {
      const raw = await loginAndCookie();
      const idempotentBody = {
        text: 'Hello!',
        clientMessageId: CLIENT_MESSAGE_ID,
      };

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send(idempotentBody)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send(idempotentBody)
        .expect(201);

      for (let i = 0; i < 8; i++) {
        await request(app.getHttpServer())
          .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
          .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
          .send({ text: `Unique ${i}` })
          .expect(201);
      }

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'Tenth unique' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/me/conversations/${CONVERSATION_ID}/messages`)
        .set('Cookie', [`${SESSION_COOKIE}=${raw}`])
        .send({ text: 'Eleventh unique' })
        .expect(429);
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

  // ─── Sprint 1 Story 4: DELETE /api/v1/me/matches/:id/actions ───────────

});
