import {
  AcceptedPartnerGender,
  GenderIdentity,
  MATCHING_CANONICAL_MODEL_VERSION,
  type MatchingRankingSignalsSnapshot,
} from '../canonical/matching-canonical.types';
import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
import { rankHolyGrailCandidatesAfterHardFilter } from './holy-grail-candidate-ranking';

const AT = new Date('2020-06-15T12:00:00.000Z');

const baseSignals = (over: Partial<MatchingRankingSignalsSnapshot>): MatchingRankingSignalsSnapshot => ({
  dailyRhythm: null,
  autonomyTogetherness: null,
  conflictStyle: null,
  lifestylePace: null,
  interestsTop: [],
  ...over,
});

function canon(
  profileId: string,
  partial: Pick<MatchingCanonicalModel, 'facts' | 'preferences' | 'searchOverrides'> & {
    rankingSignals?: MatchingRankingSignalsSnapshot;
  },
): MatchingCanonicalModel {
  return {
    version: MATCHING_CANONICAL_MODEL_VERSION,
    profileId,
    facts: partial.facts ?? {},
    preferences: partial.preferences ?? {},
    searchOverrides: partial.searchOverrides ?? {},
    ...(partial.rankingSignals !== undefined ? { rankingSignals: partial.rankingSignals } : {}),
  };
}

describe('rankHolyGrailCandidatesAfterHardFilter', () => {
  it('blocked candidate never appears in ranked output', () => {
    const searcher = canon('s', {
      preferences: { acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE] },
    });
    const blocked = canon('blocked', { facts: { genderIdentity: GenderIdentity.MALE } });
    const ok = canon('ok', { facts: { genderIdentity: GenderIdentity.FEMALE } });
    const r = rankHolyGrailCandidatesAfterHardFilter({
      searcher,
      candidates: [blocked, ok],
      evaluatedAt: AT,
      includeDebug: true,
    });
    expect(r.rankedCandidates.map((x) => x.candidate.profileId)).toEqual(['ok']);
    expect(r.debug).toEqual({
      inputTotal: 2,
      passedHardFilter: 1,
      failedHardFilter: 1,
      rankedCount: 1,
    });
  });

  it('closer lifestylePace ranks higher when other signals equal', () => {
    const searcher = canon('s', {
      rankingSignals: baseSignals({ lifestylePace: 5, conflictStyle: 5 }),
    });
    const close = canon('close', {
      rankingSignals: baseSignals({ lifestylePace: 6, conflictStyle: 5 }),
    });
    const far = canon('far', {
      rankingSignals: baseSignals({ lifestylePace: 9, conflictStyle: 5 }),
    });
    const r = rankHolyGrailCandidatesAfterHardFilter({
      searcher,
      candidates: [far, close],
      evaluatedAt: AT,
    });
    expect(r.rankedCandidates[0].candidate.profileId).toBe('close');
    expect(r.rankedCandidates[1].candidate.profileId).toBe('far');
    expect(r.rankedCandidates[0].rankScore).toBeGreaterThan(r.rankedCandidates[1].rankScore);
    expect(r.rankedCandidates[0].rankReasons[0]).toMatch(/^hg_rank_total:/);
  });

  it('more interestsTop overlap ranks higher', () => {
    const searcher = canon('s', {
      rankingSignals: baseSignals({ interestsTop: ['a', 'b', 'c'] }),
    });
    const many = canon('many', {
      rankingSignals: baseSignals({ interestsTop: ['a', 'b', 'x'] }),
    });
    const few = canon('few', {
      rankingSignals: baseSignals({ interestsTop: ['c', 'z'] }),
    });
    const r = rankHolyGrailCandidatesAfterHardFilter({
      searcher,
      candidates: [few, many],
      evaluatedAt: AT,
    });
    expect(r.rankedCandidates[0].candidate.profileId).toBe('many');
    expect(r.rankedCandidates[0].rankScore).toBeGreaterThan(r.rankedCandidates[1].rankScore);
    expect(
      r.rankedCandidates[0].rankBreakdown.find((b) => b.signal === 'interestsTop')?.note,
    ).toContain('jaccard');
  });

  it('matching dailyRhythm label ranks above mismatch when other signals empty', () => {
    const searcher = canon('s', {
      rankingSignals: baseSignals({ dailyRhythm: 'early_bird' }),
    });
    const same = canon('same', {
      rankingSignals: baseSignals({ dailyRhythm: 'early_bird' }),
    });
    const other = canon('other', {
      rankingSignals: baseSignals({ dailyRhythm: 'night_owl' }),
    });
    const r = rankHolyGrailCandidatesAfterHardFilter({
      searcher,
      candidates: [other, same],
      evaluatedAt: AT,
    });
    expect(r.rankedCandidates[0].candidate.profileId).toBe('same');
    expect(r.rankedCandidates[0].rankBreakdown.find((b) => b.signal === 'dailyRhythm')?.points).toBe(
      17,
    );
  });

  it('missing ranking sidecar uses deterministic empty spread; scores differ; higher spread ranks first', () => {
    const searcher = canon('s', { facts: {} });
    const a = canon('a', { facts: {} });
    const b = canon('b', { facts: {} });
    const r = rankHolyGrailCandidatesAfterHardFilter({
      searcher,
      candidates: [a, b],
      evaluatedAt: AT,
    });
    expect(r.rankedCandidates).toHaveLength(2);
    const [first, second] = r.rankedCandidates;
    expect(first.rankScore).toBeGreaterThan(0);
    expect(second.rankScore).toBeGreaterThan(0);
    expect(first.rankScore).not.toBe(second.rankScore);
    expect(first.rankScore).toBeGreaterThanOrEqual(second.rankScore);
    expect(first.rankBreakdown.some((x) => x.signal === 'deterministicSpread')).toBe(true);
  });

  it('exposes per-signal breakdown aligned with rankReasons', () => {
    const searcher = canon('s', {
      rankingSignals: baseSignals({
        dailyRhythm: 'x',
        autonomyTogetherness: 'y',
        conflictStyle: 4,
        lifestylePace: 4,
        interestsTop: ['run'],
      }),
    });
    const cand = canon('c', {
      rankingSignals: baseSignals({
        dailyRhythm: 'x',
        autonomyTogetherness: 'y',
        conflictStyle: 4,
        lifestylePace: 4,
        interestsTop: ['run'],
      }),
    });
    const r = rankHolyGrailCandidatesAfterHardFilter({
      searcher,
      candidates: [cand],
      evaluatedAt: AT,
    });
    expect(r.rankedCandidates[0].rankBreakdown).toHaveLength(5);
    expect(r.rankedCandidates[0].rankScore).toBe(100);
  });
});
