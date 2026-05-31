import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MatchActionType } from '@prisma/client';
import { MeMatchActionsService } from './me-match-actions.service';
import type { MeMatchesService } from './me-matches.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('MeMatchActionsService', () => {
  const prisma = {
    matchAction: { findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
  } as unknown as PrismaService;

  const meMatches = {
    assertMatchCandidateVisible: jest.fn(),
  } as unknown as MeMatchesService;

  let service: MeMatchActionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MeMatchActionsService(prisma, meMatches);
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
    });
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
    });
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
    });
  });

  it('returns null action when no row exists', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    (prisma.matchAction.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.getActionState('actor-1', 'prof-cand')).resolves.toEqual({
      action: null,
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

    await expect(service.getActionState('actor-1', 'prof-cand')).resolves.toEqual({
      action: 'LIKE',
      createdAt: createdAt.toISOString(),
    });
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
