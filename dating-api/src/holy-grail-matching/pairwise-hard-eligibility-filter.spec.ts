import {
  AcceptedPartnerGender,
  GenderIdentity,
  MATCHING_CANONICAL_MODEL_VERSION,
} from '../canonical/matching-canonical.types';
import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
import { filterCandidatesByHardEligibility } from './pairwise-hard-eligibility-filter';

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

describe('filterCandidatesByHardEligibility', () => {
  it('no prefs on anyone → all candidates pass both directions', () => {
    const searcher = canon('s', {});
    const c1 = canon('c1', { facts: { genderIdentity: GenderIdentity.MALE } });
    const c2 = canon('c2', { facts: { genderIdentity: GenderIdentity.FEMALE } });
    const r = filterCandidatesByHardEligibility({
      searcher,
      candidates: [c1, c2],
      evaluatedAt: AT,
      includeDebug: true,
    });
    expect(r.filteredCandidates).toEqual([c1, c2]);
    expect(r.debug).toEqual({ total: 2, passed: 2, failed: 0 });
  });

  it('one directional FAIL (searcher rejects candidate) → candidate filtered out', () => {
    const searcher = canon('s', {
      preferences: { acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE] },
    });
    const male = canon('m', { facts: { genderIdentity: GenderIdentity.MALE } });
    const r = filterCandidatesByHardEligibility({
      searcher,
      candidates: [male],
      evaluatedAt: AT,
      includeDebug: true,
    });
    expect(r.filteredCandidates).toEqual([]);
    expect(r.debug).toEqual({ total: 1, passed: 0, failed: 1 });
  });

  it('reverse direction FAIL (candidate rejects searcher) → filtered out', () => {
    const searcher = canon('s', { facts: { genderIdentity: GenderIdentity.MALE } });
    const picky = canon('p', {
      preferences: { acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE] },
    });
    const r = filterCandidatesByHardEligibility({
      searcher,
      candidates: [picky],
      evaluatedAt: AT,
    });
    expect(r.filteredCandidates).toEqual([]);
  });

  it('mixed PASS + SKIPPED (partial prefs, matching facts) → passes', () => {
    const searcher = canon('s', {
      preferences: { acceptedPartnerGenders: [AcceptedPartnerGender.MALE] },
    });
    const ok = canon('c', {
      facts: {
        genderIdentity: GenderIdentity.MALE,
        dateOfBirth: '1990-01-01',
      },
    });
    const r = filterCandidatesByHardEligibility({
      searcher,
      candidates: [ok],
      evaluatedAt: AT,
    });
    expect(r.filteredCandidates).toEqual([ok]);
  });

  it('omits debug when includeDebug not set', () => {
    const r = filterCandidatesByHardEligibility({
      searcher: canon('s', {}),
      candidates: [canon('c', {})],
      evaluatedAt: AT,
    });
    expect(r.debug).toBeUndefined();
  });
});
