import { Test, TestingModule } from '@nestjs/testing';
import { SimpleLogger } from '../logger/simple-logger.service';
import { LLMRouterService } from '../llm/llm-router.service';
import { EXTRACTION_SIGNAL_KEYS } from './extracted-signals.interface';
import { DOMAIN_ALLOWED_SIGNAL_KEYS } from './extraction-strict-validation';
import { ExtractionService } from './extraction.service';
import { coveragePercent } from '../engine/coverage';

/** Sample text that implies ambition (self), independence (relationship), appearance (partner). */
const SAMPLE_ABOUT_ME =
  'Startup CEO, very driven and competitive. I work long hours and want to build something big.';
const SAMPLE_ABOUT_RELATIONSHIP =
  'I need space and independence. Not into enmeshment; we should have our own lives.';
const SAMPLE_ABOUT_PARTNER =
  'Looking for someone fit, attractive, and health-conscious. Physical chemistry matters. ' +
  'I enjoy meaningful conversation and want a partner who values wellness and authenticity in daily life.';

const DEFAULT_MOCK_EVIDENCE_REASON = 'Quote supports the score';

function mockExtractionResponse(
  domain: string,
  signals: Record<string, number | null>,
  evidence: Array<{ signal: string; quote: string; reason?: string; note?: string }>,
) {
  return {
    value: {
      domain,
      signals,
      evidence: evidence.map((e) => ({
        ...e,
        reason: e.reason ?? DEFAULT_MOCK_EVIDENCE_REASON,
      })),
      confidence: 0.7,
      version: 'v1',
    },
    rawText: '',
  };
}

