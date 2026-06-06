import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MatchActionType, MutualMatchStatus } from '@prisma/client';
import { MeMatchActionsService } from './me-match-actions.service';
import type { MeMatchesService } from './me-matches.service';
import type { MutualMatchesService } from './mutual-matches.service';
import type { AnalyticsService } from '../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import type { MutualMatchEmailService } from '../notifications/mutual-match-email.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('MeMatchActionsService', () => {
  const prisma = {
    matchAction: { findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const meMatches = {
    assertMatchCandidateVisible: jest.fn(),
  } as unknown as MeMatchesService;

  const mutualMatches = {
    detectAndCreateMutualMatch: jest.fn(),
    findActiveByUserPair: jest.fn(),
  } as unknown as MutualMatchesService;

  const mutualMatchEmail = {
    notifyNewMutualMatchBestEffort: jest.fn().mockResolvedValue(undefined),
  } as unknown as MutualMatchEmailService;

  const analytics = {
    track: jest.fn(),
  } as unknown as AnalyticsService;

  let service: MeMatchActionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn(prisma),
    );
    service = new MeMatchActionsService(
      prisma,
      meMatches,
      mutualMatches,
      mutualMatchEmail,
      analytics,
    );
  });

  it('upserts BLOCK with user-to-user identity', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    const createdAt = new Date('2026-05-31T10:00:00.000Z');
    (prisma.matchAction.upsert as jest.Mock).mockResolvedValue({
      id: 'action-block',
      actorUserId: 'actor-1',
      targetUserId: 'target-user',
      targetProfileIdSnapshot: 'prof-cand',
      action: MatchActionType.BLOCK,
      createdAt,
    });

    const result = await service.createAction(
      'actor-1',
      'prof-cand',
      MatchActionType.BLOCK,
    );

    expect(result).toEqual({
      id: 'action-block',
      actorUserId: 'actor-1',
      targetUserId: 'target-user',
      targetProfileIdSnapshot: 'prof-cand',
      action: 'BLOCK',
      createdAt: createdAt.toISOString(),
      mutualMatch: false,
      conversationId: null,
    });
    expect(mutualMatches.detectAndCreateMutualMatch).not.toHaveBeenCalled();
  });

  it('BLOCK upsert overwrites existing LIKE row', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    const createdAt = new Date('2026-05-31T10:00:00.000Z');
    (prisma.matchAction.upsert as jest.Mock).mockResolvedValue({
      id: 'action-1',
      actorUserId: 'actor-1',
      targetUserId: 'target-user',
      targetProfileIdSnapshot: 'prof-cand',
      action: MatchActionType.BLOCK,
      createdAt,
    });

    await service.createAction('actor-1', 'prof-cand', MatchActionType.BLOCK);

    expect(prisma.matchAction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ action: MatchActionType.BLOCK }),
      }),
    );
  });

  it('upserts PASS with user-to-user identity', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    const createdAt = new Date('2026-05-31T10:00:00.000Z');
    (prisma.matchAction.upsert as jest.Mock).mockResolvedValue({
      id: 'action-2',
      actorUserId: 'actor-1',
      targetUserId: 'target-user',
      targetProfileIdSnapshot: 'prof-cand',
      action: MatchActionType.PASS,
      createdAt,
    });

    const result = await service.createAction(
      'actor-1',
      'prof-cand',
      MatchActionType.PASS,
    );

    expect(result).toEqual({
      id: 'action-2',
      actorUserId: 'actor-1',
      targetUserId: 'target-user',
      targetProfileIdSnapshot: 'prof-cand',
      action: 'PASS',
      createdAt: createdAt.toISOString(),
      mutualMatch: false,
      conversationId: null,
    });
    expect(mutualMatches.detectAndCreateMutualMatch).not.toHaveBeenCalled();
  });

  it('rejects self-action after match visibility passes', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-self',
      targetUserId: 'actor-1',
    });

    await expect(
      service.createAction('actor-1', 'prof-self', MatchActionType.LIKE),
    ).rejects.toMatchObject({
      response: { message: 'Cannot act on yourself', statusCode: 400 },
    });
    expect(prisma.matchAction.upsert).not.toHaveBeenCalled();
  });

  it('upserts LIKE with user-to-user identity', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    const createdAt = new Date('2026-05-31T10:00:00.000Z');
    (prisma.matchAction.upsert as jest.Mock).mockResolvedValue({
      id: 'action-1',
      actorUserId: 'actor-1',
      targetUserId: 'target-user',
      targetProfileIdSnapshot: 'prof-cand',
      action: MatchActionType.LIKE,
      createdAt,
    });
    (mutualMatches.detectAndCreateMutualMatch as jest.Mock).mockResolvedValue(null);

    const result = await service.createAction(
      'actor-1',
      'prof-cand',
      MatchActionType.LIKE,
    );

    expect(result).toEqual({
      id: 'action-1',
      actorUserId: 'actor-1',
      targetUserId: 'target-user',
      targetProfileIdSnapshot: 'prof-cand',
      action: 'LIKE',
      createdAt: createdAt.toISOString(),
      mutualMatch: false,
      conversationId: null,
    });
    expect(mutualMatches.detectAndCreateMutualMatch).toHaveBeenCalledWith(
      'actor-1',
      'target-user',
      prisma,
    );
    expect(analytics.track).toHaveBeenCalledWith(
      'actor-1',
      ProductAnalyticsEvents.MATCH_ACTION,
      { action: 'like', candidateProfileId: 'prof-cand' },
    );
  });

  it('returns mutualMatch true and conversationId when detection returns ACTIVE row', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    const createdAt = new Date('2026-05-31T10:00:00.000Z');
    (prisma.matchAction.upsert as jest.Mock).mockResolvedValue({
      id: 'action-1',
      actorUserId: 'actor-1',
      targetUserId: 'target-user',
      targetProfileIdSnapshot: 'prof-cand',
      action: MatchActionType.LIKE,
      createdAt,
    });
    (mutualMatches.detectAndCreateMutualMatch as jest.Mock).mockResolvedValue({
      created: true,
      mutualMatch: {
        id: 'mutual_row_1',
        userId1: 'actor-1',
        userId2: 'target-user',
        status: MutualMatchStatus.ACTIVE,
        createdAt,
        unmatchedAt: null,
        unmatchedByUserId: null,
      },
    });

    const result = await service.createAction(
      'actor-1',
      'prof-cand',
      MatchActionType.LIKE,
    );

    expect(result).toMatchObject({
      action: 'LIKE',
      mutualMatch: true,
      conversationId: 'mutual_row_1',
    });
    expect(mutualMatchEmail.notifyNewMutualMatchBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'mutual_row_1' }),
    );
    expect(analytics.track).toHaveBeenCalledWith(
      'actor-1',
      ProductAnalyticsEvents.MATCH_MUTUAL_CREATED,
      { mutualMatchId: 'mutual_row_1', otherUserId: 'target-user' },
    );
    expect(analytics.track).toHaveBeenCalledWith(
      'target-user',
      ProductAnalyticsEvents.MATCH_MUTUAL_CREATED,
      { mutualMatchId: 'mutual_row_1', otherUserId: 'actor-1' },
    );
  });

  it('does not notify email when mutual match already existed', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    const createdAt = new Date('2026-05-31T10:00:00.000Z');
    (prisma.matchAction.upsert as jest.Mock).mockResolvedValue({
      id: 'action-1',
      actorUserId: 'actor-1',
      targetUserId: 'target-user',
      targetProfileIdSnapshot: 'prof-cand',
      action: MatchActionType.LIKE,
      createdAt,
    });
    (mutualMatches.detectAndCreateMutualMatch as jest.Mock).mockResolvedValue({
      created: false,
      mutualMatch: {
        id: 'mutual_row_1',
        userId1: 'actor-1',
        userId2: 'target-user',
        status: MutualMatchStatus.ACTIVE,
        createdAt,
        unmatchedAt: null,
        unmatchedByUserId: null,
      },
    });

    await service.createAction('actor-1', 'prof-cand', MatchActionType.LIKE);

    expect(mutualMatchEmail.notifyNewMutualMatchBestEffort).not.toHaveBeenCalled();
    expect(analytics.track).not.toHaveBeenCalledWith(
      expect.anything(),
      ProductAnalyticsEvents.MATCH_MUTUAL_CREATED,
      expect.anything(),
    );
  });

  it('returns mutualMatch false when detection returns UNMATCHED row', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    const createdAt = new Date('2026-05-31T10:00:00.000Z');
    (prisma.matchAction.upsert as jest.Mock).mockResolvedValue({
      id: 'action-1',
      actorUserId: 'actor-1',
      targetUserId: 'target-user',
      targetProfileIdSnapshot: 'prof-cand',
      action: MatchActionType.LIKE,
      createdAt,
    });
    (mutualMatches.detectAndCreateMutualMatch as jest.Mock).mockResolvedValue({
      created: false,
      mutualMatch: {
        id: 'mutual_row_unmatched',
        userId1: 'actor-1',
        userId2: 'target-user',
        status: MutualMatchStatus.UNMATCHED,
        createdAt,
        unmatchedAt: createdAt,
        unmatchedByUserId: 'actor-1',
      },
    });

    const result = await service.createAction(
      'actor-1',
      'prof-cand',
      MatchActionType.LIKE,
    );

    expect(result).toMatchObject({
      action: 'LIKE',
      mutualMatch: false,
      conversationId: null,
    });
  });

  it('returns null action when no row exists', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    (prisma.matchAction.findUnique as jest.Mock).mockResolvedValue(null);
    (mutualMatches.findActiveByUserPair as jest.Mock).mockResolvedValue(null);

    await expect(service.getActionState('actor-1', 'prof-cand')).resolves.toEqual({
      action: null,
      mutualMatch: false,
      conversationId: null,
    });
  });

  it('returns action state when row exists', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    const createdAt = new Date('2026-05-31T10:00:00.000Z');
    (prisma.matchAction.findUnique as jest.Mock).mockResolvedValue({
      action: MatchActionType.LIKE,
      createdAt,
    });
    (mutualMatches.findActiveByUserPair as jest.Mock).mockResolvedValue(null);

    await expect(service.getActionState('actor-1', 'prof-cand')).resolves.toEqual({
      action: 'LIKE',
      createdAt: createdAt.toISOString(),
      mutualMatch: false,
      conversationId: null,
    });
  });

  it('returns mutualMatch true on getActionState when ACTIVE mutual exists', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    const createdAt = new Date('2026-05-31T10:00:00.000Z');
    (prisma.matchAction.findUnique as jest.Mock).mockResolvedValue({
      action: MatchActionType.LIKE,
      createdAt,
    });
    (mutualMatches.findActiveByUserPair as jest.Mock).mockResolvedValue({
      id: 'mutual_row_1',
      userId1: 'actor-1',
      userId2: 'target-user',
      status: MutualMatchStatus.ACTIVE,
      createdAt,
      unmatchedAt: null,
      unmatchedByUserId: null,
    });

    await expect(service.getActionState('actor-1', 'prof-cand')).resolves.toEqual({
      action: 'LIKE',
      createdAt: createdAt.toISOString(),
      mutualMatch: true,
      conversationId: 'mutual_row_1',
    });
    expect(mutualMatches.findActiveByUserPair).toHaveBeenCalledWith(
      'actor-1',
      'target-user',
    );
  });

  it('deletes LIKE row on undo', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    (prisma.matchAction.findUnique as jest.Mock).mockResolvedValue({
      action: MatchActionType.LIKE,
    });
    (prisma.matchAction.delete as jest.Mock).mockResolvedValue({});

    await expect(
      service.deleteAction('actor-1', 'prof-cand'),
    ).resolves.toBeUndefined();

    expect(prisma.matchAction.delete).toHaveBeenCalledWith({
      where: {
        actorUserId_targetUserId: {
          actorUserId: 'actor-1',
          targetUserId: 'target-user',
        },
      },
    });
    expect(analytics.track).toHaveBeenCalledWith(
      'actor-1',
      ProductAnalyticsEvents.MATCH_ACTION,
      { action: 'undo', candidateProfileId: 'prof-cand' },
    );
  });

  it('throws NotFoundException when no row to undo', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    (prisma.matchAction.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.deleteAction('actor-1', 'prof-cand')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.matchAction.delete).not.toHaveBeenCalled();
  });

  it('rejects undo of BLOCK', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    (prisma.matchAction.findUnique as jest.Mock).mockResolvedValue({
      action: MatchActionType.BLOCK,
    });

    await expect(service.deleteAction('actor-1', 'prof-cand')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.matchAction.delete).not.toHaveBeenCalled();
  });
});
