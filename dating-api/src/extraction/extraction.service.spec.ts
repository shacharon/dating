import { Test, TestingModule } from '@nestjs/testing';
import { SimpleLogger } from '../logger/simple-logger.service';
import { LLMRouterService } from '../llm/llm-router.service';
import { EXTRACTION_SIGNAL_KEYS } from './extracted-signals.interface';
import { ExtractionService } from './extraction.service';
import { coveragePercent } from '../engine/coverage';

/** Sample text that implies ambition (self), independence (relationship), appearance (partner). */
const SAMPLE_ABOUT_ME =
  'Startup CEO, very driven and competitive. I work long hours and want to build something big.';
const SAMPLE_ABOUT_RELATIONSHIP =
  'I need space and independence. Not into enmeshment; we should have our own lives.';
const SAMPLE_ABOUT_PARTNER =
  'Looking for someone fit, attractive, and health-conscious. Physical chemistry matters.';

function mockExtractionResponse(
  domain: string,
  signals: Record<string, number | null>,
  evidence: Array<{ signal: string; quote: string }>,
) {
  return {
    value: {
      domain,
      signals,
      evidence,
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
        { ambition: 8, hedonism: 3, socialBattery: 5 },
        [
          { signal: 'ambition', quote: 'Startup CEO, very driven' },
          { signal: 'hedonism', quote: 'work long hours' },
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

  it('should return relationship.signals with independence (or equivalent) when text contains space/independence cues', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse(
        'relationship',
        { independence: 9, attachmentSecurity: 6 },
        [
          { signal: 'independence', quote: 'I need space and independence' },
          { signal: 'attachmentSecurity', quote: 'our own lives' },
        ],
      ),
    );

    const result = await service.extract(
      'relationship',
      SAMPLE_ABOUT_RELATIONSHIP,
    );

    expect(result.signals).toBeDefined();
    expect(typeof result.signals['independence']).toBe('number');
    expect(result.signals['independence']).toBeGreaterThanOrEqual(1);
    expect(result.signals['independence']).toBeLessThanOrEqual(10);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('should return partner.signals with healthBodyConsciousness (or equivalent) when text contains appearance cues', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse(
        'partner',
        { healthBodyConsciousness: 8, sexualExpressiveness: 6 },
        [
          {
            signal: 'healthBodyConsciousness',
            quote: 'fit, attractive, health-conscious',
          },
          {
            signal: 'sexualExpressiveness',
            quote: 'Physical chemistry matters',
          },
        ],
      ),
    );

    const result = await service.extract('partner', SAMPLE_ABOUT_PARTNER);

    expect(result.signals).toBeDefined();
    expect(typeof result.signals['healthBodyConsciousness']).toBe('number');
    expect(result.signals['healthBodyConsciousness']).toBeGreaterThanOrEqual(1);
    expect(result.signals['healthBodyConsciousness']).toBeLessThanOrEqual(10);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('extractAllThree: self has ambition, relationship has independence, partner has healthBodyConsciousness, evidence arrays non-empty', async () => {
    llmCompleteJSON
      .mockResolvedValueOnce(
        mockExtractionResponse('self', { ambition: 8 }, [
          { signal: 'ambition', quote: 'driven and competitive' },
        ]),
      )
      .mockResolvedValueOnce(
        mockExtractionResponse('relationship', { independence: 9 }, [
          { signal: 'independence', quote: 'need space and independence' },
        ]),
      )
      .mockResolvedValueOnce(
        mockExtractionResponse('partner', { healthBodyConsciousness: 8 }, [
          { signal: 'healthBodyConsciousness', quote: 'fit, attractive' },
        ]),
      );

    const { self, relationship, partner } = await service.extractAllThree(
      SAMPLE_ABOUT_ME,
      SAMPLE_ABOUT_RELATIONSHIP,
      SAMPLE_ABOUT_PARTNER,
    );

    expect(typeof self.signals['ambition']).toBe('number');
    expect(self.evidence.length).toBeGreaterThan(0);

    expect(typeof relationship.signals['independence']).toBe('number');
    expect(relationship.evidence.length).toBeGreaterThan(0);

    expect(typeof partner.signals['healthBodyConsciousness']).toBe('number');
    expect(partner.evidence.length).toBeGreaterThan(0);
  });

  it('alias-only input gets mapped to official key', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', { spiritualOrientation: 7 }, [
        { signal: 'spiritualOrientation', quote: 'meaning and spirituality' },
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
      }, [
        { signal: 'spirituality', quote: 'official key' },
        { signal: 'spiritualOrientation', quote: 'alias' },
      ]),
    );

    const result = await service.extract('self', 'Spiritual person.');

    expect(result.signals['spirituality']).toBe(8);
  });

  it('unmapped unknown key is still dropped by validateAndClean', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', { ambition: 5, hedonism: 9 }, [
        { signal: 'ambition', quote: 'driven' },
        { signal: 'hedonism', quote: 'enjoy life' },
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
      }, [
        { signal: 'spiritualOrientation', quote: 'spirituality' },
        { signal: 'appearancePriority', quote: 'physical' },
        { signal: 'materialAmbition', quote: 'financial' },
      ]),
    );

    const result = await service.extract('self', legacyInput);

    expect(result.signals['spirituality']).toBe(6);
    expect(result.signals['physicalPriority']).toBe(7);
    expect(result.signals['financialMindset']).toBe(5);
    const officialCount = ['spirituality', 'physicalPriority', 'financialMindset'].filter(
      (k) => result.signals[k] != null,
    ).length;
    expect(officialCount).toBe(3);
  });

  it('evidence with unknown key is dropped', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', { ambition: 6 }, [
        { signal: 'ambition', quote: 'driven' },
        { signal: 'hedonism', quote: 'enjoy life' },
      ]),
    );

    const result = await service.extract('self', 'Driven.');

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0].signal).toBe('ambition');
  });

  it('final output contains exactly official allowlist keys only', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', {
        ambition: 5,
        spiritualOrientation: 7,
        hedonism: 9,
      }, [
        { signal: 'ambition', quote: 'a' },
        { signal: 'spiritualOrientation', quote: 'b' },
      ]),
    );

    const result = await service.extract('self', 'Text.');

    const outputKeys = Object.keys(result.signals);
    expect(outputKeys.length).toBe(EXTRACTION_SIGNAL_KEYS.length);
    for (const k of outputKeys) {
      expect(EXTRACTION_SIGNAL_KEYS).toContain(k);
    }
    expect(result.signals['spirituality']).toBe(7);
    expect(result.signals['hedonism']).toBeUndefined();
  });

  it('generic aboutMe yields fewer non-null signals; very generic text capped at 2', async () => {
    const genericShort = 'nice, fun, positive vibes';
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', {
        ambition: 6,
        socialBattery: 7,
        emotionalDepth: 5,
        lifestylePace: 6,
        physicalPriority: 4,
      }, [
        { signal: 'ambition', quote: 'fun' },
        { signal: 'socialBattery', quote: 'positive vibes' },
        { signal: 'emotionalDepth', quote: 'nice' },
        { signal: 'lifestylePace', quote: 'vibes' },
        { signal: 'physicalPriority', quote: 'fun' },
      ]),
    );

    const result = await service.extract('self', genericShort);

    const nonNullCount = Object.values(result.signals).filter((v) => v != null).length;
    expect(nonNullCount).toBeLessThanOrEqual(2);
    expect(result.confidence).toBeLessThanOrEqual(0.45);
  });

  it('short but not very generic text gets max 3 non-null, confidence capped', async () => {
    const shortText = 'I like going out and meeting good people. Pretty relaxed.';
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', {
        socialBattery: 7,
        lifestylePace: 5,
        emotionalDepth: 5,
        directness: 4,
        ambition: 6,
      }, [
        { signal: 'socialBattery', quote: 'going out' },
        { signal: 'lifestylePace', quote: 'relaxed' },
        { signal: 'emotionalDepth', quote: 'good people' },
        { signal: 'directness', quote: 'pretty' },
        { signal: 'ambition', quote: 'relaxed' },
      ]),
    );

    const result = await service.extract('self', shortText);

    const nonNullCount = Object.values(result.signals).filter((v) => v != null).length;
    expect(nonNullCount).toBeLessThanOrEqual(3);
    expect(result.confidence).toBeLessThanOrEqual(0.45);
  });

  it('rich aboutPartner remains expressive: no sparse guard applied', async () => {
    const richPartnerText =
      'Looking for someone fit, attractive, and health-conscious. Physical chemistry matters. ' +
      'I value emotional depth and direct communication. We should share an active lifestyle and similar goals.';
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('partner', {
        healthBodyConsciousness: 8,
        physicalPriority: 7,
        emotionalDepth: 6,
        directness: 5,
        lifestylePace: 6,
      }, [
        { signal: 'healthBodyConsciousness', quote: 'fit, attractive, health-conscious' },
        { signal: 'physicalPriority', quote: 'Physical chemistry matters' },
        { signal: 'emotionalDepth', quote: 'emotional depth' },
        { signal: 'directness', quote: 'direct communication' },
        { signal: 'lifestylePace', quote: 'active lifestyle' },
      ]),
    );

    const result = await service.extract('partner', richPartnerText);

    const nonNullCount = Object.values(result.signals).filter((v) => v != null).length;
    expect(nonNullCount).toBe(5);
    // confidence = coverage * signalCountFactor: (5/14) * 0.6 ≈ 0.214
    expect(result.confidence).toBeCloseTo((5 / 14) * 0.6, 2);
  });

  it('short profile with specific cues (profile #20) yields >= 6 signals after text inference', async () => {
    const shortProfile =
      'Training is part of my life, I focus on sleep and food discipline. ' +
      'I respect boundaries and prefer quiet evenings at home. We should grow together.';

    // LLM returns only 3 signals — text inference should fill the rest
    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', {
        ambition: 5,
        emotionalDepth: 6,
        socialBattery: 4,
      }, [
        { signal: 'ambition', quote: 'focus on sleep and food discipline' },
        { signal: 'emotionalDepth', quote: 'grow together' },
        { signal: 'socialBattery', quote: 'quiet evenings at home' },
      ]),
    );

    const result = await service.extract('self', shortProfile);

    const nonNullCount = Object.values(result.signals).filter((v) => v != null).length;
    expect(nonNullCount).toBeGreaterThanOrEqual(6);

    // text inference should have filled these from keyword patterns
    expect(result.signals['healthBodyConsciousness']).toBe(8);
    expect(result.signals['independence']).toBe(7);
    expect(result.signals['directness']).toBe(6);
    expect(result.signals['lifestylePace']).toBe(4);
    expect(result.signals['relationshipClarity']).toBe(7);

    // coverageNotes should track what was inferred
    expect(result.coverageNotes).toBeDefined();
    expect(result.coverageNotes!.length).toBeGreaterThanOrEqual(3);
  });

  it('coverage between short profile #20 and profile #2 is >= 30%', async () => {
    const shortProfile =
      'Training is part of my life, I focus on sleep and food discipline. ' +
      'I respect boundaries and prefer quiet evenings at home. We should grow together.';

    llmCompleteJSON.mockResolvedValue(
      mockExtractionResponse('self', {
        ambition: 5,
        emotionalDepth: 6,
        socialBattery: 4,
      }, [
        { signal: 'ambition', quote: 'focus on discipline' },
        { signal: 'emotionalDepth', quote: 'grow together' },
        { signal: 'socialBattery', quote: 'quiet evenings' },
      ]),
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
    expect(covPercent).toBeGreaterThanOrEqual(30);
  });
});

