import { buildChips } from './chips-builder';
import type { ExtractedSignals } from '../extraction/extracted-signals.interface';
import type { RawInterests } from '../extraction/extracted-interests.interface';
import type { ExtendedSignals } from './evaluate.service';

function mockExtractedSignals(
  domain: 'self' | 'partner' | 'relationship',
  overrides: Partial<Record<string, number | null>> = {},
): ExtractedSignals {
  const signals: Record<string, number | null> = {
    ambition: null,
    socialBattery: null,
    healthBodyConsciousness: null,
    emotionalDepth: null,
    attachmentSecurity: null,
    directness: null,
    independence: null,
    traditionalism: null,
    financialMindset: null,
    relationshipClarity: null,
    spirituality: null,
    lifestylePace: null,
    physicalPriority: null,
    statusOrientation: null,
    ...overrides,
  };

  return {
    domain,
    signals,
    evidence: [],
    version: 'v1',
    confidence: 0.7,
  };
}

describe('buildChips', () => {
  it('returns empty chips when all inputs are empty', () => {
    const self = mockExtractedSignals('self');
    const partner = mockExtractedSignals('partner');
    const relationship = mockExtractedSignals('relationship');

    const result = buildChips(self, partner, relationship);

    expect(result.self).toEqual([]);
    expect(result.partner).toEqual([]);
    expect(result.relationship).toEqual([]);
  });

  it('builds chips from rawInterests (primary source)', () => {
    const self = mockExtractedSignals('self');
    const partner = mockExtractedSignals('partner');
    const relationship = mockExtractedSignals('relationship');

    const rawInterests: RawInterests = {
      version: 'v1',
      self: [
        { tag: 'gym', strength: 'explicit', ruleId: 'llm_v1' },
        { tag: 'hiking', strength: 'strong', ruleId: 'llm_v1' },
      ],
      partner: [
        { tag: 'cooking', strength: 'explicit', ruleId: 'llm_v1' },
        { tag: 'travel', strength: 'strong', ruleId: 'llm_v1' },
      ],
      relationship: [
        { tag: 'home_life', strength: 'explicit', ruleId: 'llm_v1' },
      ],
    };

    const result = buildChips(self, partner, relationship, rawInterests);

    expect(result.self.length).toBeGreaterThan(0);
    expect(result.self[0].label).toBe('Fitness');
    expect(result.self[0].source).toBe('interest');
    expect(result.self[0].strength).toBe('explicit');

    expect(result.partner.length).toBeGreaterThan(0);
    expect(result.partner[0].label).toBe('Cooking');
    expect(result.partner[0].source).toBe('interest');

    expect(result.relationship.length).toBeGreaterThan(0);
    expect(result.relationship[0].label).toBe('Homebody');
    expect(result.relationship[0].source).toBe('interest');
  });

  it('builds chips from attractionTraits (partner domain)', () => {
    const self = mockExtractedSignals('self');
    const partner = mockExtractedSignals('partner');
    const relationship = mockExtractedSignals('relationship');

    const extendedSignals: ExtendedSignals = {
      version: 'v1',
      attractionTraits: {
        attraction: {
          ambition: 9,
          statusOrientation: 4,
          physicalPriority: 7,
          kindnessWarmth: 10,
          stabilityReliability: 8,
          independenceAutonomy: 5,
          emotionalDepth: 9,
          traditionalismValues: 3,
          financialPrudence: 6,
        },
        confidence: 0.85,
        evidence: [],
      },
    };

    const result = buildChips(self, partner, relationship, undefined, extendedSignals);

    expect(result.partner.length).toBeGreaterThan(0);
    const labels = result.partner.map((c) => c.label);
    expect(labels).toContain('Kind & Warm');
    expect(labels).toContain('Driven & Ambitious');
    expect(labels).toContain('Deep Talks');

    const kindChip = result.partner.find((c) => c.label === 'Kind & Warm');
    expect(kindChip?.source).toBe('trait');
    expect(kindChip?.strength).toBe('strong'); // score 10 >= 9
  });

  it('builds chips from relationshipMotivation (relationship domain)', () => {
    const self = mockExtractedSignals('self');
    const partner = mockExtractedSignals('partner');
    const relationship = mockExtractedSignals('relationship');

    const extendedSignals: ExtendedSignals = {
      version: 'v1',
      relationshipMotivation: {
        relationshipMotivation: 'family_builder',
        confidence: 0.9,
        evidence: ['wants kids', 'family oriented'],
      },
    };

    const result = buildChips(self, partner, relationship, undefined, extendedSignals);

    expect(result.relationship.length).toBeGreaterThan(0);
    expect(result.relationship[0].label).toBe('Family Builder');
    expect(result.relationship[0].source).toBe('motivation');
    expect(result.relationship[0].strength).toBe('strong'); // confidence 0.9 >= 0.8
  });

  it('falls back to strong signals when other sources are sparse', () => {
    const self = mockExtractedSignals('self', {
      ambition: 9,
      emotionalDepth: 8,
      independence: 7,
    });
    const partner = mockExtractedSignals('partner', {
      kindnessWarmth: 10,
      stabilityReliability: 8,
    });
    const relationship = mockExtractedSignals('relationship', {
      relationshipClarity: 9,
    });

    const result = buildChips(self, partner, relationship);

    expect(result.self.length).toBeGreaterThan(0);
    const selfLabels = result.self.map((c) => c.label);
    expect(selfLabels).toContain('Ambitious');
    expect(selfLabels).toContain('Emotionally Deep');

    const ambitiousChip = result.self.find((c) => c.label === 'Ambitious');
    expect(ambitiousChip?.source).toBe('signal');
    expect(ambitiousChip?.strength).toBe('strong'); // value 9 >= 9
  });

  it('respects max 5 chips per domain', () => {
    const self = mockExtractedSignals('self', {
      ambition: 9,
      socialBattery: 9,
      emotionalDepth: 9,
      independence: 9,
      directness: 9,
      traditionalism: 9,
      financialMindset: 9,
    });
    const partner = mockExtractedSignals('partner');
    const relationship = mockExtractedSignals('relationship');

    const result = buildChips(self, partner, relationship);

    expect(result.self.length).toBeLessThanOrEqual(5);
  });

  it('deduplicates chips by label (case-insensitive)', () => {
    const self = mockExtractedSignals('self', { ambition: 9 });
    const partner = mockExtractedSignals('partner');
    const relationship = mockExtractedSignals('relationship');

    const rawInterests: RawInterests = {
      version: 'v1',
      self: [
        { tag: 'gym', strength: 'explicit', ruleId: 'llm_v1' },
        { tag: 'gym', strength: 'strong', ruleId: 'llm_v1' }, // duplicate
      ],
      partner: [],
      relationship: [],
    };

    const result = buildChips(self, partner, relationship, rawInterests);

    const gymChips = result.self.filter((c) => c.label === 'Fitness');
    expect(gymChips.length).toBe(1);
  });

  it('sorts chips by strength (explicit > strong > undefined)', () => {
    const self = mockExtractedSignals('self');
    const partner = mockExtractedSignals('partner');
    const relationship = mockExtractedSignals('relationship');

    const rawInterests: RawInterests = {
      version: 'v1',
      self: [
        { tag: 'hiking', strength: 'strong', ruleId: 'llm_v1' },
        { tag: 'gym', strength: 'explicit', ruleId: 'llm_v1' },
        { tag: 'yoga', strength: 'strong', ruleId: 'llm_v1' },
      ],
      partner: [],
      relationship: [],
    };

    const result = buildChips(self, partner, relationship, rawInterests);

    expect(result.self[0].label).toBe('Fitness'); // explicit first
    expect(result.self[0].strength).toBe('explicit');
  });

  it('ignores low-confidence motivation (< 0.6)', () => {
    const self = mockExtractedSignals('self');
    const partner = mockExtractedSignals('partner');
    const relationship = mockExtractedSignals('relationship');

    const extendedSignals: ExtendedSignals = {
      version: 'v1',
      relationshipMotivation: {
        relationshipMotivation: 'family_builder',
        confidence: 0.5, // too low
        evidence: [],
      },
    };

    const result = buildChips(self, partner, relationship, undefined, extendedSignals);

    const motivationChips = result.relationship.filter((c) => c.source === 'motivation');
    expect(motivationChips.length).toBe(0);
  });

  it('ignores low-score attraction traits (< 7)', () => {
    const self = mockExtractedSignals('self');
    const partner = mockExtractedSignals('partner');
    const relationship = mockExtractedSignals('relationship');

    const extendedSignals: ExtendedSignals = {
      version: 'v1',
      attractionTraits: {
        attraction: {
          ambition: 6, // too low
          statusOrientation: 5,
          physicalPriority: 4,
          kindnessWarmth: 8, // should appear
          stabilityReliability: 3,
          independenceAutonomy: 2,
          emotionalDepth: 9, // should appear
          traditionalismValues: 1,
          financialPrudence: 0,
        },
        confidence: 0.8,
        evidence: [],
      },
    };

    const result = buildChips(self, partner, relationship, undefined, extendedSignals);

    const labels = result.partner.map((c) => c.label);
    expect(labels).toContain('Deep Talks');
    expect(labels).toContain('Kind & Warm');
    expect(labels).not.toContain('Driven & Ambitious'); // score 6 < 7
  });

  it('uses adaptive fallback for signals with value=7 when < 2 chips', () => {
    const self = mockExtractedSignals('self', {
      ambition: 7, // fallback threshold (< 2 chips, so included)
      emotionalDepth: 8, // primary threshold
      independence: 5, // too low
    });
    const partner = mockExtractedSignals('partner');
    const relationship = mockExtractedSignals('relationship');

    const result = buildChips(self, partner, relationship);

    const labels = result.self.map((c) => c.label);
    expect(labels).toContain('Emotionally Deep'); // value 8
    expect(labels).toContain('Ambitious'); // value 7, included via adaptive fallback
    expect(labels.length).toBe(2); // both chips present

    // Verify strength markers
    const emotionalChip = result.self.find((c) => c.label === 'Emotionally Deep');
    const ambitiousChip = result.self.find((c) => c.label === 'Ambitious');
    expect(emotionalChip?.strength).toBeUndefined(); // value 8, not 9
    expect(ambitiousChip?.strength).toBeUndefined(); // fallback chip, no strength
  });

  it('does not use fallback when >= 2 chips from primary threshold', () => {
    const self = mockExtractedSignals('self', {
      ambition: 7, // would be fallback, but not needed
      emotionalDepth: 8,
      independence: 8,
      directness: 6,
    });
    const partner = mockExtractedSignals('partner');
    const relationship = mockExtractedSignals('relationship');

    const result = buildChips(self, partner, relationship);

    const labels = result.self.map((c) => c.label);
    expect(labels).toContain('Emotionally Deep');
    expect(labels).toContain('Independent');
    expect(labels).not.toContain('Ambitious'); // not needed, already have 2 chips
    expect(labels.length).toBe(2);
  });
});
