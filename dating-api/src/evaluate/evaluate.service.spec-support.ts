/** Test support only — excluded from Nest dist via tsconfig.build. */

import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionService } from '../extraction/extraction.service';
import type { ExtractedSignals } from '../extraction/extracted-signals.interface';
import { LLMRouterService } from '../llm/llm-router.service';
import { SimpleLogger } from '../logger/simple-logger.service';
import { EvaluateService } from './evaluate.service';

export function lowCoverageSignals(overrides: Partial<Record<string, number | null>> = {}): Record<string, number | null> {
  const signals: Record<string, number | null> = {};
  for (const k of [
    'ambition', 'socialBattery', 'healthBodyConsciousness', 'emotionalDepth',
    'attachmentSecurity', 'directness', 'independence', 'traditionalism',
    'financialMindset', 'relationshipClarity', 'spirituality', 'lifestylePace',
    'physicalPriority', 'statusOrientation',
  ]) {
    signals[k] = overrides[k] ?? null;
  }
  return signals;
}

export function mockExtracted(domain: 'self' | 'partner' | 'relationship', confidence: number, nonNullCount: number): ExtractedSignals {
  const keys = Object.keys(lowCoverageSignals());
  const signals = lowCoverageSignals({});
  for (let i = 0; i < nonNullCount && i < keys.length; i++) {
    signals[keys[i]] = 5;
  }
  return {
    domain,
    signals,
    evidence: keys
      .slice(0, nonNullCount)
      .map((signal) => ({ signal, quote: 'quote', reason: 'Synthetic test reason' })),
    version: 'v1',
    confidence,
  };
}

export type EvaluateServiceTestContext = {
  service: EvaluateService;
  extractionService: ExtractionService;
  llmCompleteJSON: jest.Mock;
};

export async function createEvaluateServiceTestContext(): Promise<EvaluateServiceTestContext> {
  let llmCompleteJSON = jest.fn();
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      EvaluateService,
      {
        provide: ExtractionService,
        useValue: {
          extractAllThree: jest.fn(),
        },
      },
      {
        provide: LLMRouterService,
        useValue: { completeJSON: llmCompleteJSON },
      },
      {
        provide: SimpleLogger,
        useValue: {
          log: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        },
      },
    ],
  }).compile();

  const service = module.get<EvaluateService>(EvaluateService);
  const extractionService = module.get<ExtractionService>(ExtractionService);
  return { service, extractionService, llmCompleteJSON };
}

export const EVALUATE_SERVICE_BASELINE_TEST_COUNT = 17;

export const EVALUATE_SERVICE_SPLIT_TEST_COUNTS: Record<string, number> = {
  'evaluate.service.orchestration.spec.ts': 7,
  'evaluate.service.extended-signals.spec.ts': 4,
  'evaluate.service.chips.spec.ts': 4,
  'evaluate.service.resilience.spec.ts': 2,
};
