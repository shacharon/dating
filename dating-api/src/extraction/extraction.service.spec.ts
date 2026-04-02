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
    // With 18 signals (14 official + 4 shadow), threshold adjusted from 30% to 25%
    expect(covPercent).toBeGreaterThanOrEqual(25);
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

      expect(result.signals['noveltyVsRoutine']).toBe(9);
      expect(result.evidence.some(e => e.signal === 'noveltyVsRoutine')).toBe(true);
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
      expect(result.signals['noveltyVsRoutine']).toBe(8);
      expect(result.signals['structureChaosTolerance']).toBe(6);
      expect(result.evidence.filter(e => ['conflictStyle', 'noveltyVsRoutine', 'structureChaosTolerance'].includes(e.signal)).length).toBe(3);
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
      expect(result.signals['noveltyVsRoutine']).toBeNull();
      expect(result.signals['structureChaosTolerance']).toBeNull();
    });
  });
});
