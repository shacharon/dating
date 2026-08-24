import {
  EXTRACTION_SIGNAL_KEYS,
} from '../extracted-signals.interface';
import { DOMAIN_ALLOWED_SIGNAL_KEYS } from '../pipeline/extraction-strict-validation';
import { ExtractionService } from '../extraction.service';
import {
  createExtractionServiceTestContext,
  mockBehaviorLockResponse,
} from './extraction.service.spec-support';

describe('ExtractionService behavior locks', () => {
  let service: ExtractionService;
  let llmCompleteJSON: jest.Mock;

  const mockResponse = mockBehaviorLockResponse;

  beforeEach(async () => {
    ({ service, llmCompleteJSON } = await createExtractionServiceTestContext());
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
});
