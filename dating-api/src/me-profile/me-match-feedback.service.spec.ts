import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MatchFeedbackSentiment } from '@prisma/client';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import { ErrorCodes } from '../logging/error-codes';
import type { AnalyticsService } from '../analytics/analytics.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import { MeMatchFeedbackService } from './me-match-feedback.service';
import type { MeMatchesService } from './me-matches.service';
import type { IMatchFeedbackRepository } from './repositories/match-feedback.repository';

describe('MeMatchFeedbackService', () => {
  const feedback = {
    findSentiment: jest.fn(),
    upsertSentiment: jest.fn(),
  } as unknown as IMatchFeedbackRepository;

  const meMatches = {
    assertMatchCandidateVisible: jest.fn(),
  } as unknown as MeMatchesService;

  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;
  const analytics = { track: jest.fn() } as unknown as AnalyticsService;

  let service: MeMatchFeedbackService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MeMatchFeedbackService(feedback, meMatches, obs, analytics);
  });

  it('getFeedback returns null when no row exists', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    (feedback.findSentiment as jest.Mock).mockResolvedValue(null);

    await expect(service.getFeedback('actor-1', 'prof-cand')).resolves.toEqual({
      sentiment: null,
    });
  });

  it('getFeedback returns stored sentiment', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    (feedback.findSentiment as jest.Mock).mockResolvedValue('positive');

    await expect(service.getFeedback('actor-1', 'prof-cand')).resolves.toEqual({
      sentiment: 'POSITIVE',
    });
  });

  it('getFeedback propagates visibility NotFoundException', async () => {
    meMatches.assertMatchCandidateVisible.mockRejectedValue(
      new NotFoundException('Match not found.'),
    );

    await expect(
      service.getFeedback('actor-1', 'prof-cand'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('upsertFeedback rejects self feedback', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-self',
      targetUserId: 'actor-1',
    });

    await expect(
      service.upsertFeedback('actor-1', 'prof-self', 'positive'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(feedback.upsertSentiment).not.toHaveBeenCalled();
  });

  it('upsertFeedback creates POSITIVE row and tracks analytics', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    const createdAt = new Date('2026-06-06T10:00:00.000Z');
    const updatedAt = new Date('2026-06-06T10:00:00.000Z');
    (feedback.upsertSentiment as jest.Mock).mockResolvedValue({
      matchProfileId: 'prof-cand',
      sentiment: MatchFeedbackSentiment.POSITIVE,
      createdAt,
      updatedAt,
    });

    const result = await service.upsertFeedback(
      'actor-1',
      'prof-cand',
      'positive',
    );

    expect(result).toEqual({
      matchProfileId: 'prof-cand',
      sentiment: 'POSITIVE',
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
    expect(feedback.upsertSentiment).toHaveBeenCalledWith({
      userId: 'actor-1',
      matchProfileId: 'prof-cand',
      sentiment: 'positive',
    });
    expect(analytics.track).toHaveBeenCalledWith(
      'actor-1',
      ProductAnalyticsEvents.MATCH_FEEDBACK,
      { sentiment: 'positive' },
    );
    expect(
      (analytics.track as jest.Mock).mock.calls.find(
        (call) => call[1] === ProductAnalyticsEvents.MATCH_FEEDBACK,
      )?.[2],
    ).not.toHaveProperty('matchProfileId');
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('event=match_feedback_upserted'),
      ErrorCodes.MATCH_FEEDBACK_UPSERTED,
    );
  });

  it('upsertFeedback updates to NEGATIVE on change', async () => {
    meMatches.assertMatchCandidateVisible.mockResolvedValue({
      candidateProfileId: 'prof-cand',
      targetUserId: 'target-user',
    });
    const createdAt = new Date('2026-06-06T10:00:00.000Z');
    const updatedAt = new Date('2026-06-06T11:00:00.000Z');
    (feedback.upsertSentiment as jest.Mock).mockResolvedValue({
      matchProfileId: 'prof-cand',
      sentiment: MatchFeedbackSentiment.NEGATIVE,
      createdAt,
      updatedAt,
    });

    const result = await service.upsertFeedback(
      'actor-1',
      'prof-cand',
      'negative',
    );

    expect(result.sentiment).toBe('NEGATIVE');
    expect(analytics.track).toHaveBeenCalledWith(
      'actor-1',
      ProductAnalyticsEvents.MATCH_FEEDBACK,
      { sentiment: 'negative' },
    );
  });
});
