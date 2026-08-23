import { compare } from './match-engine';
import { COMPATIBILITY_SIGNAL_KEYS } from '../../compatibility/compatibility-score';
import { INTEREST_CANONICAL_TAGS } from '../../extraction/extracted-interests.interface';
import {
  makeProfile,
  makeProfileWithExpansion04Shadow,
  makeProfileWithExpansion05Shadow,
  makeProfileWithExpansion06Shadow,
  makeProfileWithExpansion07Shadow,
  makeSignals,
} from './match-engine.spec-support';

describe('match-engine expansion shadow (05-09)', () => {
describe('Expansion-05 shadow E2E via compare', () => {
  it('keeps Expansion-05 shadow keys out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(
      'physicalActivityLevel',
    );
    expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(
      'domesticComfort',
    );
  });

  it('Expansion-05 keys are distinct from interest tags and adjacent official signals', () => {
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(
      'physicalActivityLevel',
    );
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(
      'domesticComfort',
    );
    expect('physicalActivityLevel').not.toBe('healthBodyConsciousness');
    expect('physicalActivityLevel').not.toBe('physicalPriority');
    expect('domesticComfort').not.toBe('socialBattery');
    expect('domesticComfort').not.toBe('lifestylePace');
  });

  it('activity gap triggers Different activity levels tension chip', () => {
    const a = makeProfileWithExpansion05Shadow('a', 'A', {}, { physicalActivityLevel: 9 });
    const b = makeProfileWithExpansion05Shadow('b', 'B', {}, { physicalActivityLevel: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Different activity levels');
    expect(result.tensionMatrix.some((t) => t.id === 'activity_level_gap')).toBe(true);
  });

  it('domestic mismatch triggers Home vs out mismatch tension chip', () => {
    const a = makeProfileWithExpansion05Shadow('a', 'A', {}, { domesticComfort: 9 });
    const b = makeProfileWithExpansion05Shadow('b', 'B', {}, { domesticComfort: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Home vs out mismatch');
    expect(result.tensionMatrix.some((t) => t.id === 'domestic_out_mismatch')).toBe(
      true,
    );
  });

  it('high physicalActivityLevel on both sides surfaces Activity level match positive chip', () => {
    const a = makeProfileWithExpansion05Shadow('a', 'A', {}, { physicalActivityLevel: 8 });
    const b = makeProfileWithExpansion05Shadow('b', 'B', {}, { physicalActivityLevel: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Activity level match');
  });

  it('high domesticComfort on both sides surfaces Home/out balance positive chip', () => {
    const a = makeProfileWithExpansion05Shadow('a', 'A', {}, { domesticComfort: 8 });
    const b = makeProfileWithExpansion05Shadow('b', 'B', {}, { domesticComfort: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Home/out balance');
  });

  it('excludes Expansion-05 shadow keys from alignments DTO', () => {
    const a = makeProfileWithExpansion05Shadow('a', 'A', {}, { physicalActivityLevel: 8 });
    const b = makeProfileWithExpansion05Shadow('b', 'B', {}, { physicalActivityLevel: 8 });
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) =>
          row.key !== 'Physical Activity Level' &&
          row.key !== 'Domestic Comfort' &&
          row.key !== 'Activity level match' &&
          row.key !== 'Home/out balance' &&
          !/activity|domestic/i.test(row.key),
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips activity chip and activity_level_gap tension', () => {
    const a = makeProfileWithExpansion05Shadow('a', 'A', {}, { physicalActivityLevel: 8 });
    const b = makeProfileWithExpansion05Shadow('b', 'B', {}, { physicalActivityLevel: null });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain('Activity level match');
    expect(result.tensionMatrix.some((t) => t.id === 'activity_level_gap')).toBe(false);
  });

  it('compatibility unchanged when only Expansion-05 shadow signals differ', () => {
    const highA = makeProfileWithExpansion05Shadow(
      'a1',
      'A1',
      {},
      { physicalActivityLevel: 8 },
    );
    const highB = makeProfileWithExpansion05Shadow(
      'b1',
      'B1',
      {},
      { physicalActivityLevel: 8 },
    );
    const gapA = makeProfileWithExpansion05Shadow(
      'a2',
      'A2',
      {},
      { physicalActivityLevel: 9 },
    );
    const gapB = makeProfileWithExpansion05Shadow(
      'b2',
      'B2',
      {},
      { physicalActivityLevel: 2 },
    );
    const highResult = compare(highA, highB);
    const gapResult = compare(gapA, gapB);
    expect(gapResult.compatibility).toBe(highResult.compatibility);
  });

  it('Expansion-04 intellectual gap tension still works (non-regression)', () => {
    const a = makeProfileWithExpansion04Shadow('a', 'A', {}, { intellectualCuriosity: 9 });
    const b = makeProfileWithExpansion04Shadow('b', 'B', {}, { intellectualCuriosity: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe(
      'Different mental stimulation needs',
    );
  });

  it('interest tags and Expansion-05 shadow chips coexist independently', () => {
    const a = makeProfileWithExpansion05Shadow(
      'a',
      'A',
      {},
      { physicalActivityLevel: 8 },
      50,
      ['gym', 'hiking'],
    );
    const b = makeProfileWithExpansion05Shadow(
      'b',
      'B',
      {},
      { physicalActivityLevel: 8 },
      50,
      ['gym', 'hiking'],
    );
    const result = compare(a, b);
    expect(result.interestAlignment).toBe(100);
    expect(result.explainability.sharedInterestNote).toBeDefined();
    expect(result.explainability.positiveChips).toContain('Activity level match');
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).toContain('gym');
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).toContain('hiking');
  });
});

describe('Expansion-06 shadow E2E via compare', () => {
  it('keeps Expansion-06 shadow key out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(
      'adventureNovelty',
    );
  });

  it('Expansion-06 key is distinct from interest tags and adjacent signals', () => {
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(
      'adventureNovelty',
    );
    expect('adventureNovelty').not.toBe('lifestylePace');
    expect('adventureNovelty').not.toBe('domesticComfort');
    expect('adventureNovelty').not.toBe('socialBattery');
  });

  it('novelty clash triggers Novelty vs routine tension chip', () => {
    const a = makeProfileWithExpansion06Shadow('a', 'A', {}, { adventureNovelty: 9 });
    const b = makeProfileWithExpansion06Shadow('b', 'B', {}, { adventureNovelty: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Novelty vs routine');
    expect(result.tensionMatrix.some((t) => t.id === 'novelty_routine_clash')).toBe(
      true,
    );
  });

  it('high adventureNovelty on both sides surfaces Adventure & novelty positive chip', () => {
    const a = makeProfileWithExpansion06Shadow('a', 'A', {}, { adventureNovelty: 8 });
    const b = makeProfileWithExpansion06Shadow('b', 'B', {}, { adventureNovelty: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Adventure & novelty');
  });

  it('excludes Expansion-06 shadow keys from alignments DTO', () => {
    const a = makeProfileWithExpansion06Shadow('a', 'A', {}, { adventureNovelty: 8 });
    const b = makeProfileWithExpansion06Shadow('b', 'B', {}, { adventureNovelty: 8 });
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) =>
          row.key !== 'Adventure Novelty' &&
          row.key !== 'Adventure & novelty' &&
          !/adventure|novelty/i.test(row.key),
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips novelty chip and novelty_routine_clash tension', () => {
    const a = makeProfileWithExpansion06Shadow('a', 'A', {}, { adventureNovelty: 8 });
    const b = makeProfileWithExpansion06Shadow('b', 'B', {}, { adventureNovelty: null });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).not.toContain('Adventure & novelty');
    expect(result.tensionMatrix.some((t) => t.id === 'novelty_routine_clash')).toBe(
      false,
    );
  });

  it('compatibility unchanged when only Expansion-06 shadow signals differ', () => {
    const highA = makeProfileWithExpansion06Shadow(
      'a1',
      'A1',
      {},
      { adventureNovelty: 8 },
    );
    const highB = makeProfileWithExpansion06Shadow(
      'b1',
      'B1',
      {},
      { adventureNovelty: 8 },
    );
    const gapA = makeProfileWithExpansion06Shadow(
      'a2',
      'A2',
      {},
      { adventureNovelty: 9 },
    );
    const gapB = makeProfileWithExpansion06Shadow(
      'b2',
      'B2',
      {},
      { adventureNovelty: 2 },
    );
    const aligned = compare(highA, highB);
    const gapped = compare(gapA, gapB);
    expect(aligned.compatibility).toBe(gapped.compatibility);
  });

  it('Expansion-05 non-regression: activity gap still surfaces Different activity levels', () => {
    const a = makeProfileWithExpansion05Shadow('a', 'A', {}, { physicalActivityLevel: 9 });
    const b = makeProfileWithExpansion05Shadow('b', 'B', {}, { physicalActivityLevel: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Different activity levels');
  });

  it('interest tags and Expansion-06 shadow chips coexist independently', () => {
    const a = makeProfileWithExpansion06Shadow(
      'a',
      'A',
      {},
      { adventureNovelty: 8 },
      50,
      ['travel'],
    );
    const b = makeProfileWithExpansion06Shadow(
      'b',
      'B',
      {},
      { adventureNovelty: 8 },
      50,
      ['travel'],
    );
    const result = compare(a, b);
    expect(result.interestAlignment).toBe(100);
    expect(result.explainability.sharedInterestNote).toBeDefined();
    expect(result.explainability.positiveChips).toContain('Adventure & novelty');
    expect(INTEREST_CANONICAL_TAGS as readonly string[]).toContain('travel');
  });
});

describe('Expansion-07 shadow E2E via compare', () => {
  it('keeps Expansion-07 shadow keys out of COMPATIBILITY_SIGNAL_KEYS', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS.length).toBe(15);
    for (const key of [
      'casualIntimacyIntent',
      'supportExchangeOrientation',
      'supportProviderOrientation',
      'supportRecipientOrientation',
      'religiousObservance',
    ] as const) {
      expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(key);
    }
  });

  it('Expansion-07 keys are distinct from interest tags and adjacent signals', () => {
    for (const key of [
      'casualIntimacyIntent',
      'supportExchangeOrientation',
      'supportProviderOrientation',
      'supportRecipientOrientation',
      'religiousObservance',
    ] as const) {
      expect(INTEREST_CANONICAL_TAGS as readonly string[]).not.toContain(key);
    }
    expect('casualIntimacyIntent').not.toBe('physicalPriority');
    expect('casualIntimacyIntent').not.toBe('relationshipClarity');
    expect('religiousObservance').not.toBe('spirituality');
    expect('religiousObservance').not.toBe('traditionalism');
    expect('supportExchangeOrientation').not.toBe('financialMindset');
  });

  it('casual intimacy clash triggers Casual vs committed intimacy tension chip', () => {
    const a = makeProfileWithExpansion07Shadow('a', 'A', {}, { casualIntimacyIntent: 9 });
    const b = makeProfileWithExpansion07Shadow('b', 'B', {}, { casualIntimacyIntent: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Casual vs committed intimacy');
    expect(result.tensionMatrix.some((t) => t.id === 'casual_intimacy_clash')).toBe(
      true,
    );
  });

  it('support exchange mismatch triggers Arrangement vs romance tension chip', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      { supportExchangeOrientation: 9 },
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      { supportExchangeOrientation: 2 },
    );
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Arrangement vs romance');
    expect(
      result.tensionMatrix.some((t) => t.id === 'support_exchange_mismatch'),
    ).toBe(true);
  });

  it('both providers triggers Both want to provide tension chip', () => {
    const shadow = {
      supportExchangeOrientation: 8,
      supportProviderOrientation: 8,
      supportRecipientOrientation: 2,
    };
    const a = makeProfileWithExpansion07Shadow('a', 'A', {}, shadow);
    const b = makeProfileWithExpansion07Shadow('b', 'B', {}, shadow);
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Both want to provide');
    expect(result.tensionMatrix.some((t) => t.id === 'support_both_provider')).toBe(
      true,
    );
  });

  it('both recipients triggers Both seek support tension chip', () => {
    const shadow = {
      supportExchangeOrientation: 8,
      supportProviderOrientation: 2,
      supportRecipientOrientation: 8,
    };
    const a = makeProfileWithExpansion07Shadow('a', 'A', {}, shadow);
    const b = makeProfileWithExpansion07Shadow('b', 'B', {}, shadow);
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Both seek support');
    expect(result.tensionMatrix.some((t) => t.id === 'support_both_recipient')).toBe(
      true,
    );
  });

  it('religious observance gap triggers Religious practice gap tension chip', () => {
    const a = makeProfileWithExpansion07Shadow('a', 'A', {}, { religiousObservance: 9 });
    const b = makeProfileWithExpansion07Shadow('b', 'B', {}, { religiousObservance: 2 });
    const result = compare(a, b);
    expect(result.friction).toBeGreaterThanOrEqual(3);
    expect(result.explainability.tensionChip).toBe('Religious practice gap');
    expect(
      result.tensionMatrix.some((t) => t.id === 'religious_observance_gap'),
    ).toBe(true);
  });

  it('high casualIntimacyIntent on both sides surfaces Intimacy expectations positive chip', () => {
    const a = makeProfileWithExpansion07Shadow('a', 'A', {}, { casualIntimacyIntent: 8 });
    const b = makeProfileWithExpansion07Shadow('b', 'B', {}, { casualIntimacyIntent: 8 });
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Intimacy expectations');
  });

  it('provider↔recipient alignment surfaces Financial support alignment chip', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      {
        supportExchangeOrientation: 9,
        supportProviderOrientation: 9,
        supportRecipientOrientation: 2,
      },
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      {
        supportExchangeOrientation: 9,
        supportProviderOrientation: 2,
        supportRecipientOrientation: 9,
      },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain(
      'Financial support alignment',
    );
  });

  it('both low exchange surfaces Non-transactional match chip', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      { supportExchangeOrientation: 2 },
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      { supportExchangeOrientation: 2 },
    );
    const result = compare(a, b);
    expect(result.explainability.positiveChips).toContain('Non-transactional match');
  });

  it('excludes Expansion-07 shadow keys from alignments DTO', () => {
    const a = makeProfileWithExpansion07Shadow('a', 'A', {}, { religiousObservance: 8 });
    const b = makeProfileWithExpansion07Shadow('b', 'B', {}, { religiousObservance: 8 });
    const result = compare(a, b);
    expect(
      result.alignments.every(
        (row) =>
          row.key !== 'Religious Observance' &&
          row.key !== 'Religious practice' &&
          row.key !== 'Intimacy expectations' &&
          row.key !== 'Support & arrangement style' &&
          row.key !== 'Financial support alignment' &&
          row.key !== 'Non-transactional match' &&
          !/casualIntimacy|supportExchange|supportProvider|supportRecipient|religiousObservance/i.test(
            row.key,
          ),
      ),
    ).toBe(true);
  });

  it('null shadow on one side skips casual_intimacy_clash tension', () => {
    const a = makeProfileWithExpansion07Shadow('a', 'A', {}, { casualIntimacyIntent: 9 });
    const b = makeProfileWithExpansion07Shadow('b', 'B', {}, { casualIntimacyIntent: null });
    const result = compare(a, b);
    expect(result.tensionMatrix.some((t) => t.id === 'casual_intimacy_clash')).toBe(
      false,
    );
  });

  it('compatibility unchanged when only Expansion-07 shadow signals differ', () => {
    const highA = makeProfileWithExpansion07Shadow(
      'a1',
      'A1',
      {},
      { casualIntimacyIntent: 8, religiousObservance: 8 },
    );
    const highB = makeProfileWithExpansion07Shadow(
      'b1',
      'B1',
      {},
      { casualIntimacyIntent: 8, religiousObservance: 8 },
    );
    const gapA = makeProfileWithExpansion07Shadow(
      'a2',
      'A2',
      {},
      { casualIntimacyIntent: 9, religiousObservance: 9 },
    );
    const gapB = makeProfileWithExpansion07Shadow(
      'b2',
      'B2',
      {},
      { casualIntimacyIntent: 2, religiousObservance: 2 },
    );
    const aligned = compare(highA, highB);
    const gapped = compare(gapA, gapB);
    expect(aligned.compatibility).toBe(gapped.compatibility);
  });

  it('emits interestOverlapTags (max 2) from shared interestsTop3', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      {},
      50,
      ['travel', 'books'],
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      {},
      50,
      ['travel', 'books'],
    );
    const result = compare(a, b);
    expect(result.explainability.interestOverlapTags).toEqual(['travel', 'books']);
    expect(result.explainability.interestOverlapTags!.length).toBeLessThanOrEqual(2);
  });

  it('Expansion-06 non-regression: novelty gap still surfaces Novelty vs routine', () => {
    const a = makeProfileWithExpansion06Shadow('a', 'A', {}, { adventureNovelty: 9 });
    const b = makeProfileWithExpansion06Shadow('b', 'B', {}, { adventureNovelty: 2 });
    const result = compare(a, b);
    expect(result.explainability.tensionChip).toBe('Novelty vs routine');
  });
});

describe('Expansion-09 interest overlap E2E via compare', () => {
  it('emits shared biking and camping interestOverlapTags', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      {},
      50,
      ['biking', 'camping'],
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      {},
      50,
      ['biking', 'camping'],
    );
    const result = compare(a, b);
    expect(result.explainability.interestOverlapTags).toEqual([
      'biking',
      'camping',
    ]);
    expect(result.explainability.interestOverlapTags!.length).toBeLessThanOrEqual(
      2,
    );
  });

  it('prefers nature over non-preferred gaming in interestOverlapTags', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      {},
      50,
      ['gaming', 'nature'],
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      {},
      50,
      ['gaming', 'nature'],
    );
    const result = compare(a, b);
    expect(result.explainability.interestOverlapTags).toEqual([
      'nature',
      'gaming',
    ]);
    expect(result.explainability.interestOverlapTags!.length).toBeLessThanOrEqual(
      2,
    );
  });

  it('caps three Expansion-09 preferred shared tags at 2', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      {},
      50,
      ['biking', 'camping', 'nature'],
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      {},
      50,
      ['biking', 'camping', 'nature'],
    );
    const result = compare(a, b);
    const tags = result.explainability.interestOverlapTags ?? [];
    expect(tags).toHaveLength(2);
    expect(['biking', 'camping', 'nature']).toEqual(
      expect.arrayContaining(tags),
    );
  });

  it('keeps Expansion-07 travel/books interest overlap regression', () => {
    const a = makeProfileWithExpansion07Shadow(
      'a',
      'A',
      {},
      {},
      50,
      ['travel', 'books'],
    );
    const b = makeProfileWithExpansion07Shadow(
      'b',
      'B',
      {},
      {},
      50,
      ['travel', 'books'],
    );
    const result = compare(a, b);
    expect(result.explainability.interestOverlapTags).toEqual([
      'travel',
      'books',
    ]);
  });
});
});