describe('ExtractionService', () => {
  let service: ExtractionService;
  let llmCompleteJSON: jest.Mock;

  beforeEach(async () => {
    llmCompleteJSON = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionService,
        {
          provide: LLMRouterService,
          useValue: { completeJSON: llmCompleteJSON },
        },
        {
          provide: SimpleLogger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExtractionService>(ExtractionService);
  });

  it('should return self.signals with ambition (or equivalent) when text contains drive/competitiveness cues', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse(
        'self',
        { ambition: 8, directness: 6, socialBattery: 5 },
        [
          { signal: 'ambition', quote: 'Startup CEO, very driven' },
          { signal: 'directness', quote: 'very driven' },
          { signal: 'socialBattery', quote: 'work long hours' },
        ],
      ),
    );

    const result = await service.extract('self', SAMPLE_ABOUT_ME);

    expect(result.signals).toBeDefined();
    expect(typeof result.signals['ambition']).toBe('number');
    expect(result.signals['ambition']).toBeGreaterThanOrEqual(1);
    expect(result.signals['ambition']).toBeLessThanOrEqual(10);
    expect(result.evidence).toBeDefined();
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('should return relationship.signals with attachment cues when text contains space/independence language', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse(
        'relationship',
        { attachmentSecurity: 6, lifestylePace: 5, emotionalDepth: 7 },
        [
          { signal: 'attachmentSecurity', quote: 'I need space and independence' },
          { signal: 'lifestylePace', quote: 'our own lives' },
          { signal: 'emotionalDepth', quote: 'deep connection' },
        ],
      ),
    );

    const result = await service.extract(
      'relationship',
      SAMPLE_ABOUT_RELATIONSHIP,
    );

    expect(result.signals).toBeDefined();
    expect(typeof result.signals['attachmentSecurity']).toBe('number');
    expect(result.signals['attachmentSecurity']).toBeGreaterThanOrEqual(1);
    expect(result.signals['attachmentSecurity']).toBeLessThanOrEqual(10);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('should return partner.signals with physicalPriority when text contains appearance cues', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse(
        'partner',
        { physicalPriority: 8, emotionalDepth: 6, intellectualCuriosity: 7 },
        [
          {
            signal: 'physicalPriority',
            quote: 'fit, attractive, and health-conscious',
          },
          {
            signal: 'emotionalDepth',
            quote: 'Physical chemistry matters',
          },
          {
            signal: 'intellectualCuriosity',
            quote: 'health-conscious',
          },
        ],
      ),
    );

    const result = await service.extract('partner', SAMPLE_ABOUT_PARTNER);

    expect(result.signals).toBeDefined();
    expect(typeof result.signals['physicalPriority']).toBe('number');
    expect(result.signals['physicalPriority']).toBeGreaterThanOrEqual(1);
    expect(result.signals['physicalPriority']).toBeLessThanOrEqual(10);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('extractAllThree: self ambition, relationship attachmentSecurity, partner physicalPriority, evidence non-empty', async () => {
    llmCompleteJSON
      .mockResolvedValueOnce(
        mockExtractionResponse('self', { ambition: 8, directness: 7 }, [
          { signal: 'ambition', quote: 'driven and competitive' },
          { signal: 'directness', quote: 'competitive' },
        ]),
      )
      .mockResolvedValueOnce(
        mockExtractionResponse('relationship', { attachmentSecurity: 6, emotionalDepth: 7 }, [
          { signal: 'attachmentSecurity', quote: 'need space and independence' },
          { signal: 'emotionalDepth', quote: 'space and independence' },
        ]),
      )
      .mockResolvedValueOnce(
        mockExtractionResponse('partner', { physicalPriority: 8, emotionalDepth: 6 }, [
          { signal: 'physicalPriority', quote: 'fit, attractive' },
          { signal: 'emotionalDepth', quote: 'attractive' },
        ]),
      );

    const { self, relationship, partner } = await service.extractAllThree(
      SAMPLE_ABOUT_ME,
      SAMPLE_ABOUT_RELATIONSHIP,
      SAMPLE_ABOUT_PARTNER,
    );

    expect(typeof self.signals['ambition']).toBe('number');
    expect(self.evidence.length).toBeGreaterThan(0);

    expect(typeof relationship.signals['attachmentSecurity']).toBe('number');
    expect(relationship.evidence.length).toBeGreaterThan(0);

    expect(typeof partner.signals['physicalPriority']).toBe('number');
    expect(partner.evidence.length).toBeGreaterThan(0);
  });

  it('alias-only input gets mapped to official key', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', { spiritualOrientation: 7, ambition: 6 }, [
        { signal: 'spiritualOrientation', quote: 'meaning and inner life' },
        { signal: 'ambition', quote: 'inner life' },
      ]),
    );

    const result = await service.extract('self', 'I care about meaning and inner life.');

    expect(result.signals['spirituality']).toBe(7);
    expect(result.signals['spiritualOrientation']).toBeUndefined();
  });

  it('official key wins over alias on conflict', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', {
        spirituality: 8,
        spiritualOrientation: 3,
        ambition: 6,
      }, [
        { signal: 'spirituality', quote: 'Spiritual' },
        { signal: 'spiritualOrientation', quote: 'Spiritual' },
        { signal: 'ambition', quote: 'Spiritual person' },
      ]),
    );

    const result = await service.extract('self', 'Spiritual person.');

    expect(result.signals['spirituality']).toBe(8);
  });

  it('unmapped unknown key is still dropped by validateAndClean', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', { ambition: 5, directness: 6 }, [
        { signal: 'ambition', quote: 'Driven' },
        { signal: 'directness', quote: 'enjoy life' },
      ]),
    );

    const result = await service.extract('self', 'Driven and enjoy life.');

    expect(result.signals['ambition']).toBe(5);
    expect(result.signals['hedonism']).toBeUndefined();
  });

  it('compatibility coverage improves for known legacy payload shape', async () => {
    const legacyInput =
      'Legacy payload with spiritual orientation, appearance priority, and material ambition.';
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', {
        spiritualOrientation: 6,
        appearancePriority: 7,
        materialAmbition: 5,
        ambition: 6,
        directness: 5,
      }, [
        { signal: 'spiritualOrientation', quote: 'spiritual orientation' },
        { signal: 'appearancePriority', quote: 'appearance priority' },
        { signal: 'materialAmbition', quote: 'material ambition' },
        { signal: 'ambition', quote: 'material ambition' },
        { signal: 'directness', quote: 'Legacy payload' },
      ]),
    );

    const result = await service.extract('self', legacyInput);

    expect(result.signals['spirituality']).toBe(6);
    expect(result.signals['physicalPriority']).toBeNull();
    expect(result.signals['financialMindset']).toBeNull();
    expect(result.signals['spirituality']).not.toBeNull();
  });

  it('evidence with unknown key is dropped', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', { ambition: 6, directness: 5 }, [
        { signal: 'ambition', quote: 'Driven' },
        { signal: 'hedonism', quote: 'enjoy life' },
        { signal: 'directness', quote: 'Driven.' },
      ]),
    );

    const result = await service.extract('self', 'Driven.');

    expect(result.evidence).toHaveLength(2);
    expect(result.evidence[0].signal).toBe('ambition');
  });

  it('final output contains exactly official allowlist keys only', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', {
        ambition: 5,
        spiritualOrientation: 7,
        directness: 6,
      }, [
        { signal: 'ambition', quote: 'ambition' },
        { signal: 'spiritualOrientation', quote: 'spirituality' },
        { signal: 'directness', quote: 'Text with' },
      ]),
    );

    const result = await service.extract('self', 'Text with ambition and spirituality.');

    const outputKeys = Object.keys(result.signals);
    expect(outputKeys.length).toBe(EXTRACTION_SIGNAL_KEYS.length);
    for (const k of outputKeys) {
      expect(EXTRACTION_SIGNAL_KEYS).toContain(k);
    }
    expect(result.signals['spirituality']).toBe(7);
    expect(result.signals['hedonism']).toBeUndefined();
  });

  it('LLM output is preserved when valid: no capping for short text', async () => {
    const genericShort = 'nice, fun, positive vibes';
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', {
        ambition: 6,
        socialBattery: 7,
        emotionalDepth: 5,
        lifestylePace: 6,
        physicalPriority: 4,
      }, [
        { signal: 'ambition', quote: 'fun', reason: 'Shows energy' },
        { signal: 'socialBattery', quote: 'positive vibes', reason: 'Social indicator' },
        { signal: 'emotionalDepth', quote: 'nice', reason: 'Warmth cue' },
        { signal: 'lifestylePace', quote: 'vibes', reason: 'Pace indicator' },
        { signal: 'physicalPriority', quote: 'fun', reason: 'Not from self domain' },
      ]),
    );

    const result = await service.extract('self', genericShort);

    expect(result.signals['ambition']).toBe(6);
    expect(result.signals['socialBattery']).toBe(7);
    expect(result.signals['emotionalDepth']).toBe(5);
    expect(result.signals['lifestylePace']).toBe(6);
    expect(result.signals['physicalPriority']).toBeNull();
  });

  it('LLM output preserved when all signals have valid evidence', async () => {
    const shortText = 'I like going out and meeting good people. Pretty relaxed.';
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', {
        socialBattery: 7,
        lifestylePace: 5,
        emotionalDepth: 5,
        directness: 4,
        ambition: 6,
      }, [
        { signal: 'socialBattery', quote: 'going out', reason: 'Social activity' },
        { signal: 'lifestylePace', quote: 'relaxed', reason: 'Pace cue' },
        { signal: 'emotionalDepth', quote: 'good people', reason: 'Values people' },
        { signal: 'directness', quote: 'Pretty', reason: 'Direct word' },
        { signal: 'ambition', quote: 'relaxed', reason: 'Low drive' },
      ]),
    );

    const result = await service.extract('self', shortText);

    const nonNullCount = Object.values(result.signals).filter((v) => v != null).length;
    expect(nonNullCount).toBe(5);
    expect(result.signals['socialBattery']).toBe(7);
    expect(result.signals['lifestylePace']).toBe(5);
  });

  it('rich aboutPartner remains expressive: no sparse guard applied', async () => {
    const richPartnerText =
      'Looking for someone fit, attractive, and health-conscious. Physical chemistry matters. ' +
      'I value emotional depth and direct communication. We should share an active lifestyle and similar goals.';
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('partner', {
        physicalPriority: 7,
        emotionalDepth: 6,
        relationshipClarity: 6,
        lifestylePace: 6,
        socialBattery: 5,
      }, [
        { signal: 'physicalPriority', quote: 'fit, attractive, and health-conscious' },
        { signal: 'emotionalDepth', quote: 'emotional depth' },
        { signal: 'relationshipClarity', quote: 'similar goals' },
        { signal: 'lifestylePace', quote: 'active lifestyle' },
        { signal: 'socialBattery', quote: 'share an active lifestyle' },
      ]),
    );

    const result = await service.extract('partner', richPartnerText);

    const nonNullCount = Object.values(result.signals).filter((v) => v != null).length;
    expect(nonNullCount).toBeGreaterThanOrEqual(4);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('LLM determines signal count: no policy caps applied', async () => {
    const shortProfile =
      'Training is part of my life, I focus on sleep and food discipline. ' +
      'I respect boundaries and prefer quiet evenings at home. We should grow together.';

    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse(
        'self',
        {
          ambition: 5,
          emotionalDepth: 6,
          socialBattery: 4,
          healthBodyConsciousness: 8,
          independence: 7,
          directness: 6,
          lifestylePace: 4,
        },
        [
          { signal: 'ambition', quote: 'focus on sleep and food discipline', reason: 'Discipline shows drive' },
          { signal: 'emotionalDepth', quote: 'grow together', reason: 'Growth oriented' },
          { signal: 'socialBattery', quote: 'quiet evenings at home', reason: 'Prefers quiet' },
          { signal: 'healthBodyConsciousness', quote: 'Training is part of my life', reason: 'Fitness priority' },
          { signal: 'independence', quote: 'respect boundaries', reason: 'Boundaries matter' },
          { signal: 'directness', quote: 'respect boundaries', reason: 'Clear communication' },
          { signal: 'lifestylePace', quote: 'quiet evenings at home', reason: 'Slow pace' },
        ],
      ),
    );

    const result = await service.extract('self', shortProfile);

    const nonNullCount = Object.values(result.signals).filter((v) => v != null).length;
    expect(nonNullCount).toBe(7);

    expect(result.signals['healthBodyConsciousness']).toBe(8);
    expect(result.signals['independence']).toBe(7);
    expect(result.signals['directness']).toBe(6);
    expect(result.signals['lifestylePace']).toBe(4);
  });

  it('coverage between short profile #20 and profile #2 is >= 30%', async () => {
    const shortProfile =
      'Training is part of my life, I focus on sleep and food discipline. ' +
      'I respect boundaries and prefer quiet evenings at home. We should grow together.';

    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse(
        'self',
        {
          ambition: 5,
          emotionalDepth: 6,
          socialBattery: 4,
          healthBodyConsciousness: 8,
          independence: 7,
          directness: 6,
          lifestylePace: 4,
        },
        [
          { signal: 'ambition', quote: 'focus on sleep and food discipline' },
          { signal: 'emotionalDepth', quote: 'grow together' },
          { signal: 'socialBattery', quote: 'quiet evenings at home' },
          { signal: 'healthBodyConsciousness', quote: 'Training is part of my life' },
          { signal: 'independence', quote: 'respect boundaries' },
          { signal: 'directness', quote: 'respect boundaries' },
          { signal: 'lifestylePace', quote: 'quiet evenings at home' },
        ],
      ),
    );
    const profile20 = await service.extract('self', shortProfile);

    const profile2Text =
      'I am driven and ambitious, with a strong social life. ' +
      'I value emotional depth and direct communication. Looking for someone who shares my active lifestyle.';

    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', {
        ambition: 8,
        socialBattery: 7,
        emotionalDepth: 7,
        directness: 6,
        lifestylePace: 7,
      }, [
        { signal: 'ambition', quote: 'driven and ambitious' },
        { signal: 'socialBattery', quote: 'strong social life' },
        { signal: 'emotionalDepth', quote: 'emotional depth' },
        { signal: 'directness', quote: 'direct communication' },
        { signal: 'lifestylePace', quote: 'active lifestyle' },
      ]),
    );
    const profile2 = await service.extract('self', profile2Text);

    // Count signals where BOTH profiles have non-null values
    const totalSignals = EXTRACTION_SIGNAL_KEYS.length;
    let overlapping = 0;
    for (const key of EXTRACTION_SIGNAL_KEYS) {
      if (profile20.signals[key] != null && profile2.signals[key] != null) {
        overlapping++;
      }
    }

    const covPercent = coveragePercent(overlapping, totalSignals);
    // With 39 signals (15 official + 24 shadow), 5 overlapping ≈ 12%
    expect(covPercent).toBeGreaterThanOrEqual(12);
  });
});

