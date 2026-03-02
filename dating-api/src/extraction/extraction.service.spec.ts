import { Test, TestingModule } from '@nestjs/testing';
import { SimpleLogger } from '../logger/simple-logger.service';
import { LLMRouterService } from '../llm/llm-router.service';
import { EXTRACTION_SIGNAL_KEYS } from './extracted-signals.interface';
import { ExtractionService } from './extraction.service';

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

    const result = await service.extract('self', 'Legacy payload text.');

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

  it('generic short self text gets sparse guard: at most 3 non-null, confidence capped', async () => {
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
    expect(nonNullCount).toBeLessThanOrEqual(3);
    expect(result.confidence).toBeLessThanOrEqual(0.45);
  });

  it('rich partner text is not over-penalized: no sparse guard applied', async () => {
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
    expect(result.confidence).toBe(0.7);
  });
});
