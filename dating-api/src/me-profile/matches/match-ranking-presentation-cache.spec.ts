import type { MeMatchItemDto } from '../dto/me-matches-response.dto';
import { MatchEligibilityService } from './match-eligibility.service';
import { MatchRankingService } from './match-ranking.service';
import { HgGateLegacyRankPolicy } from '../../matching-policy/hg-gate-legacy-rank.policy';

describe('MatchRankingService presentation cache', () => {
  it('buildMatchListRankSnapshot maps presentationJson on ready rows', async () => {
    const matches = {} as never;
    const ranks = {} as never;
    const obs = { trace: jest.fn() } as never;
    const analytics = { track: jest.fn() } as never;
    const eligibility = new MatchEligibilityService(matches, obs);
    const ranking = new MatchRankingService(
      matches,
      ranks,
      obs,
      analytics,
      eligibility,
      new HgGateLegacyRankPolicy(),
    );

    jest.spyOn(ranking, 'buildFullRankedList').mockResolvedValue({
      status: 'ready',
      matches: [
        {
          id: 'p1',
          matchScore: 88,
          explainability: {
            positiveChips: ['Ambition alignment'],
            reasonShort: 'Strong fit',
          },
          recommendation: {
            explainability: {
              positiveChips: ['Ambition alignment'],
              reasonShort: 'Strong fit',
            },
            primaryTakeaway: 'Strong match',
            suggestedNextAction: 'Start a conversation',
          },
        } as MeMatchItemDto,
      ],
    });

    const snapshot = await ranking.buildMatchListRankSnapshot('user_v');

    expect(snapshot.status).toBe('ready');
    expect(snapshot.rows).toEqual([
      expect.objectContaining({
        candidateProfileId: 'p1',
        matchScore: 88,
        hardBlocked: false,
        presentationJson: expect.objectContaining({
          v: 1,
          explainability: expect.objectContaining({
            positiveChips: ['Ambition alignment'],
          }),
          recommendation: expect.objectContaining({
            primaryTakeaway: 'Strong match',
          }),
        }),
      }),
    ]);
  });
});
