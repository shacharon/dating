import type { MeMatchItemDto } from '../dto/me-matches-response.dto';
import { MatchRankingService } from './list/ranking/match-ranking.service';

describe('MatchRankingService presentation cache', () => {
  it('buildMatchListRankSnapshot maps presentationJson on ready rows', async () => {
    const ranks = {} as never;
    const matchesQuery = {} as never;
    const obs = { trace: jest.fn() } as never;
    const loader = {} as never;
    const scorer = {} as never;
    const assembler = {} as never;
    const telemetry = {} as never;
    const ranking = new MatchRankingService(
      ranks,
      matchesQuery,
      obs,
      loader,
      scorer,
      assembler,
      telemetry,
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
    } as never);

    const snapshot = await ranking.buildMatchListRankSnapshot('u1');
    expect(snapshot.status).toBe('ready');
    expect(snapshot.rows).toHaveLength(1);
    expect(snapshot.rows[0]?.presentationJson).toMatchObject({
      v: 1,
      explainability: {
        positiveChips: ['Ambition alignment'],
        reasonShort: 'Strong fit',
      },
    });
  });
});
