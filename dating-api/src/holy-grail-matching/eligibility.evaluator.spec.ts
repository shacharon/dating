import {
  AcceptedPartnerGender,
  GenderIdentity,
  MATCHING_CANONICAL_MODEL_VERSION,
  type MatchingCanonicalModel,
} from '../canonical/matching-canonical.types';
import { HOLY_GRAIL_DIMENSION_KEYS } from './holy-grail-dimensions';
import { evaluateHolyGrailDirectional } from './eligibility.evaluator';

const AT = new Date('2020-06-15T12:00:00.000Z');

function model(
  profileId: string,
  partial: Pick<
    MatchingCanonicalModel,
    'facts' | 'preferences' | 'searchOverrides'
  >,
): MatchingCanonicalModel {
  return {
    version: MATCHING_CANONICAL_MODEL_VERSION,
    profileId,
    facts: partial.facts ?? {},
    preferences: partial.preferences ?? {},
    searchOverrides: partial.searchOverrides ?? {},
  };
}

describe('evaluateHolyGrailDirectional (Sprint 15 core three)', () => {
  it('fully absent preferences => every dimension SKIPPED and overall PASS', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', { preferences: {}, searchOverrides: {} }),
      counterparty: model('c', {
        facts: { genderIdentity: GenderIdentity.MALE },
      }),
      evaluatedAt: AT,
    });
    expect(r.overallHardEligibility).toBe('PASS');
    for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
      expect(r.dimensions[k].status).toBe('SKIPPED');
    }
    expect(r.eligibilityFlags.children_unsure).toBe(false);
  });

  it('explicit stored preference mismatch => FAIL on dimension and overall', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: {
          acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE],
        },
      }),
      counterparty: model('c', {
        facts: { genderIdentity: GenderIdentity.MALE },
      }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.GENDER.status).toBe('FAIL');
    expect(r.dimensions.GENDER.reasonCode).toBe('GENDER_NOT_IN_ALLOWLIST');
    expect(r.overallHardEligibility).toBe('FAIL');
  });

  it('searchOverrides replace stored prefs for that field (age max)', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: { partnerAgeMax: 40 },
        searchOverrides: { partnerAgeMax: 50 },
      }),
      counterparty: model('c', {
        facts: { dateOfBirth: '1975-01-01' },
      }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.AGE.status).toBe('PASS');
    expect(r.overallHardEligibility).toBe('PASS');
  });

  it('partial prefs => mixed PASS and SKIPPED', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: {
          acceptedPartnerGenders: [AcceptedPartnerGender.MALE],
        },
      }),
      counterparty: model('c', {
        facts: {
          genderIdentity: GenderIdentity.MALE,
          dateOfBirth: '1990-05-15',
        },
      }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.GENDER.status).toBe('PASS');
    expect(r.dimensions.AGE.status).toBe('SKIPPED');
    expect(r.overallHardEligibility).toBe('PASS');
  });

  it('PROXIMITY SKIPPED when maxDistanceKm set without geo', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', { preferences: { maxDistanceKm: 25 } }),
      counterparty: model('c', { facts: {} }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.PROXIMITY.status).toBe('SKIPPED');
    expect(r.dimensions.PROXIMITY.reasonCode).toBe(
      'GEO_INSUFFICIENT_FOR_DISTANCE_KM',
    );
    expect(r.overallHardEligibility).toBe('PASS');
  });

  it('only GENDER, AGE, PROXIMITY dimension keys', () => {
    expect([...HOLY_GRAIL_DIMENSION_KEYS]).toEqual([
      'GENDER',
      'AGE',
      'PROXIMITY',
    ]);
  });

  it('children_unsure is always false', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', { preferences: {}, searchOverrides: {} }),
      counterparty: model('c', { facts: {} }),
      evaluatedAt: AT,
    });
    expect(r.eligibilityFlags.children_unsure).toBe(false);
  });
});
