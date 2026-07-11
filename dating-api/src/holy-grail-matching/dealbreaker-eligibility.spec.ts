import { SmokingFrequencySelf } from '../canonical/matching-canonical.types';
import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
import { MATCHING_CANONICAL_MODEL_VERSION } from '../canonical/matching-canonical.types';
import {
  evaluateDealbreakerDimensions,
  foldDealbreakerIntoOverall,
} from './dealbreaker-eligibility';
import { evaluateHolyGrailDirectional } from './eligibility.evaluator';
import type { DealbreakerSignal } from './dealbreaker-signals-text.extract';
import { mapProfileSourceToMatchingCanonical } from './profile-to-canonical.mapper';
import { buildHolyGrailProfileMappingInputFromDbRow } from './retrieval/holy-grail-structured-db-json';

function canon(partial: {
  profileId: string;
  facts?: MatchingCanonicalModel['facts'];
  preferences?: MatchingCanonicalModel['preferences'];
}): MatchingCanonicalModel {
  return {
    version: MATCHING_CANONICAL_MODEL_VERSION,
    profileId: partial.profileId,
    facts: partial.facts ?? {},
    preferences: partial.preferences ?? {},
    searchOverrides: {},
  };
}

function sig(
  tag: string,
  classification: DealbreakerSignal['classification'],
): DealbreakerSignal {
  return {
    tag: tag as DealbreakerSignal['tag'],
    classification,
    evidence: 'test',
    confidence: 0.95,
  };
}

describe('evaluateDealbreakerDimensions — smoking matrix', () => {
  const cases: Array<{
    name: string;
    searcher: DealbreakerSignal['classification'];
    counterparty: 'smokes' | 'never' | 'silent';
    expected: 'PASS' | 'FAIL' | 'UNKNOWN';
  }> = [
    {
      name: 'HARD_EXCLUDE + smokes → FAIL',
      searcher: 'HARD_EXCLUDE',
      counterparty: 'smokes',
      expected: 'FAIL',
    },
    {
      name: 'HARD_EXCLUDE + never → PASS',
      searcher: 'HARD_EXCLUDE',
      counterparty: 'never',
      expected: 'PASS',
    },
    {
      name: 'HARD_EXCLUDE + silent → UNKNOWN',
      searcher: 'HARD_EXCLUDE',
      counterparty: 'silent',
      expected: 'UNKNOWN',
    },
    {
      name: 'HARD_REQUIRE + smokes → PASS',
      searcher: 'HARD_REQUIRE',
      counterparty: 'smokes',
      expected: 'PASS',
    },
    {
      name: 'HARD_REQUIRE + never → FAIL',
      searcher: 'HARD_REQUIRE',
      counterparty: 'never',
      expected: 'FAIL',
    },
    {
      name: 'HARD_REQUIRE + silent → UNKNOWN',
      searcher: 'HARD_REQUIRE',
      counterparty: 'silent',
      expected: 'UNKNOWN',
    },
  ];

  it.each(cases)('$name', ({ searcher, counterparty, expected }) => {
    const facts =
      counterparty === 'smokes'
        ? { smoking: SmokingFrequencySelf.REGULAR }
        : counterparty === 'never'
          ? { smoking: SmokingFrequencySelf.NEVER }
          : {};
    const dims = evaluateDealbreakerDimensions({
      searcherSignals: [sig('smoking', searcher)],
      counterpartyFacts: facts,
    });
    expect(dims.smoking?.status).toBe(expected);
  });

  it('SOFT does not create a dimension', () => {
    const dims = evaluateDealbreakerDimensions({
      searcherSignals: [sig('smoking', 'SOFT')],
      counterpartyFacts: { smoking: SmokingFrequencySelf.REGULAR },
    });
    expect(dims).toEqual({});
  });
});

describe('foldDealbreakerIntoOverall — NEVER_BLOCKS', () => {
  it('UNKNOWN does not fail overall', () => {
    expect(
      foldDealbreakerIntoOverall('PASS', {
        smoking: { status: 'UNKNOWN', reasonCode: 'x' },
      }),
    ).toBe('PASS');
  });

  it('FAIL fails overall', () => {
    expect(
      foldDealbreakerIntoOverall('PASS', {
        smoking: { status: 'FAIL', reasonCode: 'x' },
      }),
    ).toBe('FAIL');
  });
});

