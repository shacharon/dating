import {
  AcceptedPartnerGender,
  GenderIdentity,
  MATCHING_CANONICAL_MODEL_VERSION,
  type MatchingCanonicalModel,
} from '../canonical/matching-canonical.types';
import { HOLY_GRAIL_DIMENSION_KEYS } from './holy-grail-dimensions';
import {
  evaluateHolyGrailDirectional,
  resolveDimensionOutcome,
  emptyHolyGrailDimensionOutcomeCounts,
  accumulateHolyGrailDimensionOutcomeCounts,
  formatHolyGrailDimensionOutcomeCountsForLog,
  type HolyGrailHardEligibilityStatus,
  type HolyGrailDimensionBlockingPolicy,
} from './eligibility.evaluator';

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

describe('evaluateHolyGrailDirectional — UNKNOWN vs FAIL (Sprint 16 Story 1)', () => {
  it('missing counterparty gender + active gender preference => UNKNOWN, overall FAIL', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: {
          acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE],
        },
      }),
      counterparty: model('c', { facts: {} }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.GENDER.status).toBe('UNKNOWN');
    expect(r.dimensions.GENDER.reasonCode).toBe(
      'PARTNER_GENDER_MISSING_OR_WITHHELD',
    );
    expect(r.overallHardEligibility).toBe('FAIL');
  });

  it('withheld gender (PREFER_NOT_TO_SAY) => UNKNOWN, overall FAIL', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: {
          acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE],
        },
      }),
      counterparty: model('c', {
        facts: { genderIdentity: GenderIdentity.PREFER_NOT_TO_SAY },
      }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.GENDER.status).toBe('UNKNOWN');
    expect(r.overallHardEligibility).toBe('FAIL');
  });

  it('missing DOB + age preference => UNKNOWN, overall FAIL', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', { preferences: { partnerAgeMin: 25 } }),
      counterparty: model('c', { facts: {} }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.AGE.status).toBe('UNKNOWN');
    expect(r.dimensions.AGE.reasonCode).toBe('PARTNER_DOB_MISSING');
    expect(r.overallHardEligibility).toBe('FAIL');
  });

  it('invalid DOB + age preference => UNKNOWN, overall FAIL', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', { preferences: { partnerAgeMin: 25 } }),
      counterparty: model('c', { facts: { dateOfBirth: 'not-a-date' } }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.AGE.status).toBe('UNKNOWN');
    expect(r.dimensions.AGE.reasonCode).toBe('PARTNER_DOB_INVALID');
    expect(r.overallHardEligibility).toBe('FAIL');
  });

  it('genuine mismatches stay FAIL, not UNKNOWN', () => {
    const genderMismatch = evaluateHolyGrailDirectional({
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
    expect(genderMismatch.dimensions.GENDER.status).toBe('FAIL');

    const ageMismatch = evaluateHolyGrailDirectional({
      searcher: model('s', { preferences: { partnerAgeMin: 40 } }),
      counterparty: model('c', { facts: { dateOfBirth: '2000-01-01' } }),
      evaluatedAt: AT,
    });
    expect(ageMismatch.dimensions.AGE.status).toBe('FAIL');
    expect(ageMismatch.dimensions.AGE.reasonCode).toBe('AGE_BELOW_MIN');
  });
});

describe('resolveDimensionOutcome (Sprint 16 Story 1)', () => {
  const statuses: HolyGrailHardEligibilityStatus[] = [
    'PASS',
    'FAIL',
    'UNKNOWN',
    'SKIPPED',
    'SOFT_PASS',
  ];
  const policies: HolyGrailDimensionBlockingPolicy[] = [
    'BLOCKS_ON_UNKNOWN',
    'NEVER_BLOCKS',
  ];

  it.each(
    statuses.flatMap((status) =>
      policies.map((policy) => [status, policy] as const),
    ),
  )('resolves %s under %s', (status, policy) => {
    const resolved = resolveDimensionOutcome(status, policy);
    if (status === 'UNKNOWN' && policy === 'BLOCKS_ON_UNKNOWN') {
      expect(resolved).toBe('FAIL');
    } else {
      expect(resolved).toBe(status);
    }
  });
});

describe('dimension outcome telemetry helpers (Sprint 16 Story 1)', () => {
  it('accumulates raw per-dimension statuses and formats a greppable one-liner', () => {
    const counts = emptyHolyGrailDimensionOutcomeCounts();
    const missingGender = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: {
          acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE],
        },
      }),
      counterparty: model('c', { facts: {} }),
      evaluatedAt: AT,
    });
    accumulateHolyGrailDimensionOutcomeCounts(counts, missingGender);
    expect(counts.GENDER.UNKNOWN).toBe(1);
    expect(counts.AGE.SKIPPED).toBe(1);
    const line = formatHolyGrailDimensionOutcomeCountsForLog(counts);
    expect(line).toContain('GENDER:');
    expect(line).toContain('UNKNOWN=1');
    expect(line).toContain('AGE:');
    expect(line).toContain('PROXIMITY:');
  });
});