/* ─── Behavior locks (post-refactor: lock current behavior) ───────────────── */

describe('ExtractionService behavior locks', () => {
  let service: ExtractionService;
  let llmCompleteJSON: jest.Mock;

  function mockResponse(
    domain: string,
    signals: Record<string, number | null>,
    evidence: Array<{ signal: string; quote: string }> = [],
    confidence = 0.7,
  ) {
    return {
      value: { domain, signals, evidence, confidence, version: 'v1' },
      rawText: JSON.stringify({ domain, signals, evidence, confidence, version: 'v1' }),
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
      }, [
        { signal: 'appearancePriority', quote: 'physical attraction' },
        { signal: 'materialAmbition', quote: 'financial success' },
        { signal: 'ambition', quote: 'driven' },
      ]),
    );

    const result = await service.extract('self', longEnoughText);

    expect(result.signals['physicalPriority']).toBe(7);
    expect(result.signals['financialMindset']).toBe(5);
    expect(result.signals['ambition']).toBe(6);
    expect(result.signals['appearancePriority']).toBeUndefined();
    expect(result.signals['materialAmbition']).toBeUndefined();
    expect(Object.keys(result.signals).every((k) => EXTRACTION_SIGNAL_KEYS.includes(k as any))).toBe(true);
  });

  it('2. unknown key dropping: signals and evidence with unknown keys are dropped from output', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockResponse('self', {
        ambition: 5,
        madeUpSignal: 9,
        anotherUnknown: 3,
      }, [
        { signal: 'ambition', quote: 'driven' },
        { signal: 'madeUpSignal', quote: 'fake' },
      ]),
    );

    const result = await service.extract('self', 'Driven person.');

    expect(result.signals['ambition']).toBe(5);
    expect(result.signals['madeUpSignal']).toBeUndefined();
    expect(result.signals['anotherUnknown']).toBeUndefined();
    expect(result.evidence.every((e) => EXTRACTION_SIGNAL_KEYS.includes(e.signal as any))).toBe(true);
    expect(result.evidence).toHaveLength(1);
  });

  it('3a. out-of-range value WITH evidence: clamped to 1–10 and kept', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockResponse('self', { ambition: 15, directness: 6 }, [
        { signal: 'ambition', quote: 'very driven' },
        { signal: 'directness', quote: 'direct' },
      ]),
    );

    const result = await service.extract('self', 'Very driven and direct.');

    expect(result.signals['ambition']).toBe(10);
    expect(result.signals['directness']).toBe(6);
  });

  it('3b. out-of-range value WITHOUT evidence: stripped to null', async () => {
    llmCompleteJSON.mockResolvedValue(
      mockResponse('self', { ambition: 5, directness: 99 }, [
        { signal: 'ambition', quote: 'driven' },
      ]),
    );

    const result = await service.extract('self', 'Driven.');

    expect(result.signals['ambition']).toBe(5);
    expect(result.signals['directness']).toBeNull();
  });

  it('4a. zero-signal retry path: first call empty, retry returns signals → use retry result', async () => {
    const textWithContent = 'I am ambitious and value direct communication.';
    llmCompleteJSON
      .mockResolvedValueOnce(
        mockResponse('self', Object.fromEntries(EXTRACTION_SIGNAL_KEYS.map((k) => [k, null])), [], 0.3),
      )
      .mockResolvedValueOnce(
        mockResponse('self', { ambition: 7, directness: 6 }, [
          { signal: 'ambition', quote: 'ambitious' },
          { signal: 'directness', quote: 'direct communication' },
        ]),
      );

    const result = await service.extract('self', textWithContent);

    expect(llmCompleteJSON).toHaveBeenCalledTimes(2);
    expect(Object.values(result.signals).filter((v) => v != null).length).toBe(2);
    expect(result.signals['ambition']).toBe(7);
    expect(result.signals['directness']).toBe(6);
  });

  it('4b. zero-signal retry path: first empty, retry returns empty → notes contain EXTRACTION_EMPTY', async () => {
    llmCompleteJSON
      .mockResolvedValueOnce(
        mockResponse('self', Object.fromEntries(EXTRACTION_SIGNAL_KEYS.map((k) => [k, null])), [], 0.3),
      )
      .mockResolvedValueOnce(
        mockResponse('self', Object.fromEntries(EXTRACTION_SIGNAL_KEYS.map((k) => [k, null])), [], 0.4),
      );

    const result = await service.extract('self', 'Some meaningful text here.');

    expect(llmCompleteJSON).toHaveBeenCalledTimes(2);
    expect(result.notes).toContain('EXTRACTION_EMPTY');
  });

  it('5. sparse text guard: very short text caps at 2 non-null, confidence at 0.45', async () => {
    const veryShort = 'nice fun';
    llmCompleteJSON.mockResolvedValue(
      mockResponse('self', {
        ambition: 6,
        socialBattery: 7,
        emotionalDepth: 5,
      }, [
        { signal: 'ambition', quote: 'fun' },
        { signal: 'socialBattery', quote: 'nice' },
        { signal: 'emotionalDepth', quote: 'nice' },
      ]),
    );

    const result = await service.extract('self', veryShort);

    const nonNull = Object.values(result.signals).filter((v) => v != null).length;
    expect(nonNull).toBeLessThanOrEqual(2);
    expect(result.confidence).toBeLessThanOrEqual(0.45);
  });

  it('6. text inference fills only null signals: does not override LLM non-null value', async () => {
    const textWithBoundaries =
      'I respect boundaries and need my own space. We have clear communication. This is a long enough sentence so that sparse guard does not cap the signals.';
    llmCompleteJSON.mockResolvedValue(
      mockResponse('self', {
        independence: 5,
        directness: 4,
        ambition: 6,
      }, [
        { signal: 'independence', quote: 'own space' },
        { signal: 'directness', quote: 'respect' },
        { signal: 'ambition', quote: 'need' },
      ]),
    );

    const result = await service.extract('self', textWithBoundaries);

    expect(result.signals['independence']).toBe(5);
    expect(result.signals['directness']).toBe(4);
  });

  it('7. signal count cap: more than 12 non-null capped to 12, priority order preserved', async () => {
    const longText =
      'I am ambitious and social. I value emotional depth and direct communication. ' +
      'I need independence and a calm lifestyle. I care about relationship clarity and health. ' +
      'I have traditional values and care about finances and spirituality and pace.';
    const manySignals: Record<string, number | null> = {};
    EXTRACTION_SIGNAL_KEYS.forEach((k, i) => {
      manySignals[k] = i < 14 ? 5 + (i % 3) : null;
    });
    const evidence = EXTRACTION_SIGNAL_KEYS.slice(0, 14).map((s) => ({
      signal: s,
      quote: 'something',
    }));
    llmCompleteJSON.mockResolvedValue(
      mockResponse('self', manySignals, evidence),
    );

    const result = await service.extract('self', longText);

    const nonNull = Object.values(result.signals).filter((v) => v != null).length;
    expect(nonNull).toBeLessThanOrEqual(12);
    expect(result.coverageNotes?.some((n) => n.includes('capped to 12'))).toBe(true);
  });

  it('8. confidence recomputation: final confidence = coverage * signalCountFactor from final signals', async () => {
    const text =
      'I am ambitious and social with emotional depth. I value direct communication and independence. ' +
      'I prefer a calm lifestyle and clear relationship goals. I care about health and fitness.';
    llmCompleteJSON.mockResolvedValue(
      mockResponse('self', {
        ambition: 6,
        socialBattery: 5,
        emotionalDepth: 6,
        directness: 5,
        independence: 5,
        lifestylePace: 5,
        relationshipClarity: 5,
        healthBodyConsciousness: 5,
      }, [
        { signal: 'ambition', quote: 'a' },
        { signal: 'socialBattery', quote: 'a' },
        { signal: 'emotionalDepth', quote: 'a' },
        { signal: 'directness', quote: 'a' },
        { signal: 'independence', quote: 'a' },
        { signal: 'lifestylePace', quote: 'a' },
        { signal: 'relationshipClarity', quote: 'a' },
        { signal: 'healthBodyConsciousness', quote: 'a' },
      ], 0.9),
    );

    const result = await service.extract('self', text);

    const nonNull = Object.values(result.signals).filter((v) => v != null).length;
    expect(nonNull).toBe(8);
    const coverage = nonNull / EXTRACTION_SIGNAL_KEYS.length;
    const factor = 0.8;
    expect(result.confidence).toBeCloseTo(Math.min(1, coverage * factor), 2);
  });
});
