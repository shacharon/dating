import {
  AcceptedPartnerGender,
  GenderIdentity,
  MATCHING_CANONICAL_MODEL_VERSION,
  PartnerWantsChildrenRequirement,
  WantsChildrenSelf,
} from '../canonical/matching-canonical.types';
import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
import { MatchingDimensionResults } from './matching-dimension-result';
import { evaluateHolyGrailDirectional } from './eligibility.evaluator';
import { adaptHolyGrailEvaluationToLegacyDimensionMap } from './evaluation-to-legacy-dimension-map';
import { mapProfileSourceToMatchingCanonical } from './profile-to-canonical.mapper';
import { buildHolyGrailEligibilityAuditV1 } from './build-eligibility-audit';
import { buildHolyGrailPairDecisionV1 } from './decision/build-holy-grail-pair-decision';
import { HolyGrailPairDecisions } from './decision/holy-grail-decision.types';
import { HOLY_GRAIL_DIMENSION_KEYS } from './holy-grail-dimensions';

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

describe('Layer 3 → Layer 4 bridge (integration)', () => {
  it('evaluator → adapter → audit + pair decision without contract break', () => {
    const searcher = model('s', {
      preferences: { acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE] },
    });
    const counterparty = model('c', {
      facts: { genderIdentity: GenderIdentity.MALE },
    });

    const stc = evaluateHolyGrailDirectional({
      searcher,
      counterparty,
      evaluatedAt: AT,
    });
    const cts = evaluateHolyGrailDirectional({
      searcher: counterparty,
      counterparty: searcher,
      evaluatedAt: AT,
    });

    expect(stc.overallHardEligibility).toBe('FAIL');
    expect(stc.dimensions.GENDER.reasonCode).toBe('GENDER_NOT_IN_ALLOWLIST');

    const legacyStc = adaptHolyGrailEvaluationToLegacyDimensionMap(stc);
    const legacyCts = adaptHolyGrailEvaluationToLegacyDimensionMap(cts);

    expect(legacyStc.GENDER).toBe(MatchingDimensionResults.NO_MATCH);
    for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
      if (k === 'GENDER') continue;
      expect(legacyStc[k]).toBe(MatchingDimensionResults.SKIPPED);
    }
    for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
      expect(legacyCts[k]).toBe(MatchingDimensionResults.SKIPPED);
    }

    const audit = buildHolyGrailEligibilityAuditV1({
      searcherProfileId: 's',
      counterpartyProfileId: 'c',
      evaluatedAt: AT,
      dimensions: legacyStc,
    });
    expect(audit.auditVersion).toBe('holy_grail_eligibility_audit_v1');
    expect(audit.engineId).toBe('holy_grail_eligibility_v1');
    expect(audit.dimensions).toHaveLength(HOLY_GRAIL_DIMENSION_KEYS.length);
    expect(audit.dimensions.every((r) => typeof r.dimension === 'string')).toBe(true);
    expect(audit.dimensions.find((r) => r.dimension === 'GENDER')?.result).toBe(
      MatchingDimensionResults.NO_MATCH,
    );

    const pair = buildHolyGrailPairDecisionV1({
      searcherProfileId: 's',
      counterpartyProfileId: 'c',
      searcherToCounterparty: legacyStc,
      counterpartyToSearcher: legacyCts,
    });
    expect(pair.decisionVersion).toBe('holy_grail_pair_decision_v1');
    expect(pair.decision).toBe(HolyGrailPairDecisions.NO_MATCH);
  });

  it('evaluator + adapter: both sides no prefs => all SKIPPED legacy maps => MUTUAL_MATCH', () => {
    const a = mapProfileSourceToMatchingCanonical({ profileId: 'a' });
    const b = mapProfileSourceToMatchingCanonical({ profileId: 'b' });
    const stc = adaptHolyGrailEvaluationToLegacyDimensionMap(
      evaluateHolyGrailDirectional({ searcher: a, counterparty: b, evaluatedAt: AT }),
    );
    const cts = adaptHolyGrailEvaluationToLegacyDimensionMap(
      evaluateHolyGrailDirectional({ searcher: b, counterparty: a, evaluatedAt: AT }),
    );
    for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
      expect(stc[k]).toBe(MatchingDimensionResults.SKIPPED);
      expect(cts[k]).toBe(MatchingDimensionResults.SKIPPED);
    }
    const pair = buildHolyGrailPairDecisionV1({
      searcherProfileId: 'a',
      counterpartyProfileId: 'b',
      searcherToCounterparty: stc,
      counterpartyToSearcher: cts,
    });
    expect(pair.decision).toBe(HolyGrailPairDecisions.MUTUAL_MATCH);
  });

  it('MUST_WANT × UNSURE: SOFT_PASS on children, legacy MATCH, MUTUAL_MATCH when reciprocal', () => {
    const a = model('a', {
      preferences: { partnerWantsChildren: PartnerWantsChildrenRequirement.MUST_WANT },
      facts: { wantsChildren: WantsChildrenSelf.YES },
    });
    const b = model('b', {
      facts: { wantsChildren: WantsChildrenSelf.UNSURE },
    });
    const stc = evaluateHolyGrailDirectional({ searcher: a, counterparty: b, evaluatedAt: AT });
    const cts = evaluateHolyGrailDirectional({ searcher: b, counterparty: a, evaluatedAt: AT });

    expect(stc.dimensions.PARTNER_WANTS_CHILDREN.status).toBe('SOFT_PASS');
    expect(stc.eligibilityFlags.children_unsure).toBe(true);
    expect(stc.overallHardEligibility).toBe('PASS');
    expect(cts.dimensions.PARTNER_WANTS_CHILDREN.status).toBe('SKIPPED');
    expect(cts.eligibilityFlags.children_unsure).toBe(false);

    const legacyStc = adaptHolyGrailEvaluationToLegacyDimensionMap(stc);
    expect(legacyStc.PARTNER_WANTS_CHILDREN).toBe(MatchingDimensionResults.MATCH);

    const pair = buildHolyGrailPairDecisionV1({
      searcherProfileId: 'a',
      counterpartyProfileId: 'b',
      searcherToCounterparty: legacyStc,
      counterpartyToSearcher: adaptHolyGrailEvaluationToLegacyDimensionMap(cts),
    });
    expect(pair.decision).toBe(HolyGrailPairDecisions.MUTUAL_MATCH);
  });
});
