/**
 * Cross-cutting tests: extraction, sparse DB parse, canonical map, ranking Δ, rankReasons explanation.
 */
import { mapProfileSourceToMatchingCanonical } from './profile-to-canonical.mapper';
import { mergeEffectiveMatchingPreferences } from './eligibility.evaluator';
import { computeHolyGrailFiveSignalRank } from './holy-grail-five-signal-ranking';
import {
  buildHolyGrailProfileMappingInputFromDbRow,
  parseHolyGrailStructuredPreferencesFromJson,
} from './retrieval/holy-grail-structured-db-json';
import { extractSimilarityPreferenceFromFreeText } from './similarity-preference-text.extract';
import { MATCHING_CANONICAL_MODEL_VERSION } from '../canonical/matching-canonical.types';
import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';

function canon(
  profileId: string,
  prefs: MatchingCanonicalModel['preferences'],
  rs: NonNullable<MatchingCanonicalModel['rankingSignals']>,
): MatchingCanonicalModel {
  return {
    version: MATCHING_CANONICAL_MODEL_VERSION,
    profileId,
    facts: {},
    preferences: prefs,
    searchOverrides: {},
    rankingSignals: rs,
  };
}

const fullRs = {
  dailyRhythm: 'dr',
  autonomyTogetherness: 'at',
  conflictStyle: 7,
  lifestylePace: 3,
  interestsTop: ['a', 'b'],
} as const;

describe('similarityPreference — extraction', () => {
  it('reads phrase from aboutMe when aboutPartner is empty', () => {
    const r = extractSimilarityPreferenceFromFreeText({
      aboutMe: 'I hope to meet someone similar to me.',
      aboutPartner: '',
      aboutRelationship: '',
    });
    expect(r.value).toBe('similar');
    expect(r.evidence.length).toBeGreaterThan(0);
  });
});

describe('similarityPreference — missing / sparse', () => {
  it('parseHolyGrailStructuredPreferencesFromJson omits key when absent (undefined merged → empty object)', () => {
    expect(parseHolyGrailStructuredPreferencesFromJson({})).toBeUndefined();
  });

  it('parse preserves explicit JSON null when key present', () => {
    const p = parseHolyGrailStructuredPreferencesFromJson({ similarityPreference: null });
    expect(p?.similarityPreference).toBeNull();
  });

  it('parse throws on invalid similarityPreference enum string', () => {
    expect(() => parseHolyGrailStructuredPreferencesFromJson({ similarityPreference: 'nope' })).toThrow(
      /invalid similarityPreference/,
    );
  });

  it('build mapping input: no structuredPreferences when DB prefs empty', () => {
    const input = buildHolyGrailProfileMappingInputFromDbRow({
      profileId: 'p',
      extractionV2: null,
      holyGrailStructuredFacts: null,
      holyGrailStructuredPreferences: {},
    });
    expect(input.structuredPreferences).toBeUndefined();
  });
});

describe('similarityPreference — canonical mapping', () => {
  it('searchOverrides.similarityPreference overrides stored preferences', () => {
    const m = mapProfileSourceToMatchingCanonical({
      profileId: 'p',
      structuredPreferences: { similarityPreference: 'similar' },
      searchOverrides: { similarityPreference: 'different' },
    });
    expect(mergeEffectiveMatchingPreferences(m).similarityPreference).toBe('different');
  });

  it('throws on invalid structuredPreferences.similarityPreference string', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        structuredPreferences: { similarityPreference: 'invalid' as 'similar' },
      }),
    ).toThrow(/structuredPreferences.similarityPreference/);
  });
});

describe('similarityPreference — ranking effect', () => {
  it('does not add similarityPreference row when preference is unset', () => {
    const r = computeHolyGrailFiveSignalRank({
      searcher: canon('s', { similarityPreference: undefined }, { ...fullRs }),
      candidate: canon('c', {}, { ...fullRs }),
    });
    expect(r.rankBreakdown.every((b) => b.signal !== 'similarityPreference')).toBe(true);
  });

  it('does not add similarityPreference row when preference is explicit null', () => {
    const r = computeHolyGrailFiveSignalRank({
      searcher: canon('s', { similarityPreference: null }, { ...fullRs }),
      candidate: canon('c', {}, { ...fullRs }),
    });
    expect(r.rankBreakdown.every((b) => b.signal !== 'similarityPreference')).toBe(true);
  });

  it('does not add similarityPreference row on empty-signal spread path even if preference set', () => {
    const empty = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const r = computeHolyGrailFiveSignalRank({
      searcher: canon('s', { similarityPreference: 'similar' }, empty),
      candidate: canon('c', {}, empty),
    });
    expect(r.rankBreakdown.some((b) => b.signal === 'deterministicSpread')).toBe(true);
    expect(r.rankBreakdown.some((b) => b.signal === 'similarityPreference')).toBe(false);
  });

  it('does not add row when similarity set but no pairwise overlap slice exists', () => {
    const oneSided = {
      dailyRhythm: 'only_searcher',
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const cand = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const r = computeHolyGrailFiveSignalRank({
      searcher: canon('s', { similarityPreference: 'similar' }, oneSided),
      candidate: canon('c', {}, cand),
    });
    expect(r.rankBreakdown.some((b) => b.signal === 'similarityPreference')).toBe(false);
  });
});

describe('similarityPreference — explanation (rankReasons)', () => {
  it('rankReasons includes encoded similarityPreference line with Δ and note', () => {
    const r = computeHolyGrailFiveSignalRank({
      searcher: canon('sx', { similarityPreference: 'similar' }, { ...fullRs }),
      candidate: canon('cx', {}, { ...fullRs }),
    });
    const line = r.rankReasons.find((x) => x.startsWith('similarityPreference:'));
    expect(line).toBeDefined();
    expect(line).toMatch(/similarityPreference:\+[0-9.]+/);
    expect(line).toMatch(/reward_overlap/);
    expect(line).toMatch(/O=/);
  });
});
