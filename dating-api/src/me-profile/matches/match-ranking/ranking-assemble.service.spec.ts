import type { MeMatchItemDto } from '../../dto/me-matches-response.dto';
import { MatchEligibilityService } from '../match-eligibility.service';
import { RankingAssembleService } from './ranking-assemble.service';
import {
  defaultListOptions,
  makeEmptyScoreResult,
  makeMatchQueryRepoMock,
  makeRankingPool,
  makeRankingViewerReady,
} from './ranking.spec-support';

function matchItem(
  overrides: Partial<MeMatchItemDto> & { id: string },
): MeMatchItemDto {
  return {
    id: overrides.id,
    nickname: overrides.nickname ?? null,
    gender: overrides.gender ?? 'FEMALE',
    ageYears: overrides.ageYears ?? 30,
    locationLabel: overrides.locationLabel ?? 'TLV',
    analyzedAt: overrides.analyzedAt ?? null,
    hasEvaluation: overrides.hasEvaluation ?? true,
    matchScore: overrides.matchScore ?? 50,
    priorityScore: overrides.priorityScore ?? overrides.matchScore ?? 50,
    priorityTier: overrides.priorityTier ?? 'OTHER',
    primaryPhotoUrl: overrides.primaryPhotoUrl ?? null,
    approvedPhotoCount: overrides.approvedPhotoCount ?? 1,
    explainability: overrides.explainability ?? null,
    recommendation: overrides.recommendation ?? null,
    teaser: overrides.teaser ?? {
      headline: null,
      subheadline: null,
      traits: [],
    },
    yourAction: overrides.yourAction ?? null,
    hardBlocked: overrides.hardBlocked,
  };
}

describe('RankingAssembleService', () => {
  let matches: ReturnType<typeof makeMatchQueryRepoMock>;
  let eligibility: jest.Mocked<
    Pick<MatchEligibilityService, 'buildHardBlockedDto'>
  >;
  let service: RankingAssembleService;

  beforeEach(() => {
    matches = makeMatchQueryRepoMock();
    eligibility = { buildHardBlockedDto: jest.fn() };
    matches.findAboutTextByProfileIds.mockResolvedValue([]);
    service = new RankingAssembleService(
      matches,
      eligibility as unknown as MatchEligibilityService,
    );
  });

  it('sorts eligible matches by score DESC with hard-blocked at bottom', async () => {
    const score = makeEmptyScoreResult({
      matches: [
        matchItem({ id: 'low', matchScore: 40 }),
        matchItem({ id: 'high', matchScore: 90 }),
        matchItem({ id: 'blocked', matchScore: 99, hardBlocked: {} as never }),
      ],
    });

    const result = await service.assemble(
      makeRankingViewerReady(),
      makeRankingPool(),
      score,
      defaultListOptions({ isPageHydrate: false }),
    );

    expect(result.matches.map((m) => m.id)).toEqual(['high', 'low', 'blocked']);
  });

  it('preserves input order on page hydrate (no sort)', async () => {
    const score = makeEmptyScoreResult({
      matches: [
        matchItem({ id: 'second', matchScore: 40 }),
        matchItem({ id: 'first', matchScore: 90 }),
      ],
    });

    const result = await service.assemble(
      makeRankingViewerReady(),
      makeRankingPool({ isPageHydrate: true }),
      score,
      defaultListOptions({ isPageHydrate: true, candidateProfileIds: ['second', 'first'] }),
    );

    expect(result.matches.map((m) => m.id)).toEqual(['second', 'first']);
  });

  it('includes budgetExceeded on ready dto', async () => {
    const result = await service.assemble(
      makeRankingViewerReady(),
      makeRankingPool(),
      makeEmptyScoreResult({ budgetExceeded: true }),
      defaultListOptions(),
    );

    expect(result.dto).toMatchObject({
      status: 'ready',
      budgetExceeded: true,
    });
  });
});
