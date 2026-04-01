import { buildChips } from './chips-layer-builder';
import type { ExtractionV2Result } from '../extraction/extraction-v2.service';
import type { ExtractedSignals } from '../extraction/extracted-signals.interface';

function domain(
  key: 'self' | 'partner' | 'relationship',
  overrides: Partial<ExtractedSignals> = {},
): ExtractedSignals {
  return {
    domain: key,
    signals: {
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
      intellectualCuriosity: null,
      conflictStyle: null,
      noveltyVsRoutine: null,
      structureChaosTolerance: null,
      ...(overrides.signals ?? {}),
    },
    rawInterests: [],
    negativePreferences: [],
    softNo: [],
    dealbreakers: [],
    evidence: [],
    version: 'v1',
    confidence: 0.7,
    ...overrides,
  };
}

function extraction(
  self: Partial<ExtractedSignals> = {},
  partner: Partial<ExtractedSignals> = {},
  relationship: Partial<ExtractedSignals> = {},
): ExtractionV2Result {
  return {
    version: 'v2',
    extractedAt: '2026-04-01T00:00:00.000Z',
    base: {
      self: domain('self', self),
      partner: domain('partner', partner),
      relationship: domain('relationship', relationship),
    },
    interests: { self: [], partner: [], relationship: [] },
    negatives: { self: [], partner: [], relationship: [] },
    _usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUSD: 0,
      durationMs: 0,
    },
    _provenance: {
      extractorVersion: 'test',
      promptHashes: { base: 'b', interests: 'i', negatives: 'n' },
    },
  };
}

describe('buildChips (extraction -> chips output)', () => {
  it('builds deterministic attraction, warning, lifestyle chips', () => {
    const input = extraction(
      {
        rawInterests: ['hiking', 'books'],
        signals: { emotionalDepth: 8, lifestylePace: 7 },
      },
      {
        rawInterests: ['travel'],
        softNo: ['smoking'],
      },
      {
        dealbreakers: ['dishonesty'],
      },
    );

    const out = buildChips(input);

    expect(out).toEqual({
      attractionChips: [
        'hiking',
        'books',
        'travel',
        'emotional depth',
        'lifestyle pace',
      ],
      warningChips: ['smoking', 'dishonesty'],
      lifestyleChips: [],
    });
  });

  it('adds extreme low-signal warnings only when explicitly evidenced', () => {
    const input = extraction({
      signals: { directness: 2, socialBattery: 2 },
      evidence: [{ signal: 'directness', quote: 'no games', reason: 'explicit' }],
    });

    const out = buildChips(input);

    expect(out.warningChips).toEqual(['directness']);
  });

  it('enforces normalization, global dedupe, and max 6 per array', () => {
    const input = extraction(
      {
        rawInterests: ['travel', 'gym', 'yoga', 'beach', 'running', 'cooking', 'extra item'],
        dealbreakers: ['smoking!!!', 'liar', 'late replies', 'ghosting', 'cheating', 'rude'],
        softNo: ['smoking'],
        signals: {
          emotionalDepth: 9,
          attachmentSecurity: 9,
          directness: 9,
          lifestylePace: 9,
          intellectualCuriosity: 9,
        },
      },
      {
        rawInterests: ['travel'],
      },
      {
        rawInterests: ['spirituality'],
      },
    );

    const out = buildChips(input);

    expect(out.attractionChips.length).toBeLessThanOrEqual(6);
    expect(out.warningChips.length).toBeLessThanOrEqual(6);
    expect(out.lifestyleChips.length).toBeLessThanOrEqual(6);
    expect(out.warningChips).toContain('smoking');
    expect(out.warningChips.filter((x) => x === 'smoking').length).toBe(1);
    expect(out.attractionChips).not.toContain('smoking');
    expect(out.attractionChips).toEqual([
      'travel',
      'gym',
      'yoga',
      'beach',
      'running',
      'cooking',
    ]);
  });
});
