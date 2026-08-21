import { randomUUID } from 'node:crypto';
import type { LLMRouterService } from '../llm/llm-router.service';
import {
  buildEvaluateLlmTrace,
  buildEvaluateRawLlmLogPayload,
  type EvaluateLlmCallTrace,
} from './evaluate-llm-pipeline';
import { MOTIVATION_SYSTEM_PROMPT } from './evaluate-llm-prompts';
import {
  RelationshipMotivationResultSchema,
  type RelationshipMotivationResult,
} from './evaluate-inference-schemas';
import type { EvaluateLog } from './evaluate-summary.runner';

/**
 * Infer primary relationship motivation from the three profile texts.
 * Returns one dominant motivation, confidence 0–1, and evidence quotes.
 */
export async function runEvaluateMotivation(
  llm: LLMRouterService,
  logger: EvaluateLog,
  aboutMe: string,
  aboutPartner: string,
  aboutRelationship: string,
  opts?: { collectTrace?: boolean },
): Promise<
  RelationshipMotivationResult & { _evaluateLlmTrace?: EvaluateLlmCallTrace }
> {
  const user = [
    'aboutMe:',
    aboutMe.trim() || '(empty)',
    '',
    'aboutPartner:',
    aboutPartner.trim() || '(empty)',
    '',
    'aboutRelationship:',
    aboutRelationship.trim() || '(empty)',
  ].join('\n');

  const requestId = randomUUID();
  const { value, rawText } =
    await llm.completeJSON<RelationshipMotivationResult>({
      modelKey: 'fast',
      system: MOTIVATION_SYSTEM_PROMPT,
      user,
      schema: RelationshipMotivationResultSchema,
      temperature: 0.2,
      maxTokens: 500,
      timeoutMs: 15_000,
      requestId,
      purpose: 'evaluate-motivation',
    });

  logger.log(
    JSON.stringify(
      buildEvaluateRawLlmLogPayload(
        { purpose: 'evaluate-motivation', requestId },
        value,
        rawText,
      ),
    ),
    'EvaluateService',
  );

  const out: RelationshipMotivationResult = {
    relationshipMotivation: value.relationshipMotivation,
    confidence: Math.max(0, Math.min(1, value.confidence)),
    evidence: Array.isArray(value.evidence) ? value.evidence : [],
  };
  const trace = buildEvaluateLlmTrace({
    purpose: 'evaluate-motivation',
    requestId,
    parsedJson: value,
    rawText,
    afterStages: [{ name: 'after_clamp_and_normalize', value: out }],
  });
  logger.log(
    JSON.stringify({ event: 'evaluate_llm_pipeline_stage_diffs', ...trace }),
    'EvaluateService',
  );
  if (opts?.collectTrace) {
    return { ...out, _evaluateLlmTrace: trace };
  }
  return out;
}
