import { describe, expect, it } from 'vitest';
import {
  boundaryChipsFromTexts,
  buildChipsForUi,
  dedupeByLabel,
  diversifyPartnerChips,
  fallbackSelfChips,
  flattenProfileChipsForMerge,
  prefixedChipLabel,
  toDisplayChips,
  toLegacyDisplayChips,
} from './profile-chip-extraction';
import type { Evaluation, EvaluationChip } from './profile-types';

const emptyDomain = {
  domain: 'self',
  signals: {} as Record<string, number | null>,
  evidence: [] as { signal: string; quote: string }[],
  confidence: 0,
};

function baseEvaluation(over: Partial<Evaluation> = {}): Evaluation {
  return {
    self: { ...emptyDomain, domain: 'self' },
    partner: { ...emptyDomain, domain: 'partner' },
    relationship: { ...emptyDomain, domain: 'relationship' },
    display: { summary: 's', insight: 'i' },
    productScores: {
      partnerFitScore: 0,
      relationshipFitScore: 0,
      coverageScore: 0,
      frictionRiskScore: 0,
      overallDecisionScore: 0,
    },
    flags: [],
    ...over,
  };
}

describe('boundaryChipsFromTexts', () => {
  it('extracts childfree boundary from about me', () => {
    const chips = boundaryChipsFromTexts({
      aboutMe: 'I am proudly childfree and happy.',
      aboutPartner: '',
      aboutRelationship: '',
    });
    expect(chips.map((c) => c.label)).toEqual(['Boundary: Childfree']);
    expect(chips[0].hint).toContain('family boundary');
  });

  it('matches no drama / avoids drama', () => {
    expect(
      boundaryChipsFromTexts({
        aboutMe: '',
        aboutPartner: 'Someone who avoids drama',
        aboutRelationship: '',
      }).map((c) => c.label),
    ).toEqual(['Boundary: No Drama']);

    expect(
      boundaryChipsFromTexts({
        aboutMe: 'No drama please',
        aboutPartner: '',
        aboutRelationship: '',
      }).map((c) => c.label),
    ).toEqual(['Boundary: No Drama']);
  });

  it('matches pacing boundaries', () => {
    for (const phrase of ['not rushing', 'not rushed', 'no rush']) {
      const chips = boundaryChipsFromTexts({
        aboutMe: `We are ${phrase} into anything`,
        aboutPartner: '',
        aboutRelationship: '',
      });
      expect(chips.map((c) => c.label)).toEqual(['Boundary: Not Rushed']);
    }
  });

  it('matches repair-over-blame phrases', () => {
    expect(
      boundaryChipsFromTexts({
        aboutMe: '',
        aboutPartner: '',
        aboutRelationship: 'I believe repair over blame',
      }).map((c) => c.label),
    ).toEqual(['Boundary: Repair Over Blame']);

    expect(
      boundaryChipsFromTexts({
        aboutMe: '',
        aboutPartner: '',
        aboutRelationship: 'Repair is normal after conflict',
      }).map((c) => c.label),
    ).toEqual(['Boundary: Repair Over Blame']);
  });

  it('returns multiple boundaries when several match across texts', () => {
    const chips = boundaryChipsFromTexts({
      aboutMe: 'childfree',
      aboutPartner: 'no drama',
      aboutRelationship: 'no rush',
    });
    expect(chips.map((c) => c.label)).toEqual([
      'Boundary: Childfree',
      'Boundary: No Drama',
      'Boundary: Not Rushed',
    ]);
  });

  it('returns empty when no boundary phrases appear', () => {
    expect(
      boundaryChipsFromTexts({
        aboutMe: 'I like hiking and coffee',
        aboutPartner: 'Kind and funny',
        aboutRelationship: 'Steady growth',
      }),
    ).toEqual([]);
  });
});

describe('fallbackSelfChips', () => {
  it('detects spiritual / direct / ambitious / lifestyle cues', () => {
    expect(fallbackSelfChips('My faith and tradition matter').map((c) => c.label)).toEqual([
      'Spiritual',
    ]);
    expect(fallbackSelfChips('I am direct and clear').map((c) => c.label)).toContain(
      'Direct Communication',
    );
    expect(fallbackSelfChips('Ambitious career goals').map((c) => c.label)).toContain('Ambitious');
    expect(fallbackSelfChips('Quiet routine, slow and steady').map((c) => c.label)).toContain(
      'Lifestyle Pace',
    );
  });

  it('caps at two chips and dedupes', () => {
    const chips = fallbackSelfChips(
      'spiritual faith tradition direct clear honest ambitious driven career',
    );
    expect(chips.length).toBeLessThanOrEqual(2);
  });
});

