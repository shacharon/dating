import type { MatchListItemDto, MatchRecordDto } from '../../matches/match.types';
import {
  filterMatchRecordsByHgListAdmissionGate,
  listItemPassesHgListAdmissionGate,
  matchRecordPassesHgListAdmissionGate,
  parseHgListAdmissionGateEnv,
} from './hg-list-admission-gate';

describe('parseHgListAdmissionGateEnv', () => {
  it('accepts 1 true yes', () => {
    expect(parseHgListAdmissionGateEnv('1', undefined)).toBe(true);
    expect(parseHgListAdmissionGateEnv('TRUE', undefined)).toBe(true);
    expect(parseHgListAdmissionGateEnv(undefined, 'yes')).toBe(true);
  });
  it('rejects unset and 0', () => {
    expect(parseHgListAdmissionGateEnv(undefined, undefined)).toBe(false);
    expect(parseHgListAdmissionGateEnv('0', undefined)).toBe(false);
  });
});

describe('listItemPassesHgListAdmissionGate', () => {
  const base: MatchListItemDto = {
    matchId: 'a__b',
    a: { id: 'a', name: 'A' },
    b: { id: 'b', name: 'B' },
    finalScore: 50,
    updatedAt: 'x',
    dealbreakers: [],
    shortReason: 'x',
  };

  it('gate off always keeps', () => {
    expect(listItemPassesHgListAdmissionGate(false, base)).toBe(true);
  });

  it('gate on keeps incomplete wire (fallback)', () => {
    expect(listItemPassesHgListAdmissionGate(true, base)).toBe(true);
  });

  it('gate on drops mutual pass false', () => {
    expect(
      listItemPassesHgListAdmissionGate(true, {
        ...base,
        hgMutualPass: false,
        hgOverallStatus: 'PASS:FAIL',
        hgRankScore: 0,
      }),
    ).toBe(false);
  });

  it('gate on keeps mutual pass true', () => {
    expect(
      listItemPassesHgListAdmissionGate(true, {
        ...base,
        hgMutualPass: true,
        hgOverallStatus: 'PASS:PASS',
        hgRankScore: 0,
      }),
    ).toBe(true);
  });
});

describe('filterMatchRecordsByHgListAdmissionGate', () => {
  const r: MatchRecordDto = {
    matchId: 'a__b',
    aId: 'a',
    bId: 'b',
    a: { id: 'a', name: 'A' },
    b: { id: 'b', name: 'B' },
    finalScore: 80,
    createdAt: 'x',
    updatedAt: 'x',
    aToB: 1,
    bToA: 1,
    relationshipStyle: 1,
    coverage: 1,
    frictionRisk: 1,
    alignments: [],
    tensions: [],
  };

  it('gate off returns copy', () => {
    const out = filterMatchRecordsByHgListAdmissionGate({
      gateEnabled: false,
      records: [r],
      snapshotMap: new Map(),
      holyGrailRowsById: new Map(),
    });
    expect(out).toEqual([r]);
  });
});

describe('matchRecordPassesHgListAdmissionGate', () => {
  const record: MatchRecordDto = {
    matchId: 'a__b',
    aId: 'a',
    bId: 'b',
    a: { id: 'a', name: 'A' },
    b: { id: 'b', name: 'B' },
    finalScore: 80,
    createdAt: 'x',
    updatedAt: 'x',
    aToB: 1,
    bToA: 1,
    relationshipStyle: 1,
    coverage: 1,
    frictionRisk: 1,
    alignments: [],
    tensions: [],
  };

  it('gate off keeps', () => {
    expect(
      matchRecordPassesHgListAdmissionGate({
        gateEnabled: false,
        record,
        snapshot: undefined,
        rowA: undefined,
        rowB: undefined,
      }),
    ).toBe(true);
  });
});
