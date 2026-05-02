import {
  AcceptedPartnerAlcohol,
  AcceptedPartnerGender,
  AcceptedPartnerSmoking,
  AlcoholUseSelf,
  ChildrenStatusSelf,
  EducationLevelSelf,
  GenderIdentity,
  MATCHING_CANONICAL_MODEL_VERSION,
  MinimumPartnerEducation,
  PartnerHasChildrenAcceptance,
  PartnerWantsChildrenRequirement,
  ReligionSelf,
  SmokingFrequencySelf,
  WantsChildrenSelf,
} from '../canonical/matching-canonical.types';
import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
import { HOLY_GRAIL_DIMENSION_KEYS } from './holy-grail-dimensions';
import { evaluateHolyGrailDirectional, holyGrailDeterministicHalfPass } from './eligibility.evaluator';

const AT = new Date('2020-06-15T12:00:00.000Z');

function model(
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

describe('evaluateHolyGrailDirectional', () => {
  it('fully absent preferences => every dimension SKIPPED and overall PASS', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', { preferences: {}, searchOverrides: {} }),
      counterparty: model('c', { facts: { genderIdentity: GenderIdentity.MALE } }),
      evaluatedAt: AT,
    });
    expect(r.overallHardEligibility).toBe('PASS');
    for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
      expect(r.dimensions[k].status).toBe('SKIPPED');
    }
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

  it('explicit ANY / NO_REQUIREMENT => SKIPPED for those dimensions', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: {
          minimumPartnerEducation: MinimumPartnerEducation.ANY,
          acceptedPartnerSmoking: [AcceptedPartnerSmoking.ANY],
          partnerWantsChildren: PartnerWantsChildrenRequirement.NO_REQUIREMENT,
          partnerHasChildren: PartnerHasChildrenAcceptance.NO_REQUIREMENT,
        },
      }),
      counterparty: model('c', {
        facts: {
          education: EducationLevelSelf.HIGH_SCHOOL,
          smoking: SmokingFrequencySelf.REGULAR,
        },
      }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.EDUCATION.status).toBe('SKIPPED');
    expect(r.dimensions.SMOKING.status).toBe('SKIPPED');
    expect(r.dimensions.PARTNER_WANTS_CHILDREN.status).toBe('SKIPPED');
    expect(r.dimensions.PARTNER_HAS_CHILDREN.status).toBe('SKIPPED');
    expect(r.overallHardEligibility).toBe('PASS');
  });

  it('religion pref absent => SKIPPED; non-empty list with mismatch => FAIL', () => {
    const skipped = evaluateHolyGrailDirectional({
      searcher: model('s', { preferences: {} }),
      counterparty: model('c', { facts: { religion: ReligionSelf.JEWISH } }),
      evaluatedAt: AT,
    });
    expect(skipped.dimensions.RELIGION.status).toBe('SKIPPED');

    const fail = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: { acceptedPartnerReligions: [ReligionSelf.JEWISH] },
      }),
      counterparty: model('c', { facts: { religion: ReligionSelf.CHRISTIAN } }),
      evaluatedAt: AT,
    });
    expect(fail.dimensions.RELIGION.status).toBe('FAIL');
    expect(fail.overallHardEligibility).toBe('FAIL');
  });

  it('religion pref empty array => SKIPPED (no widening)', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: { acceptedPartnerReligions: [] },
      }),
      counterparty: model('c', { facts: { religion: ReligionSelf.JEWISH } }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.RELIGION.status).toBe('SKIPPED');
    expect(r.dimensions.RELIGION.reasonCode).toBe('RELIGION_PREF_ABSENT');
  });

  it('maxDistanceKm without comparable geo in v1 facts => PROXIMITY SKIPPED', () => {
    const absent = evaluateHolyGrailDirectional({
      searcher: model('s', { preferences: {} }),
      counterparty: model('c', {
        facts: { primaryLocationLabel: 'NYC' },
      }),
      evaluatedAt: AT,
    });
    expect(absent.dimensions.PROXIMITY.reasonCode).toBe('DISTANCE_PREF_ABSENT');

    const cap = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: { maxDistanceKm: 25 },
        searchOverrides: {},
      }),
      counterparty: model('c', {
        facts: { primaryLocationLabel: 'NYC' },
      }),
      evaluatedAt: AT,
    });
    expect(cap.dimensions.PROXIMITY.status).toBe('SKIPPED');
    expect(cap.dimensions.PROXIMITY.reasonCode).toBe('GEO_INSUFFICIENT_FOR_DISTANCE_KM');
  });

  it('MUST_WANT children + partner UNSURE => SOFT_PASS, overall PASS, children_unsure flag', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: { partnerWantsChildren: PartnerWantsChildrenRequirement.MUST_WANT },
      }),
      counterparty: model('c', {
        facts: { wantsChildren: WantsChildrenSelf.UNSURE },
      }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.PARTNER_WANTS_CHILDREN.status).toBe('SOFT_PASS');
    expect(r.dimensions.PARTNER_WANTS_CHILDREN.reasonCode).toBe('WANTS_CHILDREN_MUST_WANT_UNSURE_SOFT');
    expect(r.overallHardEligibility).toBe('PASS');
    expect(r.eligibilityFlags.children_unsure).toBe(true);
  });

  it('NONE_ONLY alcohol + partner RARE => SOFT_PASS or FAIL from deterministic half-pass', () => {
    const prefs = {
      preferences: { acceptedPartnerAlcohol: [AcceptedPartnerAlcohol.NONE_ONLY] },
    };
    const facts = { facts: { alcoholUse: AlcoholUseSelf.RARE } };
    let sawSoft = false;
    let sawFail = false;
    for (let i = 0; i < 80; i++) {
      const sid = `s${i}`;
      const r = evaluateHolyGrailDirectional({
        searcher: model(sid, prefs),
        counterparty: model('c', facts),
        evaluatedAt: AT,
      });
      expect(['SOFT_PASS', 'FAIL']).toContain(r.dimensions.ALCOHOL.status);
      if (r.dimensions.ALCOHOL.status === 'SOFT_PASS') {
        expect(r.dimensions.ALCOHOL.reasonCode).toBe('ALCOHOL_NONE_ONLY_RARE_SOFT');
        sawSoft = true;
      } else {
        expect(r.dimensions.ALCOHOL.reasonCode).toBe('ALCOHOL_MATRIX_FAIL');
        sawFail = true;
      }
      expect(holyGrailDeterministicHalfPass('ALCOHOL_NONE_ONLY_RARE', sid, 'c')).toBe(
        r.dimensions.ALCOHOL.status === 'SOFT_PASS',
      );
    }
    expect(sawSoft).toBe(true);
    expect(sawFail).toBe(true);
  });

  it('education floor active => PASS when partner meets rank', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: { minimumPartnerEducation: MinimumPartnerEducation.BACHELORS },
      }),
      counterparty: model('c', {
        facts: { education: EducationLevelSelf.BACHELORS },
      }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.EDUCATION.status).toBe('PASS');
  });

  it('smoking empty array => SKIPPED', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', { preferences: { acceptedPartnerSmoking: [] } }),
      counterparty: model('c', { facts: { smoking: SmokingFrequencySelf.REGULAR } }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.SMOKING.status).toBe('SKIPPED');
  });

  it('smoking included by allow-set => PASS', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: {
          acceptedPartnerSmoking: [AcceptedPartnerSmoking.NONE_ONLY],
        },
      }),
      counterparty: model('c', { facts: { smoking: SmokingFrequencySelf.NEVER } }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.SMOKING.status).toBe('PASS');
  });

  it('smoking excluded by allow-set => FAIL', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: {
          acceptedPartnerSmoking: [AcceptedPartnerSmoking.NONE_ONLY],
        },
      }),
      counterparty: model('c', { facts: { smoking: SmokingFrequencySelf.REGULAR } }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.SMOKING.status).toBe('FAIL');
  });

  it('alcohol empty array => SKIPPED', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', { preferences: { acceptedPartnerAlcohol: [] } }),
      counterparty: model('c', { facts: { alcoholUse: AlcoholUseSelf.FREQUENT } }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.ALCOHOL.status).toBe('SKIPPED');
  });

  it('alcohol included by allow-set => PASS', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: {
          acceptedPartnerAlcohol: [AcceptedPartnerAlcohol.MODERATE_OK],
        },
      }),
      counterparty: model('c', { facts: { alcoholUse: AlcoholUseSelf.MODERATE } }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.ALCOHOL.status).toBe('PASS');
  });

  it('alcohol excluded by allow-set => FAIL', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: model('s', {
        preferences: {
          acceptedPartnerAlcohol: [AcceptedPartnerAlcohol.NONE_ONLY],
        },
      }),
      counterparty: model('c', { facts: { alcoholUse: AlcoholUseSelf.FREQUENT } }),
      evaluatedAt: AT,
    });
    expect(r.dimensions.ALCOHOL.status).toBe('FAIL');
  });
});