describe('dedupeByLabel / diversifyPartnerChips', () => {
  it('dedupes case-insensitively and skips empty labels', () => {
    const chips: EvaluationChip[] = [
      { label: 'Ambitious', source: 'signal' },
      { label: ' ambitious ', source: 'trait' },
      { label: '', source: 'interest' },
      { label: 'Calm', source: 'trait' },
    ];
    expect(dedupeByLabel(chips).map((c) => c.label)).toEqual(['Ambitious', 'Calm']);
  });

  it('surfaces up to three traits first then fills to six', () => {
    const chips: EvaluationChip[] = [
      { label: 'A', source: 'interest' },
      { label: 'T1', source: 'trait' },
      { label: 'T2', source: 'trait' },
      { label: 'T3', source: 'trait' },
      { label: 'T4', source: 'trait' },
      { label: 'B', source: 'motivation' },
      { label: 'C', source: 'signal' },
    ];
    expect(diversifyPartnerChips(chips).map((c) => c.label)).toEqual([
      'T1',
      'T2',
      'T3',
      'A',
      'B',
      'C',
    ]);
  });
});

describe('buildChipsForUi', () => {
  it('prefixes domain labels and attaches boundary chips', () => {
    const evaluation = baseEvaluation({
      chips: {
        self: [{ label: 'Curious', source: 'trait' }],
        partner: [{ label: 'Kind', source: 'trait' }],
        relationship: [{ label: 'Family Builder', source: 'motivation' }],
      },
    });
    const built = buildChipsForUi(
      {
        texts: {
          aboutMe: 'hello',
          aboutPartner: '',
          aboutRelationship: 'I am childfree',
        },
      },
      evaluation,
    );
    expect(built.self[0].label).toBe('Self: Curious');
    expect(built.partner[0].label).toBe('Partner: Kind');
    expect(built.relationship[0].label).toBe('Relationship: Family Builder');
    expect(built.boundaries.map((c) => c.label)).toEqual(['Boundary: Childfree']);
  });

  it('drops Traditional Values when Family Builder is present', () => {
    const built = buildChipsForUi(
      { texts: { aboutMe: '', aboutPartner: '', aboutRelationship: '' } },
      baseEvaluation({
        chips: {
          self: [],
          partner: [],
          relationship: [
            { label: 'Family Builder', source: 'motivation' },
            { label: 'Traditional Values', source: 'trait' },
          ],
        },
      }),
    );
    expect(built.relationship.map((c) => c.label)).toEqual(['Relationship: Family Builder']);
  });

  it('fills empty self chips from aboutMe heuristics', () => {
    const built = buildChipsForUi(
      {
        texts: {
          aboutMe: 'I am ambitious and driven',
          aboutPartner: '',
          aboutRelationship: '',
        },
      },
      baseEvaluation({ chips: { self: [], partner: [], relationship: [] } }),
    );
    expect(built.self.some((c) => c.label === 'Self: Ambitious')).toBe(true);
  });
});

describe('display chip helpers', () => {
  it('prefixes and formats hints for modern and legacy paths', () => {
    expect(prefixedChipLabel('relationship', 'Steady')).toBe('Relationship: Steady');
    const modern = toDisplayChips('self', [{ label: 'Calm', source: 'trait' }], 'about me');
    expect(modern[0]).toMatchObject({
      label: 'Self: Calm',
      hint: 'Trait from about me.',
    });
    const legacy = toLegacyDisplayChips([{ label: 'Calm', source: 'trait' }], 'about me');
    expect(legacy[0].label).toBe('Calm');
    expect(legacy[0].hint).toBe('Trait from about me.');
  });

  it('flattenProfileChipsForMerge respects legacyChipsUx', () => {
    const evaluation = baseEvaluation({
      chips: {
        self: [{ label: 'A', source: 'signal' }],
        partner: [],
        relationship: [],
      },
    });
    const profile = {
      texts: { aboutMe: 'childfree', aboutPartner: '', aboutRelationship: '' },
    };
    const legacy = flattenProfileChipsForMerge(evaluation, profile, true);
    expect(legacy.some((c) => c.label === 'A')).toBe(true);
    expect(legacy.some((c) => c.label === 'Self: A')).toBe(false);

    const modern = flattenProfileChipsForMerge(evaluation, profile, false);
    expect(modern.some((c) => c.label === 'Self: A')).toBe(true);
    expect(modern.some((c) => c.label === 'Boundary: Childfree')).toBe(true);
  });
});
