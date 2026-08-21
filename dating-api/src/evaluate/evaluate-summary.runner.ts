import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ExtractedSignals } from '../extraction/extracted-signals.interface';
import type { LLMRouterService } from '../llm/llm-router.service';
import {
  normalizeDisplay,
  type NormalizedDisplay,
} from './evaluate-display-helpers';
import {
  buildEvaluateLlmTrace,
  buildEvaluateRawLlmLogPayload,
  type EvaluateLlmCallTrace,
} from './evaluate-llm-pipeline';
import { SUMMARY_SYSTEM_PROMPT } from './evaluate-llm-prompts';
import { AnalysisPresentationSchema } from './evaluate-inference-schemas';

export type EvaluateLog = { log: (msg: string, context?: string) => void };

/**
 * Generate display summary and insight from the three extracted signal sets only.
 * Does not re-analyze original text. No numeric scores in output. No hallucinated traits.
 */
export async function runEvaluateSummary(
  llm: LLMRouterService,
  logger: EvaluateLog,
  self: ExtractedSignals,
  partner: ExtractedSignals,
  relationship: ExtractedSignals,
): Promise<{
  display: NormalizedDisplay;
  _evaluateLlmTrace: EvaluateLlmCallTrace;
}> {
  const payload = JSON.stringify(
    {
      self: {
        signals: self.signals,
        evidence: self.evidence,
        confidence: self.confidence,
      },
      partner: {
        signals: partner.signals,
        evidence: partner.evidence,
        confidence: partner.confidence,
      },
      relationship: {
        signals: relationship.signals,
        evidence: relationship.evidence,
        confidence: relationship.confidence,
      },
    },
    null,
    2,
  );

  const requestId = randomUUID();
  const { value, rawText } = await llm.completeJSON<
    z.infer<typeof AnalysisPresentationSchema>
  >({
    modelKey: 'fast',
    system: SUMMARY_SYSTEM_PROMPT,
    user: `Extracted data:\n${payload}`,
    schema: AnalysisPresentationSchema,
    temperature: 0.3,
    maxTokens: 3000,
    timeoutMs: 20_000,
    requestId,
    purpose: 'evaluate-summary',
  });

  logger.log(
    JSON.stringify(
      buildEvaluateRawLlmLogPayload(
        { purpose: 'evaluate-summary', requestId },
        value,
        rawText,
      ),
    ),
    'EvaluateService',
  );

  const normalized = normalizeDisplay(value);
  const trace = buildEvaluateLlmTrace({
    purpose: 'evaluate-summary',
    requestId,
    parsedJson: value,
    rawText,
    afterStages: [{ name: 'after_normalizeDisplay', value: normalized }],
  });
  logger.log(
    JSON.stringify({ event: 'evaluate_llm_pipeline_stage_diffs', ...trace }),
    'EvaluateService',
  );

  return { display: normalized, _evaluateLlmTrace: trace };
}
