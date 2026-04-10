import {
  AcceptedPartnerGender,
  GenderIdentity,
  MATCHING_CANONICAL_MODEL_VERSION,
} from '../canonical/matching-canonical.types';
import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
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

  it('closer age ranks higher (same ref date)', () => {
    const searcher = canon('s', {
      facts: { dateOfBirth: '1990-01-01' },
    });
    const close = canon('close', {
      facts: { dateOfBirth: '1991-06-01' },
    });
    const far = canon('far', {
      facts: { dateOfBirth: '1970-01-01' },
    });
    const r = rankHolyGrailCandidatesAfterHardFilter({
      searcher,
      candidates: [far, close],
      evaluatedAt: AT,
    });
    expect(r.rankedCandidates[0].candidate.profileId).toBe('close');
    expect(r.rankedCandidates[1].candidate.profileId).toBe('far');
    expect(r.rankedCandidates[0].rankScore).toBeGreaterThan(r.rankedCandidates[1].rankScore);
  });

  it('more shared interests ranks higher', () => {
    const searcher = canon('s', {
      facts: { interestTags: ['a', 'b', 'c'] },
    });
    const many = canon('many', {
      facts: { interestTags: ['a', 'b', 'x'] },
    });
    const few = canon('few', {
      facts: { interestTags: ['c', 'z'] },
    });
    const r = rankHolyGrailCandidatesAfterHardFilter({
      searcher,
      candidates: [few, many],
      evaluatedAt: AT,
    });
    expect(r.rankedCandidates[0].candidate.profileId).toBe('many');
    expect(r.rankedCandidates[0].rankScore).toBeGreaterThan(r.rankedCandidates[1].rankScore);
    expect(r.rankedCandidates[0].rankReasons.some((x) => x.includes('shared_interests'))).toBe(true);
  });

  it('same primary location label adds bonus and can change order', () => {
    const searcher = canon('s', {
      facts: { primaryLocationLabel: '  Tel Aviv  ' },
    });
    const same = canon('same', {
      facts: { primaryLocationLabel: 'tel aviv' },
    });
    const other = canon('other', {
      facts: { primaryLocationLabel: 'London' },
    });
    const r = rankHolyGrailCandidatesAfterHardFilter({
      searcher,
      candidates: [other, same],
      evaluatedAt: AT,
    });
    expect(r.rankedCandidates[0].candidate.profileId).toBe('same');
    expect(r.rankedCandidates[0].rankReasons.some((x) => x.startsWith('same_location_label:'))).toBe(
      true,
    );
  });

  it('missing DOB / interests does not throw; no bonus for missing pairs', () => {
    const searcher = canon('s', { facts: {} });
    const a = canon('a', { facts: { interestTags: ['x'] } });
    const b = canon('b', { facts: {} });
    const r = rankHolyGrailCandidatesAfterHardFilter({
      searcher,
      candidates: [a, b],
      evaluatedAt: AT,
    });
    expect(r.rankedCandidates).toHaveLength(2);
    expect(r.rankedCandidates.every((row) => row.rankScore === 0)).toBe(true);
    expect(
      r.rankedCandidates[0].candidate.profileId <= r.rankedCandidates[1].candidate.profileId,
    ).toBe(true);
  });
});
