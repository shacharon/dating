import { mapMatchRecordToDetailUi } from './match-detail-ui.mapper';
import type { MatchRecordDto } from '../../matches/match.types';

const BASE: MatchRecordDto = {
  matchId: 'a__b',
  aId: 'a',
  bId: 'b',
  a: { id: 'a', name: 'Alex' },
  b: { id: 'b', name: 'Blake' },
  finalScore: 80,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
  aToB: 80,
  bToA: 80,
  relationshipStyle: 0,
  coverage: 0,
  frictionRisk: 0,
  alignments: [],
  tensions: [],
};

describe('mapMatchRecordToDetailUi', () => {
  it('includes children_unsure payload from args', () => {
    const cu = { profile_a_to_profile_b: true, profile_b_to_profile_a: false };
    const ui = mapMatchRecordToDetailUi(BASE, cu);
    expect(ui.children_unsure).toEqual(cu);
  });

  it('includes optional HG diagnostics when provided', () => {
    const cu = { profile_a_to_profile_b: false, profile_b_to_profile_a: false };
    const hg = { hgMutualPass: true, hgOverallStatus: 'PASS:PASS', hgRankScore: 0 };
    const ui = mapMatchRecordToDetailUi(BASE, cu, hg);
    expect(ui.hgMutualPass).toBe(true);
    expect(ui.hgOverallStatus).toBe('PASS:PASS');
    expect(ui.hgRankScore).toBe(0);
  });
});
