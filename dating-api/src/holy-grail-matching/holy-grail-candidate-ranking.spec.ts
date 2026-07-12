import {
  AcceptedPartnerGender,
  GenderIdentity,
  MATCHING_CANONICAL_MODEL_VERSION,
  type MatchingCanonicalModel,
} from '../canonical/matching-canonical.types';
import { rankHolyGrailCandidatesAfterHardFilter } from './holy-grail-candidate-ranking';

const AT = new Date('2020-06-15T12:00:00.000Z');

function canon(
  profileId: string,
  partial: Pick<MatchingCanonicalModel, 'facts' | 'preferences' | 'searchOverrides'>,
): MatchingCanonicalModel {
  return {
    version: MATCHING_CANONICAL_MODEL_VERSION,
    profileId,
    facts: partial.facts ?? {},
    preferences: partial.preferences ?? {},
    searchOverrides: partial.searchOverrides ?? {},
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

  it('survivors are ordered by profileId (five-signal ranker retired)', () => {
    const searcher = canon('s', {
      preferences: { acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE] },
    });
    const z = canon('z', { facts: { genderIdentity: GenderIdentity.FEMALE } });
    const a = canon('a', { facts: { genderIdentity: GenderIdentity.FEMALE } });
    const r = rankHolyGrailCandidatesAfterHardFilter({
      searcher,
      candidates: [z, a],
      evaluatedAt: AT,
    });
    expect(r.rankedCandidates.map((x) => x.candidate.profileId)).toEqual([
      'a',
      'z',
    ]);
    expect(r.rankedCandidates.every((x) => x.rankScore === 0)).toBe(true);
    expect(r.rankedCandidates[0].rankReasons[0]).toContain('hg_rank_retired');
    expect(r.rankedCandidates[0].rankBreakdown).toEqual([]);
  });
});
