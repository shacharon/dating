import { randomUUID } from 'node:crypto';
import type { LLMRouterService } from '../llm/llm-router.service';
import { sanitizeDerivedContextForPersist } from './derived-context-sanitize';
import {
  buildEvaluateLlmTrace,
  buildEvaluateRawLlmLogPayload,
  type EvaluateLlmCallTrace,
} from './evaluate-llm-pipeline';
import { DERIVED_CONTEXT_SYSTEM_PROMPT } from './evaluate-llm-prompts';
import {
  LlmDerivedContextRawSchema,
  type LlmDerivedContextRaw,
} from './evaluate-inference-schemas';
import type { DerivedContextV1 } from './evaluate-batch.types';
import type { EvaluateLog } from './evaluate-summary.runner';

/**
 * Infer occupation class, visibility need, and life stage from profile texts.
 * Used for dealbreaker context at match time (persisted on evaluationJson).
 */
export async function runEvaluateDerivedContext(
  llm: LLMRouterService,
  logger: EvaluateLog,
  aboutMe: string,
  aboutPartner: string,
  aboutRelationship: string,
  opts?: { collectTrace?: boolean },
): Promise<DerivedContextV1 & { _evaluateLlmTrace?: EvaluateLlmCallTrace }> {
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
  const { value, rawText } = await llm.completeJSON<LlmDerivedContextRaw>({
    modelKey: 'fast',
    system: DERIVED_CONTEXT_SYSTEM_PROMPT,
    user,
    schema: LlmDerivedContextRawSchema,
    temperature: 0.2,
    maxTokens: 400,
    timeoutMs: 15_000,
    requestId,
    purpose: 'evaluate-derived-context',
  });

  logger.log(
    JSON.stringify(
      buildEvaluateRawLlmLogPayload(
        { purpose: 'evaluate-derived-context', requestId },
        value,
        rawText,
      ),
    ),
    'EvaluateService',
  );

  const out = sanitizeDerivedContextForPersist(value);
  const trace = buildEvaluateLlmTrace({
    purpose: 'evaluate-derived-context',
    requestId,
    parsedJson: value,
    rawText,
    afterStages: [{ name: 'after_sanitize', value: out }],
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
