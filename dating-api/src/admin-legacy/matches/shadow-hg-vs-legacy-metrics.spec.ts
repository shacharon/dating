import type { MatchListItemDto } from '../../matches/match.types';
import {
  computeShadowHgVsLegacyMetricsFromListItems,
  legacyListComparator,
  LEGACY_RELATIONSHIP_CLARITY_DEALBREAKER_CODES,
} from './shadow-hg-vs-legacy-metrics';

function row(p: Partial<MatchListItemDto> & Pick<MatchListItemDto, 'matchId'>): MatchListItemDto {
  return {
    a: { id: 'a', name: 'A' },
    b: { id: 'b', name: 'B' },
    finalScore: p.finalScore ?? 50,
    updatedAt: '2020-01-01T00:00:00.000Z',
    dealbreakers: p.dealbreakers ?? [],
    shortReason: 'x',
    ...p,
  };
}

describe('computeShadowHgVsLegacyMetricsFromListItems', () => {
  it('counts kept vs dropped under shadow mutual-pass gate', () => {
    const items: MatchListItemDto[] = [
      row({
        matchId: 'a__b',
        finalScore: 80,
        rankingScore: 80,
        hgMutualPass: true,
        hgOverallStatus: 'PASS:PASS',
        hgRankScore: 0,
      }),
      row({
        matchId: 'a__c',
        finalScore: 70,
        rankingScore: 70,
        hgMutualPass: false,
        hgOverallStatus: 'PASS:FAIL',
        hgRankScore: 1,
      }),
      row({ matchId: 'x__y', finalScore: 60, rankingScore: 60 }),
    ];
    const r = computeShadowHgVsLegacyMetricsFromListItems(items);
    expect(r.admission.keptUnderShadowMutualPassGate).toBe(1);
    expect(r.admission.droppedUnderShadowMutualPassGate).toBe(1);
    expect(r.admission.hgWireIncompleteCount).toBe(1);
  });

  it('detects kids/family conflict bucket legacy proxy + HG children_unsure', () => {
    const items: MatchListItemDto[] = [
      row({
        matchId: 'a__b',
        finalScore: 70,
        rankingScore: 70,
        dealbreakers: [{ code: LEGACY_RELATIONSHIP_CLARITY_DEALBREAKER_CODES[0] }],
        children_unsure: { profile_a_to_profile_b: true, profile_b_to_profile_a: false },
        hgMutualPass: true,
        hgOverallStatus: 'PASS:PASS',
        hgRankScore: 0,
      }),
    ];
    const r = computeShadowHgVsLegacyMetricsFromListItems(items);
    expect(r.kidsFamily.byCase.LEGACY_CLARITY_PROXY_AND_HG_CHILDREN_UNSURE).toBe(1);
    expect(r.kidsFamily.byCase.NONE).toBe(0);
  });

  it('legacyListComparator sorts by getDisplayScore desc with stable tie-break', () => {
    const a = row({ matchId: 'a__b', finalScore: 50, rankingScore: 50 });
    const b = row({ matchId: 'c__d', finalScore: 60, rankingScore: 60 });
    expect(legacyListComparator(a, b)).toBeGreaterThan(0);
  });
});
