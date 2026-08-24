/** Test support only — excluded from Nest dist via tsconfig.build (same as *.spec-support.ts elsewhere). */

import { Test, TestingModule } from '@nestjs/testing';
import { SimpleLogger } from '../../logger/simple-logger.service';
import { LLMRouterService } from '../../llm/llm-router.service';
import { ExtractionService } from '../extraction.service';

/** Sample text that implies ambition (self), independence (relationship), appearance (partner). */
export const SAMPLE_ABOUT_ME =
  'Startup CEO, very driven and competitive. I work long hours and want to build something big.';
export const SAMPLE_ABOUT_RELATIONSHIP =
  'I need space and independence. Not into enmeshment; we should have our own lives.';
export const SAMPLE_ABOUT_PARTNER =
  'Looking for someone fit, attractive, and health-conscious. Physical chemistry matters. ' +
  'I enjoy meaningful conversation and want a partner who values wellness and authenticity in daily life.';

export const DEFAULT_MOCK_EVIDENCE_REASON = 'Quote supports the score';

export function mockExtractionResponse(
  domain: string,
  signals: Record<string, number | null>,
  evidence: Array<{ signal: string; quote: string; reason?: string; note?: string }>,
  interests?: string[],
) {
  return {
    value: {
      domain,
      signals,
      ...(interests !== undefined ? { interests } : {}),
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

/** Richer mock used by behavior-lock + expansion specs (monolith mockResponse). */
export function mockBehaviorLockResponse(
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

export type ExtractionServiceTestContext = {
  service: ExtractionService;
  llmCompleteJSON: jest.Mock;
};

export async function createExtractionServiceTestContext(): Promise<ExtractionServiceTestContext> {
  const llmCompleteJSON = jest.fn();
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

  const service = module.get<ExtractionService>(ExtractionService);
  return { service, llmCompleteJSON };
}