describe('evaluateHolyGrailDirectional — story AC smoking via extract signals', () => {
  it('searcher HARD_EXCLUDE smokers + counterparty smokes → overall FAIL', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: canon({
        profileId: 's',
        preferences: {
          dealbreakerSignals: [sig('smoking', 'HARD_EXCLUDE')],
        },
      }),
      counterparty: canon({
        profileId: 'c',
        facts: { smoking: SmokingFrequencySelf.REGULAR },
      }),
    });
    expect(r.dealbreakerDimensions.smoking?.status).toBe('FAIL');
    expect(r.overallHardEligibility).toBe('FAIL');
  });

  it('searcher HARD_EXCLUDE + counterparty silent → overall PASS (NEVER_BLOCKS)', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: canon({
        profileId: 's',
        preferences: {
          dealbreakerSignals: [sig('smoking', 'HARD_EXCLUDE')],
        },
      }),
      counterparty: canon({ profileId: 'c', facts: {} }),
    });
    expect(r.dealbreakerDimensions.smoking?.status).toBe('UNKNOWN');
    expect(r.overallHardEligibility).toBe('PASS');
  });

  it('searcher SOFT + smoker counterparty → no dealbreaker FAIL', () => {
    const r = evaluateHolyGrailDirectional({
      searcher: canon({
        profileId: 's',
        preferences: {
          dealbreakerSignals: [sig('smoking', 'SOFT')],
        },
      }),
      counterparty: canon({
        profileId: 'c',
        facts: { smoking: SmokingFrequencySelf.REGULAR },
      }),
    });
    expect(r.dealbreakerDimensions).toEqual({});
    expect(r.overallHardEligibility).toBe('PASS');
  });
});

describe('extract-at-read chain → evaluateHolyGrailDirectional', () => {
  function pairFromText(searcherText: string, counterpartyAboutMe: string) {
    const searcherInput = buildHolyGrailProfileMappingInputFromDbRow({
      profileId: 'searcher',
      holyGrailStructuredFacts: {},
      holyGrailStructuredPreferences: {},
      aboutMe: '',
      aboutPartner: searcherText,
      aboutRelationship: '',
    });
    const counterpartyInput = buildHolyGrailProfileMappingInputFromDbRow({
      profileId: 'counter',
      holyGrailStructuredFacts: {},
      holyGrailStructuredPreferences: {},
      aboutMe: counterpartyAboutMe,
      aboutPartner: '',
      aboutRelationship: '',
    });
    return evaluateHolyGrailDirectional({
      searcher: mapProfileSourceToMatchingCanonical(searcherInput),
      counterparty: mapProfileSourceToMatchingCanonical(counterpartyInput),
    });
  }

  it('"don\'t want smokers" + "I smoke" → FAIL', () => {
    const r = pairFromText("I don't want smokers", 'I smoke');
    expect(r.dealbreakerDimensions.smoking?.status).toBe('FAIL');
    expect(r.overallHardEligibility).toBe('FAIL');
  });

  it('"don\'t want smokers" + silent → PASS (NEVER_BLOCKS)', () => {
    const r = pairFromText("I don't want smokers", 'I love hiking');
    expect(r.dealbreakerDimensions.smoking?.status).toBe('UNKNOWN');
    expect(r.overallHardEligibility).toBe('PASS');
  });

  it('"only smokers" + "I don\'t smoke" → FAIL', () => {
    const r = pairFromText('Only smokers', "I don't smoke");
    expect(r.dealbreakerDimensions.smoking?.status).toBe('FAIL');
    expect(r.overallHardEligibility).toBe('FAIL');
  });

  it('"don\'t care about smoking" + "I smoke" → PASS (SOFT ignored)', () => {
    const r = pairFromText("I don't care about smoking", 'I smoke');
    expect(r.dealbreakerDimensions.smoking).toBeUndefined();
    expect(r.overallHardEligibility).toBe('PASS');
  });
});