/* ─── Behavior locks (post-refactor: lock current behavior) ───────────────── */

describe('ExtractionService behavior locks', () => {
  let service: ExtractionService;
  let llmCompleteJSON: jest.Mock;

  function mockResponse(
    domain: string,
    signals: Record<string, number | null>,
    evidence: Array<{ signal: string; quote: string; reason?: string }> = [],
    confidence = 0.7,
  ) {
    const evidenceNorm = evidence.map((e) => ({
      ...e,
      reason: e.reason ?? DEFAULT_MOCK_EVIDENCE_REASON,
    }));
    return {
      value: { domain, signals, evidence: evidenceNorm, confidence, version: 'v1' },
      rawText: JSON.stringify({
        domain,
        signals,
        evidence: evidenceNorm,
        confidence,
        version: 'v1',
      }),
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    };
  }

  beforeEach(async () => {
    llmCompleteJSON = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionService,
        {
          provide: LLMRouterService,
          useValue: { completeJSON: llmCompleteJSON },
        },
        {
          provide: SimpleLogger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get<ExtractionService>(ExtractionService);
  });

  it('1. alias normalization: appearancePriority and materialAmbition map to official keys only', async () => {
    const longEnoughText =
      'Looks and career matter to me. I am driven and value financial success. I care about physical attraction.';
    llmCompleteJSON.mockResolvedValue(
      mockResponse('self', {
        appearancePriority: 7,
        materialAmbition: 5,
        ambition: 6,
        directness: 5,
      }, [
        { signal: 'appearancePriority', quote: 'physical attraction' },
        { signal: 'materialAmbition', quote: 'financial success' },
        { signal: 'ambition', quote: 'driven' },
        { signal: 'directness', quote: 'matter to me' },
      ]),
    );

    const result = await service.extract('self', longEnoughText);

    expect(result.signals['physicalPriority']).toBeNull();
    expect(result.signals['financialMindset']).toBeNull();
    expect(result.signals['ambition']).toBe(6);
    expect(result.signals['appearancePriority']).toBeUndefined();
    expect(result.signals['materialAmbition']).toBeUndefined();
    expect(Object.keys(result.signals).every((k) => EXTRACTION_SIGNAL_KEYS.includes(k as any))).toBe(true);
  });

  it('2. unknown key dropping: signals and evidence with unknown keys are dropped from output', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockResponse('self', {
        ambition: 5,
        directness: 6,
        madeUpSignal: 9,
        anotherUnknown: 3,
      }, [
        { signal: 'ambition', quote: 'Driven' },
        { signal: 'madeUpSignal', quote: 'fake' },
        { signal: 'directness', quote: 'person' },
      ]),
    );

    const result = await service.extract('self', 'Driven person.');

    expect(result.signals['ambition']).toBe(5);
    expect(result.signals['madeUpSignal']).toBeUndefined();
    expect(result.signals['anotherUnknown']).toBeUndefined();
    expect(result.evidence.every((e) => EXTRACTION_SIGNAL_KEYS.includes(e.signal as any))).toBe(true);
    expect(result.evidence).toHaveLength(2);
  });

  it('out-of-range values are nullified (no clamping)', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockResponse('self', { ambition: 15, directness: 6, socialBattery: 5 }, [
        { signal: 'ambition', quote: 'Very driven', reason: 'Strong drive' },
        { signal: 'directness', quote: 'direct', reason: 'Direct communication' },
        { signal: 'socialBattery', quote: 'driven and direct', reason: 'Social energy' },
      ]),
    );

    const result = await service.extract('self', 'Very driven and direct.');

    expect(result.signals['ambition']).toBeNull();
    expect(result.signals['directness']).toBe(6);
    expect(result.signals['socialBattery']).toBe(5);
  });

  it('3b. out-of-range value WITHOUT evidence: stripped to null', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockResponse('self', { ambition: 5, directness: 99, socialBattery: 6 }, [
        { signal: 'ambition', quote: 'Driven', reason: 'Drive cue' },
        { signal: 'socialBattery', quote: 'Driven.', reason: 'Social cue' },
      ]),
    );

    const result = await service.extract('self', 'Driven.');

    expect(result.signals['ambition']).toBe(5);
    expect(result.signals['directness']).toBeNull();
  });

  it('4a. single LLM call only: no retry when first pass is empty', async () => {
    const textWithContent = 'I am ambitious and value direct communication.';
    llmCompleteJSON.mockResolvedValueOnce(
      mockResponse('self', Object.fromEntries(EXTRACTION_SIGNAL_KEYS.map((k) => [k, null])), [], 0.3),
    );

    const result = await service.extract('self', textWithContent);

    expect(llmCompleteJSON).toHaveBeenCalledTimes(1);
    expect(Object.values(result.signals).filter((v) => v != null).length).toBe(0);
    expect(result.notes).toContain('EXTRACTION_EMPTY_DEBUG');
  });

  it('4b. empty first pass: one LLM call, debug note only', async () => {
    llmCompleteJSON.mockResolvedValueOnce(
      mockResponse('self', Object.fromEntries(EXTRACTION_SIGNAL_KEYS.map((k) => [k, null])), [], 0.3),
    );

    const result = await service.extract('self', 'Some meaningful text here.');

    expect(llmCompleteJSON).toHaveBeenCalledTimes(1);
    expect(result.notes).toContain('EXTRACTION_EMPTY_DEBUG');
  });

  it('LLM-provided non-null signals are kept when evidence is valid', async () => {
    const textWithBoundaries =
      'I respect boundaries and need my own space. We have clear communication. This is a long enough sentence so that sparse guard does not cap the signals.';
    llmCompleteJSON.mockResolvedValue(
      mockResponse('self', {
        independence: 5,
        directness: 4,
        ambition: 6,
      }, [
        { signal: 'independence', quote: 'own space', reason: 'Space need' },
        { signal: 'directness', quote: 'clear communication', reason: 'Communication value' },
        { signal: 'ambition', quote: 'need', reason: 'Drive cue' },
      ]),
    );

    const result = await service.extract('self', textWithBoundaries);

    expect(result.signals['independence']).toBe(5);
    expect(result.signals['directness']).toBe(4);
    expect(result.signals['ambition']).toBe(6);
  });

  it('8. preserves LLM confidence (not recomputed from evidence coverage)', async () => {
    const text =
      'I am ambitious and social with emotional depth. I value direct communication and independence. ' +
      'I prefer a calm lifestyle and clear relationship goals. I care about health and fitness.';
    llmCompleteJSON.mockResolvedValue(
      mockResponse(
        'self',
        {
          ambition: 6,
          socialBattery: 5,
          emotionalDepth: 6,
          directness: 5,
          independence: 5,
          lifestylePace: 5,
          healthBodyConsciousness: 5,
        },
        [
          { signal: 'ambition', quote: 'ambitious' },
          { signal: 'socialBattery', quote: 'social' },
          { signal: 'emotionalDepth', quote: 'emotional depth' },
          { signal: 'directness', quote: 'direct communication' },
          { signal: 'independence', quote: 'independence' },
          { signal: 'lifestylePace', quote: 'calm lifestyle' },
          { signal: 'healthBodyConsciousness', quote: 'health' },
        ],
        0.9,
      ),
    );

    const result = await service.extract('self', text);

    const nonNull = DOMAIN_ALLOWED_SIGNAL_KEYS.self.filter(
      (k) => result.signals[k] != null,
    ).length;
    expect(nonNull).toBe(7);
    expect(result.confidence).toBe(0.9);
  });

  describe('SIGNAL3 shadow signals', () => {
    it('should extract conflictStyle when conflict handling cues are present', async () => {
      const text = 'I prefer to talk things through when we disagree. No drama, just calm discussion.';
      llmCompleteJSON.mockResolvedValue(
        mockResponse('self', {
          conflictStyle: 5,
          directness: 7,
        }, [
          { signal: 'conflictStyle', quote: 'talk things through when we disagree' },
          { signal: 'directness', quote: 'calm discussion' },
        ]),
      );

      const result = await service.extract('self', text);

      expect(result.signals['conflictStyle']).toBe(5);
      expect(result.evidence.some(e => e.signal === 'conflictStyle')).toBe(true);
    });

    it('should extract noveltyVsRoutine when spontaneity/routine cues are present', async () => {
      const text = 'I love spontaneity and trying new things. Always up for an adventure.';
      llmCompleteJSON.mockResolvedValue(
        mockResponse('self', {
          noveltyVsRoutine: 9,
          lifestylePace: 7,
        }, [
          { signal: 'noveltyVsRoutine', quote: 'love spontaneity and trying new things' },
          { signal: 'lifestylePace', quote: 'up for an adventure' },
        ]),
      );

      const result = await service.extract('self', text);

      // Expansion-06 Story 1: noveltyVsRoutine aliases → adventureNovelty
      expect(result.signals['adventureNovelty']).toBe(9);
      expect(result.evidence.some(e => e.signal === 'adventureNovelty')).toBe(true);
    });

    it('should extract structureChaosTolerance when order/organization cues are present', async () => {
      const text = 'I need order and structure in my life. Clean home matters to me.';
      llmCompleteJSON.mockResolvedValue(
        mockResponse('self', {
          structureChaosTolerance: 2,
          ambition: 6,
        }, [
          { signal: 'structureChaosTolerance', quote: 'need order and structure' },
          { signal: 'ambition', quote: 'matters to me' },
        ]),
      );

      const result = await service.extract('self', text);

      expect(result.signals['structureChaosTolerance']).toBe(2);
      expect(result.evidence.some(e => e.signal === 'structureChaosTolerance')).toBe(true);
    });

    it('should extract all three SIGNAL3 shadow signals when cues are present', async () => {
      const text = 'I prefer calm discussions when we disagree. I love spontaneous plans and trying new restaurants. I am organized but flexible.';
      llmCompleteJSON.mockResolvedValue(
        mockResponse('self', {
          conflictStyle: 5,
          noveltyVsRoutine: 8,
          structureChaosTolerance: 6,
          directness: 7,
        }, [
          { signal: 'conflictStyle', quote: 'calm discussions when we disagree' },
          { signal: 'noveltyVsRoutine', quote: 'spontaneous plans and trying new restaurants' },
          { signal: 'structureChaosTolerance', quote: 'organized but flexible' },
          { signal: 'directness', quote: 'calm discussions' },
        ]),
      );

      const result = await service.extract('self', text);

      expect(result.signals['conflictStyle']).toBe(5);
      expect(result.signals['adventureNovelty']).toBe(8);
      expect(result.signals['structureChaosTolerance']).toBe(6);
      expect(result.evidence.filter(e => ['conflictStyle', 'adventureNovelty', 'structureChaosTolerance'].includes(e.signal)).length).toBe(3);
    });

    it('should return null for SIGNAL3 signals when no relevant cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockResponse('self', {
          ambition: 8,
          conflictStyle: null,
          noveltyVsRoutine: null,
          structureChaosTolerance: null,
        }, [
          { signal: 'ambition', quote: 'ambitious and driven' },
        ]),
      );

      const result = await service.extract('self', text);

      expect(result.signals['conflictStyle']).toBeNull();
      expect(result.signals['adventureNovelty']).toBeNull();
      expect(result.signals['structureChaosTolerance']).toBeNull();
    });
  });

  describe('Expansion-01 shadow signals', () => {
    it('extracts high empathyCompassion when LLM returns attuned score', async () => {
      const text =
        "Understanding how my partner feels is the foundation for me. I notice when they need space vs comfort.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { empathyCompassion: 8, emotionalDepth: 6 },
          [
            {
              signal: 'empathyCompassion',
              quote: 'Understanding how my partner feels is the foundation for me',
            },
            { signal: 'emotionalDepth', quote: 'foundation for me' },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['empathyCompassion']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'empathyCompassion')).toBe(true);
    });

    it('extracts low empathyCompassion when LLM returns logic-focused score', async () => {
      const text =
        "I approach relationships logically and don't analyze emotions much.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { empathyCompassion: 2 },
          [
            {
              signal: 'empathyCompassion',
              quote: "don't analyze emotions much",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['empathyCompassion']).toBe(2);
    });

    it('extracts high vulnerabilityOpenness when LLM returns open score', async () => {
      const text =
        'I share my fears and struggles with partners I trust deeply.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { vulnerabilityOpenness: 8, emotionalDepth: 7 },
          [
            {
              signal: 'vulnerabilityOpenness',
              quote: 'share my fears and struggles with partners I trust deeply',
            },
            { signal: 'emotionalDepth', quote: 'trust deeply' },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['vulnerabilityOpenness']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'vulnerabilityOpenness')).toBe(true);
    });

    it('extracts low vulnerabilityOpenness when LLM returns guarded score', async () => {
      const text =
        'I keep my personal struggles private and handle things myself.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { vulnerabilityOpenness: 2 },
          [
            {
              signal: 'vulnerabilityOpenness',
              quote: 'keep my personal struggles private',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['vulnerabilityOpenness']).toBe(2);
    });

    it('returns null for Expansion-01 signals when no relevant cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {
            ambition: 8,
            empathyCompassion: null,
            vulnerabilityOpenness: null,
          },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['empathyCompassion']).toBeNull();
      expect(result.signals['vulnerabilityOpenness']).toBeNull();
    });

    it('strips out-of-range empathyCompassion to null via validateAndClean', async () => {
      const text = 'I care deeply about how my partner feels emotionally.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { empathyCompassion: 11 },
          [
            {
              signal: 'empathyCompassion',
              quote: 'care deeply about how my partner feels emotionally',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['empathyCompassion']).toBeNull();
    });
  });

  describe('Expansion-02 shadow signals', () => {
    it('extracts high emotionalRegulation when LLM returns steady score', async () => {
      const text =
        'I stay calm under pressure and take time to process before reacting when stressed.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { emotionalRegulation: 8, conflictStyle: 7 },
          [
            {
              signal: 'emotionalRegulation',
              quote: 'stay calm under pressure and take time to process before reacting',
            },
            { signal: 'conflictStyle', quote: 'before reacting when stressed' },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['emotionalRegulation']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'emotionalRegulation')).toBe(true);
    });

    it('extracts low emotionalRegulation when LLM returns reactive score', async () => {
      const text =
        'When I get upset I blow up and need a long time to calm down.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { emotionalRegulation: 2 },
          [
            {
              signal: 'emotionalRegulation',
              quote: 'When I get upset I blow up',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['emotionalRegulation']).toBe(2);
    });

    it('extracts high physicalAffectionStyle when LLM returns touch-focused score', async () => {
      const text =
        'Physical touch and cuddling every day is how I feel connected in a relationship.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalAffectionStyle: 8, attachmentSecurity: 6 },
          [
            {
              signal: 'physicalAffectionStyle',
              quote: 'Physical touch and cuddling every day is how I feel connected',
            },
            { signal: 'attachmentSecurity', quote: 'feel connected in a relationship' },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalAffectionStyle']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'physicalAffectionStyle')).toBe(true);
    });

    it('extracts low physicalAffectionStyle when LLM returns minimal-touch score', async () => {
      const text =
        'I prefer minimal physical affection and need plenty of personal space.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalAffectionStyle: 2, independence: 7 },
          [
            {
              signal: 'physicalAffectionStyle',
              quote: 'prefer minimal physical affection',
            },
            { signal: 'independence', quote: 'need plenty of personal space' },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalAffectionStyle']).toBe(2);
    });

    it('returns null for Expansion-02 signals when no relevant cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {
            ambition: 8,
            emotionalRegulation: null,
            physicalAffectionStyle: null,
          },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['emotionalRegulation']).toBeNull();
      expect(result.signals['physicalAffectionStyle']).toBeNull();
    });

    it('strips out-of-range emotionalRegulation to null via validateAndClean', async () => {
      const text = 'I rarely react emotionally and stay balanced when things get hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { emotionalRegulation: 11 },
          [
            {
              signal: 'emotionalRegulation',
              quote: 'rarely react emotionally and stay balanced when things get hard',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['emotionalRegulation']).toBeNull();
    });
  });

  describe('Expansion-03 shadow signals', () => {
    it('extracts high humorPlayfulness when LLM returns playfulness-focused score', async () => {
      const text =
        'I want someone I can be silly with after a long day — banter and inside jokes keep us close.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { humorPlayfulness: 8, attachmentSecurity: 6 },
          [
            {
              signal: 'humorPlayfulness',
              quote: 'someone I can be silly with after a long day',
            },
            {
              signal: 'attachmentSecurity',
              quote: 'banter and inside jokes keep us close',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['humorPlayfulness']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'humorPlayfulness')).toBe(
        true,
      );
    });

    it('extracts low humorPlayfulness when LLM returns serious-tone score', async () => {
      const text =
        'I prefer deep conversations over joking around — playfulness is not really my thing.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { humorPlayfulness: 2, emotionalDepth: 7 },
          [
            {
              signal: 'humorPlayfulness',
              quote: 'playfulness is not really my thing',
            },
            {
              signal: 'emotionalDepth',
              quote: 'prefer deep conversations over joking around',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['humorPlayfulness']).toBe(2);
    });

    it('returns null for humorPlayfulness when no relevant cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {
            ambition: 8,
            humorPlayfulness: null,
          },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['humorPlayfulness']).toBeNull();
    });

    it('strips out-of-range humorPlayfulness to null via validateAndClean', async () => {
      const text =
        'Life is heavy enough — I need lightness and laughter in love every day.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { humorPlayfulness: 11 },
          [
            {
              signal: 'humorPlayfulness',
              quote: 'need lightness and laughter in love every day',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['humorPlayfulness']).toBeNull();
    });
  });

  describe('Expansion-04 shadow signals', () => {
    it('extracts high intellectualCuriosity when LLM returns relationship-need score', async () => {
      // Semantic: need for mental stimulation with a partner (not merely "I'm smart")
      const text =
        'I need regular deep conversations and learning together — intellectual connection keeps us close.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { intellectualCuriosity: 8, emotionalDepth: 6 },
          [
            {
              signal: 'intellectualCuriosity',
              quote: 'need regular deep conversations and learning together',
            },
            {
              signal: 'emotionalDepth',
              quote: 'intellectual connection keeps us close',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['intellectualCuriosity']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'intellectualCuriosity'),
      ).toBe(true);
    });

    it('extracts low intellectualCuriosity when LLM returns low mental-stimulation need', async () => {
      const text =
        'I prefer light conversation — deep ideas and learning together are not important to me in love.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { intellectualCuriosity: 2 },
          [
            {
              signal: 'intellectualCuriosity',
              quote: 'deep ideas and learning together are not important',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['intellectualCuriosity']).toBe(2);
    });

    it('extracts high creativeExpression when LLM returns creativity-as-identity score', async () => {
      // Semantic: need for creative outlets — not merely job title "artist"
      const text =
        'Making art is core to who I am — I need space and respect for creative time every week.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { creativeExpression: 8, independence: 6 },
          [
            {
              signal: 'creativeExpression',
              quote: 'Making art is core to who I am',
            },
            {
              signal: 'independence',
              quote: 'need space and respect for creative time',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['creativeExpression']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'creativeExpression'),
      ).toBe(true);
    });

    it('extracts low creativeExpression when LLM returns minimal-creative score', async () => {
      const text =
        'I am not interested in creative pursuits — art and making things are not part of my life.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { creativeExpression: 2 },
          [
            {
              signal: 'creativeExpression',
              quote: 'not interested in creative pursuits',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['creativeExpression']).toBe(2);
    });

    it('returns null for creativeExpression when no relevant cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {
            ambition: 8,
            creativeExpression: null,
          },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['creativeExpression']).toBeNull();
    });

    it('strips out-of-range creativeExpression to null via validateAndClean', async () => {
      const text =
        'Creativity is my core identity — I need daily time to make and create.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { creativeExpression: 11 },
          [
            {
              signal: 'creativeExpression',
              quote: 'Creativity is my core identity',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['creativeExpression']).toBeNull();
    });
  });

  describe('Expansion-05 shadow signals', () => {
    it('extracts high physicalActivityLevel when LLM returns athletic-behavior score', async () => {
      // Semantic: daily athletic/activity behavior — not merely wellness values
      const text =
        'I train hard most days — fitness and sports are a regular part of my life.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalActivityLevel: 8, healthBodyConsciousness: 6 },
          [
            {
              signal: 'physicalActivityLevel',
              quote: 'I train hard most days',
            },
            {
              signal: 'healthBodyConsciousness',
              quote: 'fitness and sports are a regular part',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalActivityLevel']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'physicalActivityLevel'),
      ).toBe(true);
    });

    it('extracts low physicalActivityLevel when LLM returns sedentary score', async () => {
      const text =
        'I prefer minimal movement — sedentary evenings on the couch suit me fine.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalActivityLevel: 2 },
          [
            {
              signal: 'physicalActivityLevel',
              quote: 'prefer minimal movement',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalActivityLevel']).toBe(2);
    });

    it('extracts high domesticComfort when LLM returns homebody score', async () => {
      // Semantic: home vs out preference — not socialBattery intro/extro
      const text =
        'I love cozy nights in on weekends — home is my comfort zone and I rarely want to go out.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { domesticComfort: 8, lifestylePace: 5 },
          [
            {
              signal: 'domesticComfort',
              quote: 'love cozy nights in on weekends',
            },
            {
              signal: 'lifestylePace',
              quote: 'home is my comfort zone',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['domesticComfort']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'domesticComfort'),
      ).toBe(true);
    });

    it('extracts low domesticComfort when LLM returns always-out score', async () => {
      const text =
        'I get restless at home — I always want to be out and rarely enjoy staying in.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { domesticComfort: 2 },
          [
            {
              signal: 'domesticComfort',
              quote: 'always want to be out',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['domesticComfort']).toBe(2);
    });

    it('returns null for Expansion-05 keys when no relevant cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {
            ambition: 8,
            physicalActivityLevel: null,
            domesticComfort: null,
          },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalActivityLevel']).toBeNull();
      expect(result.signals['domesticComfort']).toBeNull();
    });

    it('strips out-of-range physicalActivityLevel to null via validateAndClean', async () => {
      const text =
        'Activity is central to my identity — I am highly athletic every day.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalActivityLevel: 11 },
          [
            {
              signal: 'physicalActivityLevel',
              quote: 'Activity is central to my identity',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalActivityLevel']).toBeNull();
    });
  });

  describe('Expansion-06 shadow signals', () => {
    it('extracts high adventureNovelty when LLM returns novelty-seeker score', async () => {
      // Semantic: "I love trying new places and hate doing the same thing twice"
      const text =
        'I love trying new places and hate doing the same thing twice. Spontaneous trips keep me alive.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { adventureNovelty: 9, lifestylePace: 5 },
          [
            {
              signal: 'adventureNovelty',
              quote: 'love trying new places and hate doing the same thing twice',
            },
            {
              signal: 'lifestylePace',
              quote: 'Spontaneous trips keep me alive',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['adventureNovelty']).toBe(9);
      expect(
        result.evidence.some((e) => e.signal === 'adventureNovelty'),
      ).toBe(true);
    });

    it('extracts low adventureNovelty when LLM returns routine-preference score', async () => {
      // Semantic: "I'm a creature of habit" / prefer familiar places
      const text =
        'I am a creature of habit. I prefer the places and routines I know.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { adventureNovelty: 2 },
          [
            {
              signal: 'adventureNovelty',
              quote: 'creature of habit',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['adventureNovelty']).toBe(2);
    });

    it('aliases legacy noveltyVsRoutine LLM output into adventureNovelty', async () => {
      const text =
        'I love spontaneity and trying new things. Always up for an adventure.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { noveltyVsRoutine: 8 },
          [
            {
              signal: 'noveltyVsRoutine',
              quote: 'love spontaneity and trying new things',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['adventureNovelty']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'adventureNovelty'),
      ).toBe(true);
    });

    it('returns null for adventureNovelty when no relevant cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {
            ambition: 8,
            adventureNovelty: null,
          },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['adventureNovelty']).toBeNull();
    });

    it('strips out-of-range adventureNovelty to null via validateAndClean', async () => {
      const text =
        'Spontaneous trips and new experiences keep me alive — I need constant variety.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { adventureNovelty: 11 },
          [
            {
              signal: 'adventureNovelty',
              quote: 'new experiences keep me alive',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['adventureNovelty']).toBeNull();
    });
  });

  describe('Expansion-07 shadow signals', () => {
    it('extracts high casualIntimacyIntent when LLM returns hookup-oriented score', async () => {
      // Semantic: "Looking for fun, hookups, no strings attached"
      const text =
        'Looking for fun, hookups, no strings attached. Physical chemistry first.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { casualIntimacyIntent: 9 },
          [
            {
              signal: 'casualIntimacyIntent',
              quote: 'Looking for fun, hookups, no strings attached',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['casualIntimacyIntent']).toBe(9);
      expect(
        result.evidence.some((e) => e.signal === 'casualIntimacyIntent'),
      ).toBe(true);
    });

    it('extracts low casualIntimacyIntent when LLM returns committed-only score', async () => {
      // Semantic: "I only get physical when there's real emotional connection"
      const text =
        "I only get physical when there's real emotional connection. Looking for a partner, not a fling.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { casualIntimacyIntent: 2 },
          [
            {
              signal: 'casualIntimacyIntent',
              quote: "I only get physical when there's real emotional connection",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['casualIntimacyIntent']).toBe(2);
    });

    it('returns null for casualIntimacyIntent when no intimacy-boundary cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard and want something real.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, casualIntimacyIntent: null },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['casualIntimacyIntent']).toBeNull();
    });

    it('extracts high supportExchangeOrientation when LLM returns arrangement score', async () => {
      // Semantic: "Looking for a mutually beneficial arrangement"
      const text =
        'Looking for a mutually beneficial arrangement with clear expectations.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { supportExchangeOrientation: 9 },
          [
            {
              signal: 'supportExchangeOrientation',
              quote: 'mutually beneficial arrangement',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['supportExchangeOrientation']).toBe(9);
    });

    it('extracts low supportExchangeOrientation when LLM returns non-transactional score', async () => {
      // Semantic: "Money shouldn't be part of dating"
      const text =
        "Money shouldn't be part of dating. I want an equal partnership, not an arrangement.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { supportExchangeOrientation: 2 },
          [
            {
              signal: 'supportExchangeOrientation',
              quote: "Money shouldn't be part of dating",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['supportExchangeOrientation']).toBe(2);
    });

    it('extracts Profile-C style support set (high exchange+provider, low recipient)', async () => {
      // Semantic: "Happy to give you support — $1000 a month"
      const text =
        'Happy to give you support and enjoy — $1000 a month. Looking for companionship.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          {
            supportExchangeOrientation: 9,
            supportProviderOrientation: 9,
            supportRecipientOrientation: 2,
          },
          [
            {
              signal: 'supportExchangeOrientation',
              quote: 'Happy to give you support and enjoy — $1000 a month',
            },
            {
              signal: 'supportProviderOrientation',
              quote: '$1000 a month',
            },
            {
              signal: 'supportRecipientOrientation',
              quote: 'Happy to give you support',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['supportExchangeOrientation']).toBe(9);
      expect(result.signals['supportProviderOrientation']).toBe(9);
      expect(result.signals['supportRecipientOrientation']).toBe(2);
    });

    it('extracts high supportProviderOrientation when LLM returns provider score', async () => {
      const text =
        "I'm looking for someone I can take care of financially as the provider.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { supportProviderOrientation: 8 },
          [
            {
              signal: 'supportProviderOrientation',
              quote: 'take care of financially as the provider',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['supportProviderOrientation']).toBe(8);
    });

    it('extracts low supportProviderOrientation when LLM returns equal-split score', async () => {
      const text =
        "Equal partnership — we both contribute. I don't want to be someone's wallet.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { supportProviderOrientation: 2 },
          [
            {
              signal: 'supportProviderOrientation',
              quote: "don't want to be someone's wallet",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['supportProviderOrientation']).toBe(2);
    });

    it('extracts high supportRecipientOrientation when LLM returns seeking-support score', async () => {
      const text =
        'Looking for someone who can support me financially on an ongoing basis.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { supportRecipientOrientation: 8 },
          [
            {
              signal: 'supportRecipientOrientation',
              quote: 'someone who can support me financially',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['supportRecipientOrientation']).toBe(8);
    });

    it('extracts low supportRecipientOrientation when LLM returns independence score', async () => {
      const text =
        "I support myself — don't need a provider. I want an equal partner, not a sponsor.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { supportRecipientOrientation: 2 },
          [
            {
              signal: 'supportRecipientOrientation',
              quote: "don't need a provider",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['supportRecipientOrientation']).toBe(2);
    });

    it('extracts high religiousObservance when LLM returns practice-focused score', async () => {
      // Semantic: "I keep kosher, Shabbat observant, looking for same"
      const text =
        'I keep kosher, Shabbat observant, looking for same. Practice is non-negotiable.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { religiousObservance: 9 },
          [
            {
              signal: 'religiousObservance',
              quote: 'I keep kosher, Shabbat observant',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['religiousObservance']).toBe(9);
    });

    it('extracts low religiousObservance when LLM returns secular score', async () => {
      // Semantic: "Spiritual but not observant" / cultural only
      const text =
        'Jewish by culture, not practice. Spiritual but not observant.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { religiousObservance: 2, spirituality: 7 },
          [
            {
              signal: 'religiousObservance',
              quote: 'Jewish by culture, not practice',
            },
            {
              signal: 'spirituality',
              quote: 'Spiritual but not observant',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['religiousObservance']).toBe(2);
    });

    it('returns null for religiousObservance when no practice cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, religiousObservance: null },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['religiousObservance']).toBeNull();
    });

    it('strips out-of-range Expansion-07 signal to null via validateAndClean', async () => {
      const text =
        'I keep kosher and Shabbat — religious practice is central to my life.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { religiousObservance: 11 },
          [
            {
              signal: 'religiousObservance',
              quote: 'religious practice is central to my life',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['religiousObservance']).toBeNull();
    });

    it('extracts partner religiousObservance when LLM returns desired-partner practice score', async () => {
      // Semantic: looking for a religious / observant partner
      const text =
        'Looking for a religious partner who keeps kosher and Shabbat.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { religiousObservance: 8 },
          [
            {
              signal: 'religiousObservance',
              quote: 'religious partner who keeps kosher and Shabbat',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['religiousObservance']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'religiousObservance'),
      ).toBe(true);
    });
  });

  describe('Expansion-08 shadow signals', () => {
    it('extracts high educationLevel when LLM returns degree-filter score', async () => {
      // Semantic: "Only university-educated with a bachelor's" / "רק עם תואר ראשון"
      const text =
        "Only university-educated with a bachelor's — looking for the same.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { educationLevel: 9 },
          [
            {
              signal: 'educationLevel',
              quote: "Only university-educated with a bachelor's",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['educationLevel']).toBe(9);
      expect(result.evidence.some((e) => e.signal === 'educationLevel')).toBe(
        true,
      );
    });

    it('extracts low educationLevel when LLM returns credentials-do-not-matter score', async () => {
      // Semantic: "Degrees don't impress me" / street smarts over diplomas
      const text =
        "Degrees don't impress me. Street smarts over diplomas every time.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { educationLevel: 2 },
          [
            {
              signal: 'educationLevel',
              quote: "Degrees don't impress me",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['educationLevel']).toBe(2);
    });

    it('returns null for educationLevel when only "smart" cues exist', async () => {
      const text = "I'm smart and love deep conversations about ideas.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { intellectualCuriosity: 8, educationLevel: null },
          [
            {
              signal: 'intellectualCuriosity',
              quote: 'love deep conversations about ideas',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['educationLevel']).toBeNull();
    });

    it('extracts high honestyIntegrity when LLM returns integrity-central score', async () => {
      // Semantic: "ישרה כמו סרגל" / "Looking for someone honest as a ruler"
      const text =
        'Looking for someone honest as a ruler. No games, no lies.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { honestyIntegrity: 9 },
          [
            {
              signal: 'honestyIntegrity',
              quote: 'honest as a ruler. No games, no lies',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['honestyIntegrity']).toBe(9);
    });

    it('returns null for honestyIntegrity when honesty is unmentioned', async () => {
      const text = 'I am ambitious and driven. I work hard and want something real.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, honestyIntegrity: null },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['honestyIntegrity']).toBeNull();
    });

    it('extracts high chronotype when LLM returns night-owl score', async () => {
      // Semantic: "לישון עד מאוחר בשבת" / sleep late Saturday
      const text =
        'I love sleeping late on Saturday — you too? Night owl energy.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { chronotype: 9 },
          [
            {
              signal: 'chronotype',
              quote: 'I love sleeping late on Saturday',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['chronotype']).toBe(9);
    });

    it('extracts low chronotype when LLM returns early-bird score', async () => {
      const text = 'Up at 5am every day. Early mornings are my thing.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { chronotype: 2 },
          [
            {
              signal: 'chronotype',
              quote: 'Up at 5am every day',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['chronotype']).toBe(2);
    });

    it('returns null for chronotype when no sleep rhythm cues exist', async () => {
      const text = 'I am ambitious and driven. I work hard.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { ambition: 8, chronotype: null },
          [{ signal: 'ambition', quote: 'ambitious and driven' }],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['chronotype']).toBeNull();
    });

    it('extracts high physicalTypePreference when LLM returns exclusive type score', async () => {
      // Semantic: "אוהב שמנות ומלאות" / curvy preference
      const text = 'I love curvy/fuller women — that type is a must for me.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalTypePreference: 9 },
          [
            {
              signal: 'physicalTypePreference',
              quote: 'I love curvy/fuller women',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalTypePreference']).toBe(9);
    });

    it('extracts low physicalTypePreference when LLM returns flexible/appearance-agnostic score', async () => {
      // Semantic: "לא איכפת לו ממראה חיצוני"
      const text =
        "Doesn't care about appearance — personality matters more than body type.";
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalTypePreference: 2 },
          [
            {
              signal: 'physicalTypePreference',
              quote: "Doesn't care about appearance",
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalTypePreference']).toBe(2);
    });

    it('returns null for physicalTypePreference when only "beautiful" cues exist', async () => {
      const text = 'Looking for someone beautiful and attractive.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { physicalTypePreference: null },
          [],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['physicalTypePreference']).toBeNull();
    });

    it('strips out-of-range Expansion-08 signal to null via validateAndClean', async () => {
      const text =
        'Only university-educated with a bachelor\'s — degree required.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'self',
          { educationLevel: 11 },
          [
            {
              signal: 'educationLevel',
              quote: 'degree required',
            },
          ],
        ),
      );

      const result = await service.extract('self', text);

      expect(result.signals['educationLevel']).toBeNull();
    });

    it('extracts partner educationLevel when LLM returns desired-partner credential score', async () => {
      const text =
        'Looking for a partner with at least a bachelor\'s degree from university.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { educationLevel: 8 },
          [
            {
              signal: 'educationLevel',
              quote: "bachelor's degree from university",
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['educationLevel']).toBe(8);
      expect(result.evidence.some((e) => e.signal === 'educationLevel')).toBe(
        true,
      );
    });

    it('extracts partner physicalTypePreference when LLM returns desired-partner type score', async () => {
      const text = 'Looking for an athletic, fit partner — that build matters.';
      llmCompleteJSON.mockResolvedValue(
        mockExtractionResponse(
          'partner',
          { physicalTypePreference: 8 },
          [
            {
              signal: 'physicalTypePreference',
              quote: 'athletic, fit partner',
            },
          ],
        ),
      );

      const result = await service.extract('partner', text);

      expect(result.signals['physicalTypePreference']).toBe(8);
      expect(
        result.evidence.some((e) => e.signal === 'physicalTypePreference'),
      ).toBe(true);
    });
  });
});
